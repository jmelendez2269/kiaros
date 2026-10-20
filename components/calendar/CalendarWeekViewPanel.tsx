import Link from 'next/link'
import { WeekView } from '@/components/calendar/WeekView'
import { getWeekDates } from '@/components/calendar/utils'
import { todayISO } from '@/lib/today/get-today-context'
import type { EphemerisDay } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { Tables } from '@/types/database'
import {
  buildDayCharacters,
  clampWeekToPlanYear,
  loadWeekChartData,
  shiftDate,
  weekOverlapsPlanYear,
} from '@/lib/calendar/load-week-chart-data'
import { currentBlueprintRowExists } from '@/lib/blueprint/load'

type PlanItemRow = Tables<'plan_items'>

function parseDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw) return fallbackIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallbackIso
  return raw
}

async function NoBlueprintCard({ supabaseUserId }: { supabaseUserId: string | null }) {
  const currentYear = new Date().getFullYear()
  const rowExists = supabaseUserId ? await currentBlueprintRowExists(supabaseUserId) : false

  if (rowExists) {
    return (
      <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
        <div className="text-4xl text-bone-muted">✦</div>
        <h2 className="font-serif text-3xl text-bone">Your {currentYear} plan is locked</h2>
        <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
          Your cosmic plan exists, but your current access doesn&apos;t cover it right now. Upgrade to reopen it.
        </p>
        <Link
          href="/pricing"
          className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
        >
          See plans
        </Link>
      </div>
    )
  }

  return (
    <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
      <div className="text-4xl text-bone-muted">✦</div>
      <h2 className="font-serif text-3xl text-bone">No plan yet</h2>
      <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
        Your {currentYear} cosmic plan hasn&apos;t been generated. Complete onboarding to create your personalised year
        built from your natal chart and real planetary transits.
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

function WindowedAccessNote({ windowEnd }: { windowEnd: string | null }) {
  return (
    <div className="shell-panel flex flex-col gap-3 border-leather-400/40 bg-leather-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-bone">You&apos;re seeing the plan your monthly access covers right now.</p>
        <p className="text-xs leading-relaxed text-bone-muted">
          {windowEnd
            ? `Open through ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${windowEnd}T12:00:00`))}. Dates outside this window are part of the annual Blueprint.`
            : 'Dates outside your current window are part of the annual Blueprint.'}
        </p>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 rounded-xl border border-leather-400/50 bg-leather-500/30 px-4 py-2 text-center text-sm font-medium text-bone shadow-glow hover:bg-leather-500/45"
      >
        See annual access
      </Link>
    </div>
  )
}

interface Props {
  date?: string
}

export async function CalendarWeekViewPanel({ date }: Props) {
  const todayIso = todayISO()
  const planYear = new Date().getFullYear()
  const selectedDate = clampWeekToPlanYear(parseDate(date, todayIso), planYear)
  const { loaded, yearEphemeris, curriculumSessions, planItems, areaGoals, plannerContext, supabaseUserId } =
    await loadWeekChartData(selectedDate)

  if (!loaded || !yearEphemeris) {
    return (
      <div className="space-y-6">
        {loaded ? (
          <div className="shell-panel px-6 py-8">
            <p className="shell-kicker mb-3">TODO(stella): Calendar week</p>
            <h2 className="shell-section-title">Week data is still forming</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
              Your sky map will appear here once this year&apos;s ephemeris is available.
            </p>
          </div>
        ) : (
          <NoBlueprintCard supabaseUserId={supabaseUserId} />
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
  const previousDate = shiftDate(selectedDate, -7)
  const nextDate = shiftDate(selectedDate, 7)
  const canGoPrevious = weekOverlapsPlanYear(previousDate, loaded.planYear)
  const canGoNext = weekOverlapsPlanYear(nextDate, loaded.planYear)

  return (
    <div className="space-y-6">
      {loaded.access.access === 'windowed' ? <WindowedAccessNote windowEnd={loaded.access.windowEnd} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-bone-muted">
          Your week&apos;s cosmic context, goals, study sessions, and practical tasks in one place.
        </p>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Week navigation">
          {canGoPrevious ? (
            <Link
              href={`/calendar?view=week&date=${previousDate}`}
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
            href={`/calendar?view=week&date=${todayIso}`}
            className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
          >
            This week
          </Link>
          {canGoNext ? (
            <Link
              href={`/calendar?view=week&date=${nextDate}`}
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
