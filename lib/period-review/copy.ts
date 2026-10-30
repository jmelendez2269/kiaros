import type { PeriodReviewPeriod } from './periods'
import { periodMonthNameOnly } from './periods'

export function periodReviewDismissStorageKey(period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>): string {
  return `kiaros-period-review-dismiss:${period.kind}:${period.periodStart}`
}

export function todayCardLabel(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return `${periodMonthNameOnly(period).toUpperCase()} REVIEW`
  }
  return `Q${period.index} REVIEW`
}

export function formatPeriodDateRange(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T12:00:00Z`)
  const end = new Date(`${periodEnd}T12:00:00Z`)
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt.format(start)} - ${fmt.format(end)}`
}

export function formatGeneratedTimestamp(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
}

export function todayCardHeadline(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return `${periodMonthNameOnly(period)} is wrapping up`
  }
  return `Q${period.index} is wrapping up`
}

export function todayCardSubline(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return "Want to look back on it? We'll gather the sky, your plans, goals and check-ins into one view."
  }
  return "Want to look back on the last three months? We'll gather everything into one view."
}

export function todayCardButtonLabel(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return `Look back on ${periodMonthNameOnly(period)}`
  }
  return `Look back on Q${period.index}`
}

export function emptyJournalBanner(period: PeriodReviewPeriod): string {
  if (period.kind === 'month') {
    return `There are no journal entries for ${periodMonthNameOnly(period)}, so this look back draws on the sky, your plans, goals and check-ins.`
  }
  return `There are no journal entries for Q${period.index}, so this look back draws on the sky, your plans, goals and check-ins.`
}

export function emptyJournalClosingLinkLabel(_period: PeriodReviewPeriod): string {
  return 'If you want, you can add a few words about the month here.'
}

export function emptyJournalClosingText(period: PeriodReviewPeriod): string {
  if (period.kind === 'quarter') {
    return 'If you want, you can add a few words about the quarter here.'
  }
  return emptyJournalClosingLinkLabel(period)
}

export function monthReflectionWritePrompt(period: PeriodReviewPeriod): string {
  return `${periodMonthNameOnly(period)} reflection`
}

export function journalWritePrefillHref(period: PeriodReviewPeriod): string {
  const prompt = encodeURIComponent(monthReflectionWritePrompt(period))
  return `/journal?prompt=${prompt}`
}
