/**
 * data-tour values on sidebar nav (shared by AlmanacSidebar and tour tests).
 */

export type AlmanacNavKey =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'self'
  | 'journal'
  | 'goalsStudy'
  | 'stelloquy'

/** Primary nav link data-tour for a top-level sidebar item. */
export function primaryNavTourTarget(key: AlmanacNavKey): string {
  return `nav-${key}`
}

/** Calendar Day / Month / Year / Blueprint tab row on /calendar (KIAROS_CALENDAR_DAY). */
export const CALENDAR_TAB_ROW_TOUR_TARGET = 'nav-calendar-tabs'

/** Fallback: spotlight Week + Month + Year sidebar links together when tabs are not mounted. */
export const CALENDAR_SIDEBAR_GROUP_TOUR_TARGET = 'nav-calendar-sidebar-group'

export const NAV_CURRICULUM_TOUR_TARGET = 'nav-curriculum'

const CALENDAR_SIDEBAR_GROUP_KEYS: AlmanacNavKey[] = ['week', 'month', 'year']

export function sidebarNavTourTarget(
  key: AlmanacNavKey,
  calendarDayEnabled: boolean,
): string {
  if (calendarDayEnabled && CALENDAR_SIDEBAR_GROUP_KEYS.includes(key)) {
    return CALENDAR_SIDEBAR_GROUP_TOUR_TARGET
  }
  return primaryNavTourTarget(key)
}
