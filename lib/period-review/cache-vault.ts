import {
  hasAuthoredQuarterlyReviewContent,
  isFormQuarterlyReviewRow,
  isPeriodReviewCacheOnlyRow,
  type QuarterlyReviewContentRow,
} from '@/lib/reviews/quarter-review-row'

export type QuarterlyReviewRowSnapshot = QuarterlyReviewContentRow & { quarter: number }

export type PeriodReviewVaultPick =
  | { ok: true; vaultQuarter: number }
  | { ok: false; reason: 'migration_required' }

/**
 * Picks a quarterly_reviews row quarter slot for period-review cache only.
 * Never returns a quarter whose row has authored QR content.
 */
export function pickPeriodReviewVaultQuarter(
  rows: QuarterlyReviewRowSnapshot[],
  calendarQuarter: number,
): PeriodReviewVaultPick {
  const byQuarter = new Map<number, QuarterlyReviewRowSnapshot>()
  for (const row of rows) {
    if (row.quarter >= 1 && row.quarter <= 4) byQuarter.set(row.quarter, row)
  }

  const calendarRow = byQuarter.get(calendarQuarter)
  if (!calendarRow) {
    return { ok: true, vaultQuarter: calendarQuarter }
  }
  if (isPeriodReviewCacheOnlyRow(calendarRow)) {
    return { ok: true, vaultQuarter: calendarQuarter }
  }
  if (hasAuthoredQuarterlyReviewContent(calendarRow)) {
    for (let q = 1; q <= 4; q++) {
      if (q === calendarQuarter) continue
      const row = byQuarter.get(q)
      if (!row) return { ok: true, vaultQuarter: q }
      if (isPeriodReviewCacheOnlyRow(row)) return { ok: true, vaultQuarter: q }
    }
    return { ok: false, reason: 'migration_required' }
  }

  return { ok: true, vaultQuarter: calendarQuarter }
}

/** Same vault resolution as `saveCachedPeriodReview` (pick + reject authored form rows). */
export function resolvePeriodReviewVaultForSave(
  rows: QuarterlyReviewRowSnapshot[],
  calendarQuarter: number,
): PeriodReviewVaultPick {
  const pick = pickPeriodReviewVaultQuarter(rows, calendarQuarter)
  if (!pick.ok) return pick
  const vaultRow = rows.find((r) => r.quarter === pick.vaultQuarter)
  if (vaultRow && isFormQuarterlyReviewRow(vaultRow)) {
    return { ok: false, reason: 'migration_required' }
  }
  return pick
}

export function periodReviewCacheEntryQuotesJournal(entry: {
  sections?: { inYourWords?: string; thread?: string }
  sourceChips?: { journal?: string[] }
}): boolean {
  if (entry.sections?.inYourWords?.trim()) return true
  if (entry.sections?.thread?.trim() && entry.sourceChips?.journal?.length) return true
  if (entry.sourceChips?.journal?.length) return true
  return false
}
