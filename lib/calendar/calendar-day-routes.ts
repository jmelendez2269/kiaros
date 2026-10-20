/**
 * Pure URL helpers for KIAROS_CALENDAR_DAY (unit-tested; no server-only imports).
 */

export function featureFlagEnabled(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase())
}

export type PlannerView = 'day' | 'week' | 'month'

/** Planner day view nav hrefs (must match main when KIAROS_CALENDAR_DAY is off). */
export function plannerDayViewTodayHref(): string {
  return '/planner?view=day'
}

export function plannerDayViewPrevHref(date: string): string {
  return `/planner?view=day&date=${date}`
}

export function plannerDayViewNextHref(date: string): string {
  return `/planner?view=day&date=${date}`
}

export function plannerDayTabHref(date: string): string {
  return `/planner?date=${date}`
}

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
