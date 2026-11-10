import { periodFor as lookBackPeriodFor, type PeriodReviewPeriod } from '@/lib/period-review/periods'
import { addDays, type PeriodKind } from './periods'

/**
 * The look back engine reads a date window with inclusive ends; a reflection
 * period ends on the day after its last day. Months and quarters map straight
 * across. A week or a whole year has no period of its own there, so it
 * borrows the month shape: a week sits in the month it starts in.
 */
export function lookBackWindow(period: { kind: PeriodKind; start: string; end: string }): PeriodReviewPeriod {
  const year = Number(period.start.slice(0, 4)), month = Number(period.start.slice(5, 7))
  if (period.kind === 'month') return lookBackPeriodFor('month', year, month)
  if (period.kind === 'quarter') return lookBackPeriodFor('quarter', year, Math.ceil(month / 3))
  return { kind: 'month', periodStart: period.start, periodEnd: addDays(period.end, -1), planYear: year, index: month }
}

/** A year spans every month and quarter theme in the Blueprint, so none of them describes it. */
export function usesCalendarThemes(kind: PeriodKind): boolean {
  return kind !== 'year'
}
