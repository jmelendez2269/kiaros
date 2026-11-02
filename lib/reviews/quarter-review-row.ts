/**
 * Helpers to distinguish form-based quarterly reviews from period-review cache rows.
 */

import { readCacheFromStatsSnapshot } from '@/lib/period-review/cache-schema'

export type QuarterlyReviewContentRow = {
  wins?: unknown
  challenges?: unknown
  pivots?: string | null
  next_quarter_intentions?: string | null
  completed_at?: string | null
  stats_snapshot?: unknown
}

export function hasPeriodReviewCacheInSnapshot(stats_snapshot: unknown): boolean {
  return Object.keys(readCacheFromStatsSnapshot(stats_snapshot)).length > 0
}

/** Rows created only to store `stats_snapshot.periodReviewCache` (month/quarter look backs). */
export function isPeriodReviewCacheOnlyRow(row: QuarterlyReviewContentRow): boolean {
  if (hasAuthoredQuarterlyReviewContent(row)) return false
  return hasPeriodReviewCacheInSnapshot(row.stats_snapshot)
}

export function hasAuthoredQuarterlyReviewContent(row: QuarterlyReviewContentRow): boolean {
  if (row.completed_at) return true
  const wins = Array.isArray(row.wins) ? row.wins.filter((v) => typeof v === 'string' && v.trim()) : []
  const challenges = Array.isArray(row.challenges)
    ? row.challenges.filter((v) => typeof v === 'string' && v.trim())
    : []
  if (wins.length || challenges.length) return true
  if (typeof row.pivots === 'string' && row.pivots.trim()) return true
  if (typeof row.next_quarter_intentions === 'string' && row.next_quarter_intentions.trim()) return true
  return false
}

/** Treat period-review cache rows as absent for all legacy quarterly-review surfaces. */
export function isFormQuarterlyReviewRow(row: QuarterlyReviewContentRow | null | undefined): row is QuarterlyReviewContentRow {
  if (!row) return false
  if (isPeriodReviewCacheOnlyRow(row)) return false
  return hasAuthoredQuarterlyReviewContent(row)
}

export function filterFormQuarterlyReviewRows<T extends QuarterlyReviewContentRow>(rows: T[]): T[] {
  return rows.filter((row) => isFormQuarterlyReviewRow(row))
}

export type FormQuarterStatus = 'complete' | 'draft' | 'future' | 'not-started'

export function formQuarterStatus(
  row: { completed_at: string | null } | null,
  quarter: number,
  currentQ: number,
): FormQuarterStatus {
  if (quarter > currentQ) return 'future'
  if (!row || !hasAuthoredQuarterlyReviewContent(row)) return 'not-started'
  if (row.completed_at) return 'complete'
  return 'draft'
}
