/**
 * Helpers to distinguish form-based quarterly reviews from period-review cache rows.
 */

export function hasAuthoredQuarterlyReviewContent(row: {
  wins?: unknown
  challenges?: unknown
  pivots?: string | null
  next_quarter_intentions?: string | null
  completed_at?: string | null
}): boolean {
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
