/**
 * The look-ahead window: from November 1 to November 30 every active member
 * can look into the next planner year. On December 1, 00:00 America/New_York,
 * that year becomes the current planner year (lib/commerce/planner-year.ts)
 * and the window closes.
 *
 * Dates here are calendar days in America/New_York, the same clock the
 * planner year rolls on, so the window and the roll can never disagree.
 */

export const LOOK_AHEAD_TIME_ZONE = 'America/New_York'

/** First month (1-based) the next year is open to look into. */
const OPEN_MONTH = 11

export interface LookAheadWindow {
  /** True from Nov 1 through Nov 30. */
  open: boolean
  /** The current planner year on this day. */
  currentPlannerYear: number
  /** The year being looked into while open, otherwise null. */
  year: number | null
  /** The day the window opens for `year` (YYYY-MM-DD), when open. */
  opensOn: string | null
  /** The day `year` becomes the current planner year (YYYY-MM-DD), when open. */
  rollsOn: string | null
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The window on a calendar day (YYYY-MM-DD, America/New_York). */
export function lookAheadWindow(dateISO: string): LookAheadWindow {
  const match = ISO_DATE_RE.exec(dateISO)
  if (!match) throw new Error(`Invalid date: ${dateISO}`)
  const year = Number(match[1])
  const month = Number(match[2])
  // Same rule as getCurrentPlannerYear: December already belongs to next year.
  const currentPlannerYear = month === 12 ? year + 1 : year
  if (month !== OPEN_MONTH) {
    return { open: false, currentPlannerYear, year: null, opensOn: null, rollsOn: null }
  }
  return {
    open: true,
    currentPlannerYear,
    year: year + 1,
    opensOn: `${year}-11-01`,
    rollsOn: `${year}-12-01`,
  }
}

/** The calendar day in America/New_York for an instant. */
export function lookAheadDateISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LOOK_AHEAD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** The window for an instant, or for a preview's mock day when one is given. */
export function lookAheadWindowAt(options: { now?: Date; mockToday?: string | null } = {}): LookAheadWindow {
  return lookAheadWindow(options.mockToday ?? lookAheadDateISO(options.now))
}
