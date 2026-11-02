import {
  isPromoWindow,
  latestClosedMonth,
  latestClosedQuarter,
  type PeriodReviewPeriod,
} from './periods'

/**
 * Pure auto-open decision. Quarter wins when both are due; month follows on a
 * later visit. Returns null when nothing is due or everything due was seen.
 */
export function choosePeriodToAutoOpen(
  todayDate: string,
  alreadyOpened: (period: PeriodReviewPeriod) => boolean,
): PeriodReviewPeriod | null {
  const quarter = latestClosedQuarter(todayDate)
  if (isPromoWindow(todayDate, quarter) && !alreadyOpened(quarter)) return quarter
  const month = latestClosedMonth(todayDate)
  if (isPromoWindow(todayDate, month) && !alreadyOpened(month)) return month
  return null
}
