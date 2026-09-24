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
  return getCurrentPlannerYear(now) + 1;
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
