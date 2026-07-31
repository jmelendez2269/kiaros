import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CosmicPlanView } from '@/components/cosmic-plan/CosmicPlanView'
import { WeekView } from '@/components/calendar/WeekView'
import { YearChartShell } from '@/components/year/YearChartShell'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { EphemerisDay, MonthBlueprint, MoonPhase, NatalChart, YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { Tables } from '@/types/database'
import { Frame, Kicker, K } from '@/components/almanac'
import { YearViewSwitcher } from '@/components/year/YearViewSwitcher'
import { MonthGrid, type DayEvent } from '@/components/year/MonthGrid'
import { MonthBriefPanel } from '@/components/year/MonthBriefPanel'
import { QuarterReviewPanel } from '@/components/year/QuarterReviewPanel'
import { PushRestRibbon } from '@/components/year/PushRestRibbon'
import { getWeekDates } from '@/components/calendar/utils'
import { getSabianForDegree } from '@/lib/ephemeris/sabian'
import { derivePushRestArc } from '@/lib/year/push-rest-arc'
import { todayISO } from '@/lib/today/get-today-context'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import { resolvePlannerLocation } from '@/lib/planner/resolve-planner-location'

type View = 'year' | 'month' | 'week' | 'review'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface SearchParams {
  view?: string
  month?: string
  date?: string
  quarter?: string
}

function parseView(raw: string | undefined): View {
  if (raw === 'month' || raw === 'calendar') return 'month'
  if (raw === 'week') return 'week'
  if (raw === 'review') return 'review'
  return 'year'
}

function parseQuarter(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 4) return fallback
  return Math.floor(n)
}

function currentQuarter(month0: number): number {
  return Math.floor(month0 / 3) + 1
}

function parseMonth(raw: string | undefined, fallback: { year: number; month: number }) {
  if (!raw) return fallback
  const match = /^(\d{4})-(\d{2})$/.exec(raw)
  if (!match) return fallback
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (!Number.isFinite(year) || month < 0 || month > 11) return fallback
  return { year, month }
}

function parseDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw) return fallbackIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallbackIso
  return raw
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

const MOON_PHASE_LABEL: Record<MoonPhase, string> = {
  'new': 'New ☾',
  'first-quarter': 'First Q ☾',
  'full': 'Full ☾',
  'last-quarter': 'Last Q ☾',
}

function moonPhaseTone(phase: MoonPhase): string {
  return phase === 'new' || phase === 'full' ? K.copper : K.sage
}

function eventsForMonth(monthBlueprint: MonthBlueprint | undefined, year: number, month: number): DayEvent[] {
  if (!monthBlueprint) return []
  const events: DayEvent[] = []
  for (const mp of monthBlueprint.moonPhases) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(mp.date)
    if (!match) continue
    const y = Number(match[1])
    const m = Number(match[2]) - 1
    const d = Number(match[3])
    if (y !== year || m !== month) continue
    events.push({ day: d, tag: MOON_PHASE_LABEL[mp.phase], tone: moonPhaseTone(mp.phase) })
  }
  return events
}


interface PageProps {
  searchParams: Promise<SearchParams>
}

type PlanItemRow = Tables<'plan_items'>
type AreaGoalRow = Tables<'area_goals'>
type PlannerContextRow = Pick<
  Tables<'user_profiles'>,
  'birth_lat' | 'birth_lng' | 'birth_tz' | 'planner_lat' | 'planner_lng' | 'planner_tz' | 'natal_chart'
>

async function loadSupabaseUserId() {
  const { userId } = await auth()
  if (!userId) return null

  const profile = await getAppProfile(userId)
  return profile?.id ?? null
}

async function loadYearBase() {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) return { loaded: null, supabaseUserId: null }
  const loaded = await loadCurrentBlueprint(supabaseUserId)
  return { loaded, supabaseUserId }
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month + offset, 1))
  const nextYear = date.getUTCFullYear()
  const nextMonth = date.getUTCMonth() + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

function shiftDate(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function clampMonthToPlanYear(
  selected: { year: number; month: number },
  planYear: number
): { year: number; month: number } {
  if (selected.year < planYear) return { year: planYear, month: 0 }
  if (selected.year > planYear) return { year: planYear, month: 11 }
  return selected
}

function weekOverlapsPlanYear(dateIso: string, planYear: number): boolean {
  const dates = getWeekDates(dateIso)
  return dates[6] >= `${planYear}-01-01` && dates[0] <= `${planYear}-12-31`
}

function clampWeekToPlanYear(dateIso: string, planYear: number): string {
  const dates = getWeekDates(dateIso)
  if (dates[6] < `${planYear}-01-01`) return `${planYear}-01-01`
  if (dates[0] > `${planYear}-12-31`) return `${planYear}-12-31`
  return dateIso
}

async function loadYearOverview() {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) return { loaded: null, yearEphemeris: null }

  const planYear = new Date().getFullYear()
  const admin = createAdminSupabase()
  const [loaded, ephemerisRes] = await Promise.all([
    loadCurrentBlueprint(supabaseUserId),
    admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', supabaseUserId)
      .eq('year', planYear)
      .maybeSingle(),
  ])

  return {
    loaded,
    yearEphemeris: (ephemerisRes.data?.data as YearEphemeris | null) ?? null,
  }
}

async function loadMonthData(year: number, month: number) {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) {
    return {
      loaded: null,
      yearEphemeris: null,
      curriculumSessions: [] as CurriculumSessionRow[],
      planItems: [] as PlanItemRow[],
      journalEntries: [] as { entry_date: string }[],
      monthBrief: null,
      plannerContext: null,
      supabaseUserId: null,
    }
  }

  const monthNumber = month + 1
  const monthPrefix = `${year}-${String(monthNumber).padStart(2, '0')}-`
  const monthStart = `${monthPrefix}01`
  const monthEnd = `${monthPrefix}${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
  const admin = createAdminSupabase()
  const [loaded, ephemerisRes, sessionsRes, planItemsRes, journalRes, briefRes, plannerContextRes] = await Promise.all([
    loadCurrentBlueprint(supabaseUserId),
    admin.from('ephemeris_cache').select('data').eq('user_id', supabaseUserId).eq('year', year).maybeSingle(),
    admin
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .eq('user_id', supabaseUserId)
      .gte('scheduled_for', monthStart)
      .lte('scheduled_for', monthEnd)
      .order('scheduled_for', { ascending: true })
      .order('session_order', { ascending: true }),
    admin
      .from('plan_items')
      .select('id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
      .eq('user_id', supabaseUserId)
      .gte('item_date', monthStart)
      .lte('item_date', monthEnd)
      .order('item_date', { ascending: true })
      .order('sort_order', { ascending: true }),
    admin
      .from('journal_entries')
      .select('entry_date')
      .eq('user_id', supabaseUserId)
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd),
    admin
      .from('month_briefs')
      .select('brief_text, generated_at, edited_at, pinned')
      .eq('user_id', supabaseUserId)
      .eq('plan_year', year)
      .eq('month', monthNumber)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart')
      .eq('id', supabaseUserId)
      .maybeSingle(),
  ])

  return {
    loaded,
    yearEphemeris: (ephemerisRes.data?.data as YearEphemeris | null) ?? null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
    planItems: (planItemsRes.data ?? []) as PlanItemRow[],
    journalEntries: journalRes.data ?? [],
    monthBrief: briefRes.data ?? null,
    plannerContext: plannerContextRes.data as PlannerContextRow | null,
    supabaseUserId,
  }
}

async function loadWeekData(selectedDate: string) {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) {
    return {
      loaded: null,
      yearEphemeris: null,
      curriculumSessions: [] as CurriculumSessionRow[],
      planItems: [] as PlanItemRow[],
      areaGoals: [] as AreaGoalRow[],
      plannerContext: null,
      supabaseUserId: null,
    }
  }

  const weekDates = getWeekDates(selectedDate)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const years = [...new Set(weekDates.map((date) => Number(date.slice(0, 4))))]
  const admin = createAdminSupabase()
  const blueprintPromise = loadCurrentBlueprint(supabaseUserId)
  const areaGoalsPromise = blueprintPromise.then(async (loaded) => {
    if (!loaded) return [] as AreaGoalRow[]
    const overlappingWeekNumbers = loaded.blueprint.weeks
      .filter((week) => week.startDate <= weekEnd && week.endDate >= weekStart)
      .map((week) => week.weekNumber)
    if (overlappingWeekNumbers.length === 0) return [] as AreaGoalRow[]

    const { data } = await admin
      .from('area_goals')
      .select('id, category_id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at, user_id')
      .eq('user_id', supabaseUserId)
      .in('linked_week_number', overlappingWeekNumbers)
      .order('sort_order', { ascending: true })
    return (data ?? []) as AreaGoalRow[]
  })

  const [loaded, ephemerisResults, sessionsRes, planItemsRes, areaGoals, plannerContextRes] = await Promise.all([
    blueprintPromise,
    Promise.all(
      years.map((year) =>
        admin.from('ephemeris_cache').select('data').eq('user_id', supabaseUserId).eq('year', year).maybeSingle()
      )
    ),
    admin
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .eq('user_id', supabaseUserId)
      .gte('scheduled_for', weekStart)
      .lte('scheduled_for', weekEnd)
      .order('scheduled_for', { ascending: true })
      .order('session_order', { ascending: true }),
    admin
      .from('plan_items')
      .select('id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
      .eq('user_id', supabaseUserId)
      .gte('item_date', weekStart)
      .lte('item_date', weekEnd)
      .order('item_date', { ascending: true })
      .order('sort_order', { ascending: true }),
    areaGoalsPromise,
    admin
      .from('user_profiles')
      .select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart')
      .eq('id', supabaseUserId)
      .maybeSingle(),
  ])

  const ephemerides = ephemerisResults
    .map((result) => (result.data?.data as YearEphemeris | null) ?? null)
    .filter((ephemeris): ephemeris is YearEphemeris => ephemeris !== null)
  const primaryEphemeris = ephemerides[0] ?? null

  return {
    loaded,
    yearEphemeris: primaryEphemeris
      ? { ...primaryEphemeris, days: ephemerides.flatMap((ephemeris) => ephemeris.days) }
      : null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
    planItems: (planItemsRes.data ?? []) as PlanItemRow[],
    areaGoals,
    plannerContext: plannerContextRes.data as PlannerContextRow | null,
    supabaseUserId,
  }
}

function buildDayCharacters(
  dates: string[],
  ephemeris: YearEphemeris | null,
  plannerContext: PlannerContextRow | null
): Map<string, EnergyWindow> {
  const characters = new Map<string, EnergyWindow>()
  if (!ephemeris) return characters

  const { lat, lng, timeZone } = resolvePlannerLocation(plannerContext)
  const natalChart = (plannerContext?.natal_chart as unknown as NatalChart | null) ?? null
  const ephemerisByDate = new Map(ephemeris.days.map((day) => [day.date, day]))

  for (const date of dates) {
    const windows = computeTransitWindows({
      date,
      lat,
      lng,
      timeZone,
      natalChart,
      dayTransits: ephemerisByDate.get(date)?.transits ?? [],
    })
    const character = windows.find((window) => window.label === 'Peak' || window.label === 'Steady')
    if (character) characters.set(date, character)
  }

  return characters
}

export default async function YearPage({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const params = await searchParams
  const view = parseView(params.view)

  if (view === 'month') {
    return <MonthChartView searchParams={params} />
  }

  if (view === 'week') {
    return <WeekChartView searchParams={params} />
  }

  if (view === 'review') {
    return <QuarterReviewView searchParams={params} />
  }

  return <YearChartView />
}

function NoBlueprintCard() {
  const currentYear = new Date().getFullYear()
  return (
    <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
      <div className="text-4xl text-bone-muted">✦</div>
      <h2 className="font-serif text-3xl text-bone">No plan yet</h2>
      <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
        Your {currentYear} cosmic plan hasn&apos;t been generated. Complete onboarding to create
        your personalised year built from your natal chart and real planetary transits.
      </p>
      <Link
        href="/onboarding"
        className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
      >
        Complete Setup
      </Link>
    </div>
  )
}

function PageHeader({ current }: { current: View }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="shell-kicker mb-3">Cosmic Plan</p>
        <h1 className="shell-section-title">
          Planner built from your chart and this year&apos;s sky
        </h1>
      </div>
      <YearViewSwitcher current={current} />
    </div>
  )
}

async function YearChartView() {
  const { loaded, yearEphemeris } = await loadYearOverview()

  return (
    <div className="space-y-6">
      <PageHeader current="year" />
      {loaded ? (
        <div className="space-y-6">
          {yearEphemeris ? (
            <YearChartShell yearEphemeris={yearEphemeris} weeks={loaded.blueprint.weeks} />
          ) : (
            <div className="shell-panel px-6 py-8">
              <p className="shell-kicker mb-3">Cosmic Calendar</p>
              <h2 className="shell-section-title">Calendar data is still forming</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
                Your {loaded.planYear} sky map will appear here once the ephemeris cache is available.
              </p>
            </div>
          )}

          <CosmicPlanView blueprint={loaded.blueprint} planYear={loaded.planYear} />
        </div>
      ) : (
        <NoBlueprintCard />
      )}
    </div>
  )
}

async function WeekChartView({ searchParams }: { searchParams: SearchParams }) {
  const todayIso = todayISO()
  const planYear = new Date().getFullYear()
  const selectedDate = clampWeekToPlanYear(parseDate(searchParams.date, todayIso), planYear)
  const { loaded, yearEphemeris, curriculumSessions, planItems, areaGoals, plannerContext } =
    await loadWeekData(selectedDate)

  if (!loaded || !yearEphemeris) {
    return (
      <div className="space-y-6">
        <PageHeader current="week" />
        {loaded ? (
          <div className="shell-panel px-6 py-8">
            <p className="shell-kicker mb-3">Weekly planner</p>
            <h2 className="shell-section-title">Week data is still forming</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
              Your sky map will appear here once this year&apos;s ephemeris is available.
            </p>
          </div>
        ) : (
          <NoBlueprintCard />
        )}
      </div>
    )
  }

  const dayMap = new Map<string, EphemerisDay>()
  for (const day of yearEphemeris.days) dayMap.set(day.date, day)
  const curriculumByDate = new Map<string, CurriculumSessionRow[]>()
  for (const session of curriculumSessions) {
    const sessions = curriculumByDate.get(session.scheduled_for)
    if (sessions) sessions.push(session)
    else curriculumByDate.set(session.scheduled_for, [session])
  }
  const planItemsByDate = new Map<string, PlanItemRow[]>()
  for (const item of planItems) {
    const items = planItemsByDate.get(item.item_date)
    if (items) items.push(item)
    else planItemsByDate.set(item.item_date, [item])
  }

  const weekDates = getWeekDates(selectedDate)
  const energyByDate = buildDayCharacters(weekDates, yearEphemeris, plannerContext)
  const first = new Date(`${weekDates[0]}T12:00:00`)
  const last = new Date(`${weekDates[6]}T12:00:00`)
  const rangeLabel = `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${last.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`
  const previousDate = shiftDate(selectedDate, -7)
  const nextDate = shiftDate(selectedDate, 7)
  const canGoPrevious = weekOverlapsPlanYear(previousDate, loaded.planYear)
  const canGoNext = weekOverlapsPlanYear(nextDate, loaded.planYear)

  return (
    <div className="space-y-6">
      <PageHeader current="week" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="shell-kicker mb-2">Weekly planner</p>
          <h2 className="font-serif text-3xl text-bone">{rangeLabel}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bone-muted">
            Your week&apos;s cosmic context, goals, study sessions, and practical tasks in one place.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Week navigation">
          {canGoPrevious ? (
            <Link
              href={`/year?view=week&date=${previousDate}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
            >
              Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
            >
              Previous
            </span>
          )}
          <Link
            href={`/year?view=week&date=${todayIso}`}
            className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
          >
            This week
          </Link>
          {canGoNext ? (
            <Link
              href={`/year?view=week&date=${nextDate}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
            >
              Next
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
            >
              Next
            </span>
          )}
        </nav>
      </div>
      <WeekView
        selectedDate={selectedDate}
        dayMap={dayMap}
        weeks={loaded.blueprint.weeks}
        curriculumByDate={curriculumByDate}
        planItemsByDate={planItemsByDate}
        areaGoals={areaGoals}
        energyByDate={energyByDate}
        today={todayIso}
      />
    </div>
  )
}

async function MonthChartView({ searchParams }: { searchParams: SearchParams }) {
  const now = new Date()
  const todayIso = todayISO()
  const today = {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
    day: Number(todayIso.slice(8, 10)),
  }
  const requestedDate = parseDate(searchParams.date, todayIso)
  const dateMonth = {
    year: Number(requestedDate.slice(0, 4)),
    month: Number(requestedDate.slice(5, 7)) - 1,
  }
  const planYear = new Date().getFullYear()
  const selected = clampMonthToPlanYear(parseMonth(searchParams.month, dateMonth), planYear)
  const {
    loaded,
    yearEphemeris,
    curriculumSessions,
    planItems,
    journalEntries,
    monthBrief,
    plannerContext,
  } = await loadMonthData(selected.year, selected.month)

  const weekStart = new Date(selected.year, selected.month, 1)
  const weekNumber = isoWeek(weekStart)
  const arc = loaded
    ? (loaded.pushRestArc ?? derivePushRestArc(loaded.blueprint, loaded.planYear))
    : []
  const todayPct = (dayOfYear(now) / 365) * 100

  const monthBlueprint = loaded?.blueprint.months.find((m) => m.month === selected.month + 1)
  const quarterNumber = Math.floor(selected.month / 3) + 1
  const quarterBlueprint = loaded?.blueprint.quarters.find((q) => q.quarter === quarterNumber)
  const events = eventsForMonth(monthBlueprint, selected.year, selected.month)
  const monthPrefix = `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-`
  const monthSessions = curriculumSessions.filter((s) => s.scheduled_for.startsWith(monthPrefix))
  const monthDates = Array.from(
    { length: new Date(selected.year, selected.month + 1, 0).getDate() },
    (_, index) => `${monthPrefix}${String(index + 1).padStart(2, '0')}`
  )
  const charactersByDate = buildDayCharacters(monthDates, yearEphemeris, plannerContext)
  const energyByDay = new Map<number, EnergyWindow>()
  for (const [date, character] of charactersByDate) {
    energyByDay.set(Number(date.slice(8, 10)), character)
  }

  const journalDays = new Set<number>()
  for (const row of journalEntries ?? []) {
    const d = Number(row.entry_date?.slice(8, 10))
    if (Number.isFinite(d)) journalDays.add(d)
  }
  const monthPlanItems = planItems.filter((item) => item.item_date.startsWith(monthPrefix))
  const planItemsByDay = new Map<number, PlanItemRow[]>()
  const curriculumByDay = new Map<number, CurriculumSessionRow[]>()
  for (const item of monthPlanItems) {
    const d = Number(item.item_date.slice(8, 10))
    if (!Number.isFinite(d)) continue
    const items = planItemsByDay.get(d)
    if (items) items.push(item)
    else planItemsByDay.set(d, [item])
  }
  for (const session of monthSessions) {
    const d = Number(session.scheduled_for.slice(8, 10))
    if (!Number.isFinite(d)) continue
    const sessions = curriculumByDay.get(d)
    if (sessions) sessions.push(session)
    else curriculumByDay.set(d, [session])
  }
  const existingBrief = monthBrief ?? null
  const moonPhaseCount = monthBlueprint?.moonPhases.filter((mp) => mp.date.startsWith(monthPrefix)).length ?? 0
  const intentionsCount = monthBlueprint?.intentions.length ?? 0
  const keyTransitsCount = monthBlueprint?.keyTransits.length ?? 0

  // Sabian symbol — use today's Sun degree when the displayed month contains
  // today, otherwise the 15th of the displayed month. Sun moves ~1° / day so
  // this is effectively the week-midpoint reading the handoff called for.
  const sabianTargetIso = (today.year === selected.year && today.month === selected.month)
    ? `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`
    : `${monthPrefix}15`
  const sabianDay = yearEphemeris?.days.find((d) => d.date === sabianTargetIso)
  const sabian = sabianDay ? getSabianForDegree(sabianDay.sun.longitude) : null
  const sabianDateLabel = sabianDay
    ? new Date(`${sabianTargetIso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-6">
      <PageHeader current="month" />
      <div
        style={{
          fontFamily: K.fBody,
          color: K.ink,
          background: K.bg,
          minHeight: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Kicker>{MONTH_NAMES[selected.month]} · {selected.year}</Kicker>
            <div
              style={{
                fontFamily: K.fSerif,
                fontStyle: 'italic',
                fontSize: 32,
                color: K.ink,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              {monthBlueprint?.theme ?? 'Your year, anchored to the sky.'}
            </div>
            {monthBlueprint?.energyArc ? (
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 13,
                  color: K.inkDim,
                  lineHeight: 1.6,
                  marginTop: 10,
                  maxWidth: 720,
                }}
              >
                {monthBlueprint.energyArc}
              </div>
            ) : null}
          </div>
          <nav className="flex items-center gap-2" aria-label="Month navigation">
            {selected.month > 0 ? (
              <Link
                href={`/year?view=month&month=${shiftMonth(selected.year, selected.month, -1)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                Previous
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
              >
                Previous
              </span>
            )}
            <Link
              href={`/year?view=month&month=${todayIso.slice(0, 7)}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
            >
              This month
            </Link>
            {selected.month < 11 ? (
              <Link
                href={`/year?view=month&month=${shiftMonth(selected.year, selected.month, 1)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                Next
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
              >
                Next
              </span>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '10px 14px',
              border: `1px solid ${K.line}`,
              borderRadius: 10,
              background: K.bg2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: K.copperHi,
                }}
              >
                Q{quarterNumber}
              </span>
              <span
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: K.ink,
                  lineHeight: 1.2,
                }}
              >
                {quarterBlueprint?.theme ?? 'Quarterly theme'}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 18,
                fontFamily: K.fMono,
                fontSize: 11,
                letterSpacing: '0.14em',
                color: K.inkDim,
              }}
            >
              <span>{intentionsCount} INTENTIONS</span>
              <span>{keyTransitsCount} TRANSITS</span>
              <span>{monthSessions.length} SESSIONS</span>
              <span>{moonPhaseCount} MOON {moonPhaseCount === 1 ? 'PHASE' : 'PHASES'}</span>
            </div>
          </div>

          <Frame tone="umber" padding={20}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 14,
              }}
            >
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 28, color: K.ink }}>
                {MONTH_NAMES[selected.month]}
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 11,
                  color: K.inkSoft,
                  letterSpacing: '0.14em',
                }}
              >
                WK {weekNumber} — WK {weekNumber + 4}
              </div>
            </div>
            <MonthGrid
              year={selected.year}
              month={selected.month}
              today={today}
              events={events}
              journalDays={journalDays}
              planItemsByDay={planItemsByDay}
              curriculumByDay={curriculumByDay}
              energyByDay={energyByDay}
            />
          </Frame>

          {monthBlueprint ? (
            <MonthBriefPanel
              year={selected.year}
              month={selected.month + 1}
              monthName={MONTH_NAMES[selected.month] ?? ''}
              initialBrief={existingBrief?.brief_text ?? undefined}
              initialGeneratedAt={existingBrief?.generated_at ?? undefined}
              initialEditedAt={(existingBrief as { edited_at?: string | null } | null)?.edited_at ?? undefined}
              initialPinned={Boolean(existingBrief?.pinned)}
            />
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
              minHeight: 0,
            }}
          >
            <Frame tone="raised" padding={20} style={{ borderColor: `${K.brickHi}55` }}>
              <Kicker color={K.brickHi}>Intentions</Kicker>
              {monthBlueprint && monthBlueprint.intentions.length > 0 ? (
                <ul
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    listStyle: 'none',
                    padding: 0,
                  }}
                >
                  {monthBlueprint.intentions.map((intention) => (
                    <li
                      key={intention}
                      style={{
                        fontFamily: K.fSerif,
                        fontStyle: 'italic',
                        fontSize: 17,
                        color: K.ink,
                        lineHeight: 1.4,
                        paddingLeft: 14,
                        borderLeft: `2px solid ${K.copper}`,
                      }}
                    >
                      {intention}
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  Intentions for this month aren&apos;t in your blueprint yet.
                </div>
              )}
            </Frame>

            <Frame tone="umber" padding={20}>
              <Kicker color={K.copper}>Key transits</Kicker>
              {monthBlueprint && monthBlueprint.keyTransits.length > 0 ? (
                <ul
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    listStyle: 'none',
                    padding: 0,
                  }}
                >
                  {monthBlueprint.keyTransits.map((transit) => (
                    <li
                      key={transit}
                      style={{
                        fontFamily: K.fBody,
                        fontSize: 14,
                        color: K.ink,
                        lineHeight: 1.5,
                        display: 'flex',
                        gap: 9,
                      }}
                    >
                      <span style={{ color: K.copperHi, marginTop: 3 }}>•</span>
                      <span style={{ flex: 1 }}>{transit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  No key transits noted for this month.
                </div>
              )}
            </Frame>

            <Frame tone="cocoa" padding={20} stars>
              <Kicker color={K.copper}>Sabian symbol</Kicker>
              {sabian ? (
                <>
                  <div
                    style={{
                      fontFamily: K.fSerif,
                      fontStyle: 'italic',
                      fontSize: 17,
                      color: K.ink,
                      marginTop: 10,
                      lineHeight: 1.35,
                    }}
                  >
                    &ldquo;{sabian.symbol}&rdquo;
                  </div>
                  {sabian.interpretation ? (
                    <div
                      style={{
                        fontFamily: K.fBody,
                        fontSize: 13,
                        color: K.inkDim,
                        marginTop: 10,
                        lineHeight: 1.55,
                      }}
                    >
                      This is a symbol of {sabian.interpretation}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: K.fMono,
                      fontSize: 10,
                      color: K.inkSoft,
                      letterSpacing: '0.14em',
                      marginTop: 10,
                    }}
                  >
                    SUN · {sabian.position.toUpperCase()}
                    {sabianDateLabel ? ` · ${sabianDateLabel.toUpperCase()}` : ''}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  Ephemeris data isn&apos;t ready for this month yet.
                </div>
              )}
            </Frame>

            <Frame tone="umber" padding={20}>
              <Kicker>Curriculum</Kicker>
              {monthSessions.length > 0 ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthSessions.slice(0, 4).map((session) => (
                    <div
                      key={session.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        background: K.bg,
                        border: `1px solid ${K.line}`,
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ color: session.status === 'done' ? K.sage : K.copper, fontSize: 16 }}>◐</span>
                      <span style={{ fontFamily: K.fBody, fontSize: 14, color: K.ink, flex: 1, lineHeight: 1.3 }}>
                        {session.title}
                      </span>
                      <span style={{ fontFamily: K.fMono, fontSize: 10.5, color: K.inkSoft }}>
                        {session.estimated_minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  No curriculum sessions scheduled this month.
                </div>
              )}
              <Link
                href="/curriculum"
                style={{
                  display: 'block',
                  fontFamily: K.fMono,
                  fontSize: 10,
                  color: K.copperHi,
                  letterSpacing: '0.14em',
                  marginTop: 12,
                  textAlign: 'right',
                  textDecoration: 'none',
                }}
              >
                BROWSE ALL TRACKS →
              </Link>
            </Frame>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <Kicker>Year&apos;s pulse · push / rest / edit</Kicker>
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 9.5,
                color: K.inkSoft,
                letterSpacing: '0.14em',
              }}
            >
              JAN — DEC
            </div>
          </div>
          <PushRestRibbon periods={arc} todayPct={todayPct} />
        </div>
      </div>
    </div>
  )
}

const QUARTER_MONTHS: Record<number, string> = {
  1: 'Jan — Mar',
  2: 'Apr — Jun',
  3: 'Jul — Sep',
  4: 'Oct — Dec',
}

const QUARTER_END_LABEL: Record<number, string> = {
  1: 'Mar 31',
  2: 'Jun 30',
  3: 'Sep 30',
  4: 'Dec 31',
}

type QuarterStatus = 'completed' | 'draft' | 'not-started' | 'future'

function quarterStatus(
  reviewRow: { completed_at: string | null; wins: unknown; challenges: unknown; pivots: string | null; next_quarter_intentions: string | null } | null,
  quarter: number,
  currentQ: number,
): QuarterStatus {
  if (reviewRow?.completed_at) return 'completed'
  const hasDraftContent =
    !!reviewRow &&
    ((Array.isArray(reviewRow.wins) && reviewRow.wins.length > 0) ||
      (Array.isArray(reviewRow.challenges) && reviewRow.challenges.length > 0) ||
      (reviewRow.pivots && reviewRow.pivots.trim().length > 0) ||
      (reviewRow.next_quarter_intentions && reviewRow.next_quarter_intentions.trim().length > 0))
  if (hasDraftContent) return 'draft'
  if (quarter > currentQ) return 'future'
  return 'not-started'
}

function statusLabel(status: QuarterStatus): { label: string; tone: string } {
  switch (status) {
    case 'completed':
      return { label: 'COMPLETED', tone: K.sage }
    case 'draft':
      return { label: 'DRAFT', tone: K.copperHi }
    case 'future':
      return { label: 'FUTURE QUARTER', tone: K.inkSoft }
    case 'not-started':
    default:
      return { label: 'NOT STARTED', tone: K.inkDim }
  }
}

async function QuarterReviewView({ searchParams }: { searchParams: SearchParams }) {
  const now = new Date()
  const currentQ = currentQuarter(now.getMonth())
  const selectedQuarter = parseQuarter(searchParams.quarter, currentQ)

  const { loaded, supabaseUserId } = await loadYearBase()

  if (!loaded) {
    return (
      <div className="space-y-6">
        <PageHeader current="review" />
        <NoBlueprintCard />
      </div>
    )
  }

  const admin = createAdminSupabase()
  const reviewsRes = supabaseUserId
    ? await admin
        .from('quarterly_reviews')
        .select('quarter, completed_at, wins, challenges, pivots, next_quarter_intentions, ai_summary, stats_snapshot, created_at')
        .eq('user_id', supabaseUserId)
        .eq('plan_year', loaded.planYear)
    : { data: [] }

  const reviewsByQuarter = new Map<number, NonNullable<typeof reviewsRes.data>[number]>()
  for (const row of reviewsRes.data ?? []) {
    if (typeof row.quarter === 'number') reviewsByQuarter.set(row.quarter, row)
  }

  const selectedReview = reviewsByQuarter.get(selectedQuarter) ?? null
  const quarterBlueprint = loaded.blueprint.quarters.find((q) => q.quarter === selectedQuarter)
  const selectedStatus = quarterStatus(selectedReview, selectedQuarter, currentQ)
  const selectedStatusMeta = statusLabel(selectedStatus)

  // Pull the prior quarter's stats_snapshot so the panel can render
  // deltas (e.g. "+12 vs Q1") below each activity counter. Q1's prior is
  // Q4 of the previous year, which lives in a different plan_year row.
  const priorCoords =
    selectedQuarter === 1
      ? { year: loaded.planYear - 1, quarter: 4 }
      : { year: loaded.planYear, quarter: selectedQuarter - 1 }
  let priorStatsSnapshot: Record<string, number> | null = null
  if (priorCoords.year === loaded.planYear) {
    const priorRow = reviewsByQuarter.get(priorCoords.quarter)
    if (priorRow?.stats_snapshot && typeof priorRow.stats_snapshot === 'object') {
      priorStatsSnapshot = priorRow.stats_snapshot as Record<string, number>
    }
  } else {
    const priorYearRes = supabaseUserId
      ? await admin.from('quarterly_reviews').select('stats_snapshot').eq('user_id', supabaseUserId).eq('plan_year', priorCoords.year).eq('quarter', priorCoords.quarter).maybeSingle()
      : { data: null }
    if (priorYearRes.data?.stats_snapshot && typeof priorYearRes.data.stats_snapshot === 'object') {
      priorStatsSnapshot = priorYearRes.data.stats_snapshot as Record<string, number>
    }
  }
  const priorQuarterLabel = `Q${priorCoords.quarter}${
    priorCoords.year !== loaded.planYear ? ` ${priorCoords.year}` : ''
  }`

  // Find the most recent past quarter that's never been touched, so we can
  // nudge the user to look back. Skipped when the user is already on it.
  let backfillQuarter: number | null = null
  for (let q = currentQ - 1; q >= 1; q--) {
    const row = reviewsByQuarter.get(q) ?? null
    if (quarterStatus(row, q, currentQ) === 'not-started') {
      backfillQuarter = q
      break
    }
  }
  const showBackfillNudge = backfillQuarter !== null && backfillQuarter !== selectedQuarter

  const completedDateLabel = selectedReview?.completed_at
    ? new Date(selectedReview.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <PageHeader current="review" />
      <div
        style={{
          fontFamily: K.fBody,
          color: K.ink,
          background: K.bg,
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 16,
        }}
      >
        {/* Header: quarter title + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Kicker>Quarterly Review · {loaded.planYear}</Kicker>
            <div
              style={{
                fontFamily: K.fSerif,
                fontStyle: 'italic',
                fontSize: 32,
                color: K.ink,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              Q{selectedQuarter} · {QUARTER_MONTHS[selectedQuarter]}
            </div>
            {quarterBlueprint?.theme ? (
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 13,
                  color: K.inkDim,
                  lineHeight: 1.6,
                  marginTop: 10,
                  maxWidth: 720,
                }}
              >
                {quarterBlueprint.theme}
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                letterSpacing: '0.18em',
                color: selectedStatusMeta.tone,
              }}
            >
              {selectedStatusMeta.label}
            </div>
            {completedDateLabel ? (
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft, marginTop: 4, letterSpacing: '0.14em' }}>
                {completedDateLabel.toUpperCase()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Q1 (or earlier) backfill nudge — past quarter, never touched */}
        {showBackfillNudge && backfillQuarter !== null ? (
          <Link
            href={`/year?view=review&quarter=${backfillQuarter}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 14px',
              border: `1px solid ${K.copper}55`,
              borderRadius: 10,
              background: K.bg2,
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: K.copperHi,
                }}
              >
                Q{backfillQuarter} · {QUARTER_MONTHS[backfillQuarter]}
              </span>
              <span style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
                Wrapped on {QUARTER_END_LABEL[backfillQuarter]}. When you&rsquo;re ready, look back.
              </span>
            </div>
            <span
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                letterSpacing: '0.16em',
                color: K.copperHi,
              }}
            >
              OPEN →
            </span>
          </Link>
        ) : null}

        {/* Quarter selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map((q) => {
            const row = reviewsByQuarter.get(q) ?? null
            const status = quarterStatus(row, q, currentQ)
            const meta = statusLabel(status)
            const active = q === selectedQuarter
            return (
              <Link
                key={q}
                href={`/year?view=review&quarter=${q}`}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: active ? K.bg2 : 'transparent',
                  border: `1px solid ${active ? K.copper : K.line}`,
                  borderRadius: 10,
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.16em', color: active ? K.copperHi : K.inkDim }}>
                  Q{q} · {QUARTER_MONTHS[q]}
                </div>
                <div style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.14em', color: meta.tone }}>
                  {meta.label}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Quarter context + review form (form is the panel island, added next) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'flex-start' }}>
          <Frame tone="raised" padding={20}>
            <QuarterReviewPanel
              year={loaded.planYear}
              quarter={selectedQuarter}
              initialWins={Array.isArray(selectedReview?.wins) ? (selectedReview!.wins as string[]) : undefined}
              initialChallenges={Array.isArray(selectedReview?.challenges) ? (selectedReview!.challenges as string[]) : undefined}
              initialPivots={selectedReview?.pivots ?? null}
              initialNextQuarterIntentions={selectedReview?.next_quarter_intentions ?? null}
              initialCompletedAt={selectedReview?.completed_at ?? null}
              initialAiSummary={selectedReview?.ai_summary ?? null}
              initialStatsSnapshot={
                selectedReview?.stats_snapshot && typeof selectedReview.stats_snapshot === 'object'
                  ? (selectedReview.stats_snapshot as Record<string, number>)
                  : null
              }
              priorStatsSnapshot={priorStatsSnapshot}
              priorQuarterLabel={priorQuarterLabel}
            />
          </Frame>

          <Frame tone="umber" padding={20}>
            <Kicker>Quarter context</Kicker>
            {quarterBlueprint ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {quarterBlueprint.intention ? (
                  <div>
                    <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: K.copperHi, marginBottom: 4 }}>
                      INTENTION
                    </div>
                    <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink, lineHeight: 1.55 }}>
                      {quarterBlueprint.intention}
                    </div>
                  </div>
                ) : null}
                {quarterBlueprint.cosmicHighlights.length > 0 ? (
                  <div>
                    <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: K.copperHi, marginBottom: 6 }}>
                      KEY TRANSITS
                    </div>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {quarterBlueprint.cosmicHighlights.map((h, i) => (
                        <li key={i} style={{ fontFamily: K.fBody, fontSize: 12.5, color: K.inkDim, lineHeight: 1.5 }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 13,
                  color: K.inkDim,
                  marginTop: 12,
                  lineHeight: 1.6,
                }}
              >
                No blueprint context for this quarter yet.
              </div>
            )}
          </Frame>
        </div>
      </div>
    </div>
  )
}
