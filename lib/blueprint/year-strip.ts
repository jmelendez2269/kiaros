/**
 * Pure helpers for the Blueprint year-at-a-glance strip.
 * Run tests: npx tsx --test lib/blueprint/__tests__/year-strip.test.ts
 */
export interface StripWeek { weekNumber: number; startDate: string; endDate: string; energyType: string }

/** The week number of the last week that has fully ended by `today`, or null before the first one ends. */
export function lastClosedWeek(weeks: Pick<StripWeek, 'weekNumber' | 'endDate'>[], today: string): number | null {
  let last: number | null = null
  for (const week of weeks) if (week.endDate < today && (last === null || week.weekNumber > last)) last = week.weekNumber
  return last
}

/** "How weeks 1 to 46 actually went", or "How week 1 actually went". Null when no week has closed. */
export function howWeeksWentLabel(closed: number | null): string | null {
  if (!closed) return null
  return closed === 1 ? 'How week 1 actually went →' : `How weeks 1 to ${closed} actually went →`
}

/** The week that contains `today`, if any. */
export function currentWeekNumber(weeks: Pick<StripWeek, 'weekNumber' | 'startDate' | 'endDate'>[], today: string): number | null {
  return weeks.find((w) => w.startDate <= today && today <= w.endDate)?.weekNumber ?? null
}
