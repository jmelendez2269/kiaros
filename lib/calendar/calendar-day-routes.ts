/**
 * Pure URL helpers for KIAROS_CALENDAR_DAY (unit-tested; no server-only imports).
 */

export type PlannerView = 'day' | 'week' | 'month'

export function parsePlannerView(raw: string | undefined): PlannerView {
  if (raw === 'week') return 'week'
  if (raw === 'month') return 'month'
  return 'day'
}

/** True when /planner should redirect to Calendar (day view only; week/month stay on planner). */
export function shouldRedirectPlannerToCalendar(view: PlannerView): boolean {
  return view === 'day'
}

export function buildCalendarDayRedirectFromPlanner(params: {
  date?: string
  view?: string
}): string {
  const sp = new URLSearchParams()
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    sp.set('date', params.date)
  }
  sp.set('view', 'day')
  const qs = sp.toString()
  return qs ? `/calendar?${qs}` : '/calendar?view=day'
}

export function weekArcHref(startDate: string, calendarDayEnabled: boolean): string {
  if (calendarDayEnabled) {
    return `/calendar?view=week&date=${startDate}`
  }
  return `/year?view=week&date=${startDate}`
}
