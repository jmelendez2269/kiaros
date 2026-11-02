import { PERIOD_REVIEW_CACHE_KEY, readCacheFromStatsSnapshot, type PeriodReviewCacheMap } from './cache-schema'
import { periodReviewCacheEntryQuotesJournal, pickPeriodReviewVaultQuarter, type QuarterlyReviewRowSnapshot } from './cache-vault'
import { hasAuthoredQuarterlyReviewContent, isPeriodReviewCacheOnlyRow } from '@/lib/reviews/quarter-review-row'

/** Updates only `stats_snapshot.periodReviewCache`; preserves every other snapshot key. */
export function statsSnapshotWithPeriodReviewCache(
  stats: unknown,
  cache: PeriodReviewCacheMap | null,
): Record<string, unknown> {
  const base =
    stats && typeof stats === 'object' && !Array.isArray(stats)
      ? { ...(stats as Record<string, unknown>) }
      : {}
  if (cache === null || Object.keys(cache).length === 0) {
    delete base[PERIOD_REVIEW_CACHE_KEY]
  } else {
    base[PERIOD_REVIEW_CACHE_KEY] = cache
  }
  return base
}

export function stripJournalQuotesFromCacheMap(map: PeriodReviewCacheMap): {
  map: PeriodReviewCacheMap
  removed: number
} {
  const next: PeriodReviewCacheMap = { ...map }
  let removed = 0
  for (const [key, entry] of Object.entries(next)) {
    if (periodReviewCacheEntryQuotesJournal(entry)) {
      delete next[key]
      removed += 1
    }
  }
  return { map: next, removed }
}

export function consentStripJournalQuotesFromAuthoredRow(row: QuarterlyReviewRowSnapshot): {
  row: QuarterlyReviewRowSnapshot
  removed: number
} {
  if (!hasAuthoredQuarterlyReviewContent(row)) {
    return { row, removed: 0 }
  }
  const map = readCacheFromStatsSnapshot(row.stats_snapshot)
  if (!Object.keys(map).length) return { row, removed: 0 }

  const { map: nextMap, removed } = stripJournalQuotesFromCacheMap(map)
  const stats_snapshot = statsSnapshotWithPeriodReviewCache(
    row.stats_snapshot,
    Object.keys(nextMap).length ? nextMap : null,
  )
  return {
    row: { ...row, stats_snapshot },
    removed,
  }
}

function cacheOnlyStatsSnapshot(cache: PeriodReviewCacheMap): Record<string, unknown> {
  return { [PERIOD_REVIEW_CACHE_KEY]: cache }
}

/**
 * Pure relocation: pull periodReviewCache off authored rows into a vault quarter.
 * Used when saving new cache entries and during tests.
 */
export function relocatePeriodReviewCacheOffAuthoredRows(
  rows: QuarterlyReviewRowSnapshot[],
  calendarQuarter: number,
): {
  updatedRows: QuarterlyReviewRowSnapshot[]
  vaultQuarter: number | null
  relocatedKeys: string[]
  droppedNonJournalKeys: string[]
} {
  const updatedRows: QuarterlyReviewRowSnapshot[] = rows.map((row) => ({
    ...row,
    stats_snapshot:
      row.stats_snapshot && typeof row.stats_snapshot === 'object'
        ? JSON.parse(JSON.stringify(row.stats_snapshot))
        : row.stats_snapshot,
  }))

  let toRelocate: PeriodReviewCacheMap = {}
  for (const row of updatedRows) {
    if (!hasAuthoredQuarterlyReviewContent(row)) continue
    const map = readCacheFromStatsSnapshot(row.stats_snapshot)
    if (!Object.keys(map).length) continue
    toRelocate = { ...toRelocate, ...map }
    row.stats_snapshot = statsSnapshotWithPeriodReviewCache(row.stats_snapshot, null)
  }

  if (!Object.keys(toRelocate).length) {
    return { updatedRows, vaultQuarter: null, relocatedKeys: [], droppedNonJournalKeys: [] }
  }

  const pick = pickPeriodReviewVaultQuarter(updatedRows, calendarQuarter)
  if (!pick.ok) {
    const droppedNonJournalKeys: string[] = []
    for (const [key, entry] of Object.entries(toRelocate)) {
      if (!periodReviewCacheEntryQuotesJournal(entry)) {
        droppedNonJournalKeys.push(key)
        delete toRelocate[key]
      }
    }
    return { updatedRows, vaultQuarter: null, relocatedKeys: [], droppedNonJournalKeys }
  }

  const vaultQuarter = pick.vaultQuarter
  let vaultRow = updatedRows.find((r) => r.quarter === vaultQuarter)
  const existingVaultCache = vaultRow ? readCacheFromStatsSnapshot(vaultRow.stats_snapshot) : {}
  const merged: PeriodReviewCacheMap = { ...existingVaultCache, ...toRelocate }

  if (vaultRow) {
    if (isPeriodReviewCacheOnlyRow(vaultRow)) {
      vaultRow.stats_snapshot = cacheOnlyStatsSnapshot(merged)
    } else {
      vaultRow.stats_snapshot = statsSnapshotWithPeriodReviewCache(vaultRow.stats_snapshot, merged)
    }
  } else {
    vaultRow = {
      quarter: vaultQuarter,
      wins: [],
      challenges: [],
      pivots: null,
      next_quarter_intentions: null,
      completed_at: null,
      stats_snapshot: cacheOnlyStatsSnapshot(merged),
    }
    updatedRows.push(vaultRow)
  }

  return {
    updatedRows,
    vaultQuarter,
    relocatedKeys: Object.keys(toRelocate),
    droppedNonJournalKeys: [],
  }
}
