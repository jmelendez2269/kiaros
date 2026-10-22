import type { ReactNode } from 'react'
import Link from 'next/link'
import { DayPlanner } from '@/components/planner/DayPlanner'
import type { DayPlan } from '@/lib/planner/get-day-plan'
import {
  plannerDayTabHref,
  plannerDayViewNextHref,
  plannerDayViewPrevHref,
  plannerDayViewTodayHref,
} from '@/lib/calendar/calendar-day-routes'
import { cn } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatLongDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export type PlannerShellBasePath = '/planner' | '/calendar'

interface PlannerDayShellProps {
  basePath: PlannerShellBasePath
  date: string
  today: string
  dayPlan: DayPlan
  /** Shell kicker above the title (e.g. Planner vs Calendar). */
  kicker: string
  /** When set, show Day / Week / Month toggles (planner only). */
  showViewToggles?: boolean
  activeView?: 'day' | 'week' | 'month'
  /** Calendar Day grid scroll anchoring (not used on /planner). */
  dayGridScrollMode?: 'calendar'
  /** Rendered directly under the page title (e.g. calendar tab row). */
  belowTitle?: ReactNode
}

function plannerWeekHref(basePath: PlannerShellBasePath, date: string): string {
  return basePath === '/calendar'
    ? `/calendar?view=week&date=${date}`
    : `/planner?view=week&date=${date}`
}

function plannerMonthHref(date: string): string {
  return `/planner?view=month&date=${date}`
}

export function PlannerDayShell({
  basePath,
  date,
  today,
  dayPlan,
  kicker,
  showViewToggles = false,
  activeView = 'day',
  dayGridScrollMode,
  belowTitle,
}: PlannerDayShellProps) {
  const safeDate = DATE_RE.test(date) ? date : today
  const prevHref =
    basePath === '/calendar'
      ? `/calendar?view=day&date=${addDays(safeDate, -1)}`
      : plannerDayViewPrevHref(addDays(safeDate, -1))
  const nextHref =
    basePath === '/calendar'
      ? `/calendar?view=day&date=${addDays(safeDate, 1)}`
      : plannerDayViewNextHref(addDays(safeDate, 1))
  const todayHref =
    basePath === '/calendar' ? '/calendar?view=day' : plannerDayViewTodayHref()
  const title = formatLongDate(safeDate)

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="shell-kicker mb-1">{kicker}</p>
            <h1 className="font-serif text-3xl text-bone">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={prevHref}
              className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone"
            >
              ← Prev
            </Link>
            <Link
              href={todayHref}
              className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone"
            >
              Today
            </Link>
            <Link
              href={nextHref}
              className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone"
            >
              Next →
            </Link>
          </div>
        </div>

        {belowTitle ? <div className="w-full min-w-0">{belowTitle}</div> : null}
      </div>

      {showViewToggles ? (
        <div className="flex gap-2 text-xs uppercase tracking-wider">
          <Link
            href={plannerDayTabHref(safeDate)}
            className={cn(
              'rounded-full border px-3 py-1',
              activeView === 'day'
                ? 'border-leather-400/50 bg-leather-500/20 text-bone'
                : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
            )}
          >
            Day
          </Link>
          <Link
            href={plannerWeekHref(basePath, safeDate)}
            className={cn(
              'rounded-full border px-3 py-1',
              activeView === 'week'
                ? 'border-leather-400/50 bg-leather-500/20 text-bone'
                : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
            )}
          >
            Week
          </Link>
          {basePath === '/planner' ? (
            <Link
              href={plannerMonthHref(safeDate)}
              className={cn(
                'rounded-full border px-3 py-1',
                activeView === 'month'
                  ? 'border-leather-400/50 bg-leather-500/20 text-bone'
                  : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
              )}
            >
              Month
            </Link>
          ) : null}
        </div>
      ) : null}

      <DayPlanner
        date={safeDate}
        isToday={safeDate === today}
        initialPlanItems={dayPlan.planItems}
        windows={dayPlan.windows}
        planetaryHourBands={dayPlan.planetaryHourBands}
        dayGridScrollMode={dayGridScrollMode}
      />
    </div>
  )
}
