import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CosmicPlanView } from '@/components/cosmic-plan/CosmicPlanView'
import { WeekView } from '@/components/calendar/WeekView'
import { YearChartShell } from '@/components/year/YearChartShell'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { EphemerisDay, MonthBlueprint, MoonPhase, YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { Tables } from '@/types/database'
import { Frame, Kicker, K } from '@/components/almanac'
import { YearViewSwitcher } from '@/components/year/YearViewSwitcher'
import { MonthGrid, type DayEvent } from '@/components/year/MonthGrid'
import { MonthBriefPanel } from '@/components/year/MonthBriefPanel'
import { QuarterReviewPanel } from '@/components/year/QuarterReviewPanel'
import { PushRestRibbon } from '@/components/year/PushRestRibbon'
import { MONTH_NAMES as CAL_MONTH_NAMES } from '@/components/calendar/utils'
import { getSabianForDegree } from '@/lib/ephemeris/sabian'
import { derivePushRestArc } from '@/lib/year/push-rest-arc'
import { todayISO } from '@/lib/today/get-today-context'

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
  if (raw === 'month') return 'month'
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

const EMPTY_YEAR_DATA = {
  loaded: null,
  yearEphemeris: null,
  curriculumSessions: [] as CurriculumSessionRow[],
  planItems: [] as PlanItemRow[],
  areaGoals: [] as AreaGoalRow[],
  supabaseUserId: null,
}

async function loadYearData() {
  const { userId } = await auth()
  if (!userId) return EMPTY_YEAR_DATA

  const admin = createAdminSupabase()
  const { data: profileRow } = await admin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  const supabaseUserId = profileRow?.id ?? null
  if (!supabaseUserId) return EMPTY_YEAR_DATA

  const loaded = await loadCurrentBlueprint(supabaseUserId)
  if (!loaded) return { ...EMPTY_YEAR_DATA, supabaseUserId }

  const startDate = `${loaded.planYear}-01-01`
  const endDate = `${loaded.planYear}-12-31`

  const [ephemerisRes, sessionsRes, planItemsRes, areaGoalsRes] = await Promise.all([
    admin.from('ephemeris_cache').select('data').eq('user_id', supabaseUserId).eq('year', loaded.planYear).maybeSingle(),
    admin
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .eq('user_id', supabaseUserId)
      .gte('scheduled_for', startDate)
      .lte('scheduled_for', endDate)
      .order('scheduled_for', { ascending: true }),
    admin
      .from('plan_items')
      .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, user_id')
      .eq('user_id', supabaseUserId)
      .gte('item_date', startDate)
      .lte('item_date', endDate)
      .order('item_date', { ascending: true })
      .order('sort_order', { ascending: true }),
    admin
      .from('area_goals')
      .select('id, category_id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at, user_id')
      .eq('user_id', supabaseUserId)
      .not('linked_week_number', 'is', null),
  ])

  return {
    loaded,
    yearEphemeris: (ephemerisRes.data?.data as YearEphemeris | null) ?? null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
    planItems: (planItemsRes.data ?? []) as PlanItemRow[],
    areaGoals: (areaGoalsRes.data ?? []) as AreaGoalRow[],
    supabaseUserId,
  }
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
  const { loaded, yearEphemeris } = await loadYearData()

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
  const selectedDate = parseDate(searchParams.date, todayIso)

  const { loaded, yearEphemeris, curriculumSessions, planItems, areaGoals } = await loadYearData()

  if (!loaded || !yearEphemeris) {
    return (
      <div className="space-y-6">
        <PageHeader current="week" />
        {loaded ? (
          <div className="shell-panel px-6 py-8">
            <p className="shell-kicker mb-3">Cosmic Calendar</p>
            <h2 className="shell-section-title">Week data is still forming</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
              Your {loaded.planYear} sky map will appear here once the ephemeris cache is available.
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
    const current = curriculumByDate.get(session.scheduled_for) ?? []
    current.push(session)
    curriculumByDate.set(session.scheduled_for, current)
  }
  const planItemsByDate = new Map<string, PlanItemRow[]>()
  for (const item of planItems) {
    const current = planItemsByDate.get(item.item_date) ?? []
    current.push(item)
    planItemsByDate.set(item.item_date, current)
  }
  const weekBlueprintForGoals = loaded.blueprint.weeks.find(
    (w) => w.startDate <= selectedDate && selectedDate <= w.endDate
  )
  const weekAreaGoals = weekBlueprintForGoals
    ? areaGoals.filter((g) => g.linked_week_number === weekBlueprintForGoals.weekNumber)
    : []

  const monthIdx = Number(selectedDate.slice(5, 7)) - 1
  const monthName = CAL_MONTH_NAMES[monthIdx] ?? ''

  return (
    <div className="space-y-6">
      <PageHeader current="week" />
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/year" className="text-bone-muted transition-colors hover:text-bone">
          {yearEphemeris.year}
        </Link>
        <span className="text-bone-muted/40">/</span>
        <Link
          href={`/year?view=month&month=${selectedDate.slice(0, 7)}`}
          className="text-bone-muted transition-colors hover:text-bone"
        >
          {monthName}
        </Link>
        <span className="text-bone-muted/40">/</span>
        <span className="text-bone">Week</span>
      </nav>
      <WeekView
        selectedDate={selectedDate}
        dayMap={dayMap}
        weeks={loaded.blueprint.weeks}
        curriculumByDate={curriculumByDate}
        planItemsByDate={planItemsByDate}
        areaGoals={weekAreaGoals}
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
  const selected = parseMonth(searchParams.month, { year: today.year, month: today.month })

  const { loaded, yearEphemeris, curriculumSessions, planItems, supabaseUserId } = await loadYearData()

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

  const lastDay = new Date(selected.year, selected.month + 1, 0).getDate()
  const monthStart = `${monthPrefix}01`
  const monthEnd = `${monthPrefix}${String(lastDay).padStart(2, '0')}`
  const admin = createAdminSupabase()
  const [journalRes, briefRes] = await Promise.all([
    supabaseUserId
      ? admin.from('journal_entries').select('entry_date').eq('user_id', supabaseUserId).gte('entry_date', monthStart).lte('entry_date', monthEnd)
      : Promise.resolve({ data: [] }),
    supabaseUserId
      ? admin.from('month_briefs').select('brief_text, generated_at, edited_at, pinned').eq('user_id', supabaseUserId).eq('plan_year', selected.year).eq('month', selected.month + 1).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const journalDays = new Set<number>()
  for (const row of journalRes.data ?? []) {
    const d = Number(row.entry_date?.slice(8, 10))
    if (Number.isFinite(d)) journalDays.add(d)
  }
  const monthPlanItems = planItems.filter((item) => item.item_date.startsWith(monthPrefix))
  const planCountByDay = new Map<number, { total: number; done: number }>()
  for (const item of monthPlanItems) {
    const d = Number(item.item_date.slice(8, 10))
    if (!Number.isFinite(d)) continue
    const current = planCountByDay.get(d) ?? { total: 0, done: 0 }
    current.total += 1
    if (item.completed_at) current.done += 1
    planCountByDay.set(d, current)
  }
  const existingBrief = briefRes.data ?? null
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
              planCountByDay={planCountByDay}
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

  const { loaded, supabaseUserId } = await loadYearData()

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
