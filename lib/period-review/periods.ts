/**
 * Calendar period boundaries and REVIEW-01 promo window (last day of period through day 7 of next).
 */

export type PeriodReviewKind = 'month' | 'quarter'

export interface PeriodReviewPeriod {
  kind: PeriodReviewKind
  /** First calendar day of the closed period (YYYY-MM-DD). */
  periodStart: string
  /** Last calendar day inclusive (YYYY-MM-DD). */
  periodEnd: string
  planYear: number
  /** 1–12 for month; 1–4 for quarter (derived from periodStart). */
  index: number
}

const MS_DAY = 86_400_000

export function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

export function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

export function quarterForMonth(month1: number): number {
  return Math.ceil(month1 / 3)
}

export function planYearQuarterForPeriodStart(periodStart: string): { planYear: number; quarter: number } {
  const { y, m } = parseIsoDate(periodStart)
  return { planYear: y, quarter: quarterForMonth(m) }
}

export function periodFor(kind: PeriodReviewKind, year: number, index: number): PeriodReviewPeriod {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid year')
  }
  if (kind === 'month') {
    if (!Number.isInteger(index) || index < 1 || index > 12) throw new Error('Invalid month')
    const periodStart = `${year}-${String(index).padStart(2, '0')}-01`
    const last = lastDayOfMonth(year, index)
    const periodEnd = `${year}-${String(index).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    return { kind, periodStart, periodEnd, planYear: year, index }
  }
  if (!Number.isInteger(index) || index < 1 || index > 4) throw new Error('Invalid quarter')
  const startMonth = (index - 1) * 3 + 1
  const endMonth = startMonth + 2
  const periodStart = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const last = lastDayOfMonth(year, endMonth)
  const periodEnd = `${year}-${String(endMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { kind, periodStart, periodEnd, planYear: year, index }
}

export function cacheKey(period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>): string {
  return `${period.kind}:${period.periodStart}`
}

export function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T12:00:00Z`) + days * MS_DAY
  return new Date(t).toISOString().slice(0, 10)
}

/** True when `today` is on or after the last day of the period and on or before day 7 of the following period. */
export function isPromoWindow(today: string, period: PeriodReviewPeriod): boolean {
  const windowStart = period.periodEnd
  const windowEnd = addDays(period.periodEnd, 7)
  return today >= windowStart && today <= windowEnd
}

export function latestClosedMonth(today: string): PeriodReviewPeriod {
  const { y, m, d } = parseIsoDate(today)
  const month1 = m
  const last = lastDayOfMonth(y, month1)
  if (d >= last) {
    return periodFor('month', y, month1)
  }
  const prevMonth1 = month1 === 1 ? 12 : month1 - 1
  const prevYear = month1 === 1 ? y - 1 : y
  return periodFor('month', prevYear, prevMonth1)
}

export function latestClosedQuarter(today: string): PeriodReviewPeriod {
  const { y, m, d } = parseIsoDate(today)
  const q = quarterForMonth(m)
  const endMonth = q * 3
  const last = lastDayOfMonth(y, endMonth)
  const quarterEnd = `${y}-${String(endMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  if (today >= quarterEnd) {
    return periodFor('quarter', y, q)
  }
  const prevQ = q === 1 ? 4 : q - 1
  const prevYear = q === 1 ? y - 1 : y
  return periodFor('quarter', prevYear, prevQ)
}

export function periodMonthNameOnly(period: PeriodReviewPeriod): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${period.periodStart}T12:00:00Z`))
}

export function periodLabel(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${period.periodStart}T12:00:00Z`))
  }
  return `Q${period.index} ${period.planYear}`
}

/** Calendar month after a closed month period (for carry-forward questions). */
export function monthNameAfterPeriod(period: PeriodReviewPeriod): string | null {
  if (period.kind !== 'month') return null
  const { y, m } = parseIsoDate(period.periodStart)
  const nextMonth1 = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(nextYear, nextMonth1 - 1, 15)))
}

export function periodReviewHref(kind: PeriodReviewKind, year: number, index: number): string {
  const sp = new URLSearchParams({ kind, year: String(year), index: String(index) })
  return `/period-review?${sp.toString()}`
}
