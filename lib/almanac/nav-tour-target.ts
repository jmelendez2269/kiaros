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
export function primaryNavTourTarget(
  key: AlmanacNavKey,
  calendarDayEnabled: boolean,
): string {
  if (calendarDayEnabled && key === 'week') return 'nav-calendar'
  return `nav-${key}`
}

export const NAV_CURRICULUM_TOUR_TARGET = 'nav-curriculum'
