/**
 * Planner Year Calculation
 * 
 * The planner year rolls on December 1, 00:00 America/New_York.
 * From Dec 1 onwards, the current planner year = calendar year + 1.
 * Before Dec 1, current planner year = calendar year.
 * 
 * Examples:
 * - Nov 30, 2026 23:59 ET → planner year 2026
 * - Dec 1, 2026 00:00 ET → planner year 2027
 * - Jan 1, 2027 → planner year 2027
 */

/**
 * Get the current planner year based on a given date.
 * 
 * @param now - The date to check (defaults to current time)
 * @returns The current planner year
 */
export function getCurrentPlannerYear(now: Date = new Date()): number {
  // Convert to America/New_York timezone
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = etFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value);
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  
  // If we're in December (month 12), we're in the next planner year
  if (month === 12 && day >= 1) {
    return year + 1;
  }
  
  return year;
}

/**
 * Get the next planner year based on a given date.
 * 
 * @param now - The date to check (defaults to current time)
 * @returns The next planner year (current + 1)
 */
export function getNextPlannerYear(now: Date = new Date()): number {
  return getPlannerYearWithOverride(now) + 1;
}

/**
 * Environment variable override for testing/emergencies.
 * If set, this value is used instead of calculating from the date.
 */
export function getPlannerYearWithOverride(now: Date = new Date()): number {
  const override = process.env.PLANNER_YEAR_OVERRIDE;
  if (override) {
    const parsed = parseInt(override, 10);
    if (Number.isInteger(parsed) && parsed > 2000 && parsed < 3000) {
      return parsed;
    }
  }
  return getCurrentPlannerYear(now);
}

/**
 * The year the public site is selling right now.
 *
 * From October 1 (America/New_York) the site sells next year, because people
 * shopping in the autumn are planning for January. Before October it sells
 * the current planner year.
 */
export function getSellingPlannerYear(now: Date = new Date()): number {
  const plannerYear = getPlannerYearWithOverride(now);
  const month = getNewYorkMonth(now);
  // Dec rolls the planner year itself; Oct and Nov sell the year ahead.
  return month === 10 || month === 11 ? plannerYear + 1 : plannerYear;
}

export interface SalesYearCopy {
  sellingYear: number;
  /** One-line hook for the top of public pages, or null when there's nothing time-bound to say. */
  hook: string | null;
  /** A short follow-on line under the hook, or null. */
  detail: string | null;
}

/**
 * Time-bound sales copy for the year turn. Swaps itself on Dec 1 and goes
 * quiet on Jan 1, so nobody has to remember to edit the pages.
 */
export function getSalesYearCopy(now: Date = new Date()): SalesYearCopy {
  const sellingYear = getSellingPlannerYear(now);
  const month = getNewYorkMonth(now);

  if (month === 10 || month === 11) {
    return {
      sellingYear,
      hook: `Join now and you get the rest of ${sellingYear - 1}, plus all of ${sellingYear}.`,
      detail: `Your ${sellingYear} Blueprint opens Dec 1, and we'll invite you to generate it then.`,
    };
  }

  if (month === 12) {
    return {
      sellingYear,
      hook: `${sellingYear} Blueprints are open. Join now and your ${sellingYear} is ready before it starts.`,
      detail: null,
    };
  }

  return { sellingYear, hook: null, detail: null };
}

function getNewYorkMonth(now: Date): number {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
  }).format(now);
  return parseInt(month, 10);
}
