import { hasAuthoredQuarterlyReviewContent, isFormQuarterlyReviewRow } from './quarter-review-row'

export type QuarterlyReviewGetRow = {
  quarter: number
  completed_at: string | null
  wins: unknown
  challenges: unknown
  pivots: string | null
  next_quarter_intentions: string | null
  ai_summary: string | null
  stats_snapshot: unknown
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string')
}

export type QuarterlyReviewGetResponse =
  | { exists: false }
  | {
      exists: true
      quarter: number
      completedAt: string | null
      wins: string[]
      challenges: string[]
      pivots: string | null
      nextQuarterIntentions: string | null
      aiSummary: string | null
      statsSnapshot: Record<string, number> | null
    }

/** GET /api/quarterly-review payload — ignores period-review cache-only rows. */
export function buildQuarterlyReviewGetResponse(row: QuarterlyReviewGetRow | null): QuarterlyReviewGetResponse {
  if (!row || !isFormQuarterlyReviewRow(row)) {
    return { exists: false }
  }

  return {
    exists: true,
    quarter: row.quarter,
    completedAt: row.completed_at,
    wins: coerceStringArray(row.wins),
    challenges: coerceStringArray(row.challenges),
    pivots: row.pivots,
    nextQuarterIntentions: row.next_quarter_intentions,
    aiSummary: row.ai_summary,
    statsSnapshot:
      row.stats_snapshot && typeof row.stats_snapshot === 'object'
        ? (row.stats_snapshot as Record<string, number>)
        : null,
  }
}

export function indexFormQuarterlyReviewsByQuarter<T extends QuarterlyReviewGetRow & { quarter: number }>(
  rows: T[],
): Map<number, T> {
  const map = new Map<number, T>()
  for (const row of rows) {
    if (typeof row.quarter !== 'number') continue
    if (!isFormQuarterlyReviewRow(row)) continue
    map.set(row.quarter, row)
  }
  return map
}

export function activityStatsSnapshotFromReviewRow(
  row: Pick<QuarterlyReviewGetRow, 'stats_snapshot'> | null | undefined,
): Record<string, number> | null {
  if (!row?.stats_snapshot || typeof row.stats_snapshot !== 'object') return null
  return row.stats_snapshot as Record<string, number>
}

/** @deprecated pre-REVIEW-01 behavior — only for regression tests */
export function legacyQuarterlyReviewRowCountsAsExisting(row: QuarterlyReviewGetRow | null): boolean {
  return row != null
}

export function formQuarterlyReviewRowCountsAsExisting(row: QuarterlyReviewGetRow | null): boolean {
  return row != null && hasAuthoredQuarterlyReviewContent(row) && isFormQuarterlyReviewRow(row)
}
