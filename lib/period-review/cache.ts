import 'server-only'

import {
  planYearQuarterForPeriodStart,
  type PeriodReviewCacheEntry,
  type PeriodReviewPeriod,
} from './cache-schema'
import {
  clearLegacyPeriodReviewJournalQuotes,
  legacyVaultAvailable,
  loadLegacyCachedPeriodReview,
  loadLegacyPeriodReviewCacheStatus,
  loadPlanYearReviewRows,
  saveLegacyCachedPeriodReview,
} from './cache-legacy-vault'
import {
  clearTablePeriodReviewJournalQuotes,
  loadTableCachedPeriodReview,
  loadTablePeriodReviewCacheStatus,
  saveTableCachedPeriodReview,
} from './cache-table-store'
import { getPeriodReviewStorageBackend } from './cache-storage-mode'
import { PeriodReviewCacheStorageFullError } from './cache-errors'

export {
  PERIOD_REVIEW_CACHE_KEY,
  mergeStatsSnapshotPreserveCache,
  readCacheFromStatsSnapshot,
} from './cache-schema'
export type { PeriodReviewCacheEntry, PeriodReviewCacheMap } from './cache-schema'
export {
  consentStripJournalQuotesFromAuthoredRow,
  relocatePeriodReviewCacheOffAuthoredRows,
  statsSnapshotWithPeriodReviewCache,
  stripJournalQuotesFromCacheMap,
} from './cache-snapshot'
export {
  periodReviewCacheEntryQuotesJournal,
  pickPeriodReviewVaultQuarter,
  resolvePeriodReviewVaultForSave,
} from './cache-vault'
export { PeriodReviewCacheStorageFullError } from './cache-errors'
export {
  isMissingPeriodReviewsTableError,
  periodReviewVaultAvailableForStorage,
  resolvePeriodReviewStorageBackend,
} from './period-reviews-table-errors'
export { resetPeriodReviewStorageBackendCacheForTests } from './cache-storage-mode'

export async function loadCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewCacheEntry | null> {
  const backend = await getPeriodReviewStorageBackend()
  if (backend === 'table') {
    const tableHit = await loadTableCachedPeriodReview(userId, period)
    if (tableHit === 'missing_table') {
      return loadLegacyCachedPeriodReview(userId, period)
    }
    if (tableHit) return tableHit
    return loadLegacyCachedPeriodReview(userId, period)
  }
  return loadLegacyCachedPeriodReview(userId, period)
}

export async function isPeriodReviewVaultAvailable(userId: string, period: PeriodReviewPeriod): Promise<boolean> {
  const backend = await getPeriodReviewStorageBackend()
  if (backend === 'table') return true
  const { planYear, quarter: calendarQuarter } = planYearQuarterForPeriodStart(period.periodStart)
  const rows = await loadPlanYearReviewRows(userId, planYear)
  return legacyVaultAvailable(rows, calendarQuarter)
}

export async function assertPeriodReviewVaultAvailable(userId: string, period: PeriodReviewPeriod): Promise<void> {
  const available = await isPeriodReviewVaultAvailable(userId, period)
  if (!available) throw new PeriodReviewCacheStorageFullError()
}

export async function saveCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
  entry: PeriodReviewCacheEntry,
): Promise<void> {
  const backend = await getPeriodReviewStorageBackend()
  if (backend === 'table') {
    const missing = await saveTableCachedPeriodReview(userId, period, entry)
    if (missing !== 'missing_table') return
  }
  const { planYear, quarter: calendarQuarter } = planYearQuarterForPeriodStart(period.periodStart)
  await saveLegacyCachedPeriodReview(userId, period, entry, planYear, calendarQuarter)
}

export async function loadPeriodReviewCacheStatus(
  userId: string,
  planYear: number,
): Promise<Record<string, true>> {
  const backend = await getPeriodReviewStorageBackend()
  const status: Record<string, true> = {}
  if (backend === 'table') {
    const tableStatus = await loadTablePeriodReviewCacheStatus(userId, planYear)
    if (tableStatus !== 'missing_table') {
      Object.assign(status, tableStatus)
    }
  }
  const legacyStatus = await loadLegacyPeriodReviewCacheStatus(userId, planYear)
  Object.assign(status, legacyStatus)
  return status
}

/** Removes cached period reviews that include journal-derived sections (consent withdrawal). */
export async function clearPeriodReviewJournalQuotes(userId: string): Promise<number> {
  let removed = 0
  const backend = await getPeriodReviewStorageBackend()
  if (backend === 'table') {
    const tableRemoved = await clearTablePeriodReviewJournalQuotes(userId)
    if (tableRemoved !== 'missing_table') {
      removed += tableRemoved
    }
  }
  removed += await clearLegacyPeriodReviewJournalQuotes(userId)
  return removed
}
