import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  hasPeriodReviewCacheInSnapshot,
  isPeriodReviewCacheOnlyRow,
  isFormQuarterlyReviewRow,
  hasAuthoredQuarterlyReviewContent,
} from '@/lib/reviews/quarter-review-row'
import {
  PERIOD_REVIEW_CACHE_KEY,
  cacheKey,
  planYearQuarterForPeriodStart,
  readCacheFromStatsSnapshot,
  type PeriodReviewCacheEntry,
  type PeriodReviewCacheMap,
  type PeriodReviewPeriod,
} from './cache-schema'
import {
  consentStripJournalQuotesFromAuthoredRow,
  relocatePeriodReviewCacheOffAuthoredRows,
  stripJournalQuotesFromCacheMap,
} from './cache-snapshot'
import {
  pickPeriodReviewVaultQuarter,
  type QuarterlyReviewRowSnapshot,
} from './cache-vault'

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
export { periodReviewCacheEntryQuotesJournal, pickPeriodReviewVaultQuarter } from './cache-vault'

export class PeriodReviewCacheStorageFullError extends Error {
  constructor() {
    super(
      'All four quarterly_reviews rows for this plan year contain authored quarterly review content; period-review cache needs a dedicated storage slot (schema change required).',
    )
    this.name = 'PeriodReviewCacheStorageFullError'
  }
}

const ROW_SELECT =
  'quarter, stats_snapshot, wins, challenges, pivots, next_quarter_intentions, completed_at'

async function loadPlanYearReviewRows(userId: string, planYear: number): Promise<QuarterlyReviewRowSnapshot[]> {
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('quarterly_reviews')
    .select(ROW_SELECT)
    .eq('user_id', userId)
    .eq('plan_year', planYear)
    .gte('quarter', 1)
    .lte('quarter', 4)
  return (data ?? []) as QuarterlyReviewRowSnapshot[]
}

function findCachedEntryInMap(map: PeriodReviewCacheMap, period: PeriodReviewPeriod): PeriodReviewCacheEntry | null {
  return map[cacheKey(period)] ?? null
}

export async function loadCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewCacheEntry | null> {
  const rows = await loadPlanYearReviewRows(userId, period.planYear)
  for (const row of rows) {
    const map = readCacheFromStatsSnapshot(row.stats_snapshot)
    const hit = findCachedEntryInMap(map, period)
    if (hit) return hit
  }
  return null
}

function cacheOnlyStatsSnapshot(cache: PeriodReviewCacheMap): Record<string, unknown> {
  return { [PERIOD_REVIEW_CACHE_KEY]: cache }
}

async function relocateAuthoredPeriodReviewCacheToVault(
  userId: string,
  planYear: number,
  calendarQuarter: number,
): Promise<void> {
  const admin = createAdminSupabase()
  const before = await loadPlanYearReviewRows(userId, planYear)
  const result = relocatePeriodReviewCacheOffAuthoredRows(before, calendarQuarter)

  if (result.droppedNonJournalKeys.length) {
    console.error(
      `[period-review] No vault slot when relocating cache off authored rows (planYear=${planYear}); dropped non-journal keys: ${result.droppedNonJournalKeys.join(', ')}`,
    )
  }

  if (!result.relocatedKeys.length && !result.droppedNonJournalKeys.length) {
    return
  }

  const beforeByQuarter = new Map(before.map((r) => [r.quarter, r]))

  for (const row of result.updatedRows) {
    const prev = beforeByQuarter.get(row.quarter)
    const statsChanged =
      !prev || JSON.stringify(prev.stats_snapshot ?? null) !== JSON.stringify(row.stats_snapshot ?? null)
    if (!statsChanged) continue

    if (!prev && result.vaultQuarter === row.quarter && result.relocatedKeys.length > 0) {
      const { error } = await admin.from('quarterly_reviews').insert({
        user_id: userId,
        plan_year: planYear,
        quarter: row.quarter,
        wins: [],
        challenges: [],
        stats_snapshot: row.stats_snapshot,
      })
      if (error) {
        console.error('[period-review] Failed to insert vault row for relocated cache:', error.message)
        throw new Error(`Failed to relocate period review cache: ${error.message}`)
      }
      continue
    }

    if (!prev) continue

    const { error } = await admin
      .from('quarterly_reviews')
      .update({ stats_snapshot: row.stats_snapshot })
      .eq('user_id', userId)
      .eq('plan_year', planYear)
      .eq('quarter', row.quarter)
    if (error) {
      console.error('[period-review] Failed to update row during cache relocation:', error.message)
      throw new Error(`Failed to relocate period review cache: ${error.message}`)
    }
  }
}

export async function saveCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
  entry: PeriodReviewCacheEntry,
): Promise<void> {
  const { planYear, quarter: calendarQuarter } = planYearQuarterForPeriodStart(period.periodStart)
  const admin = createAdminSupabase()
  const rows = await loadPlanYearReviewRows(userId, planYear)
  const pick = pickPeriodReviewVaultQuarter(rows, calendarQuarter)
  if (!pick.ok) throw new PeriodReviewCacheStorageFullError()

  const vaultQuarter = pick.vaultQuarter
  const vaultRow = rows.find((r) => r.quarter === vaultQuarter)
  const cache = readCacheFromStatsSnapshot(vaultRow?.stats_snapshot ?? {})
  cache[cacheKey(period)] = entry
  const stats_snapshot = cacheOnlyStatsSnapshot(cache)

  if (vaultRow) {
    if (isFormQuarterlyReviewRow(vaultRow)) {
      throw new PeriodReviewCacheStorageFullError()
    }
    const { error } = await admin
      .from('quarterly_reviews')
      .update({ stats_snapshot })
      .eq('user_id', userId)
      .eq('plan_year', planYear)
      .eq('quarter', vaultQuarter)
    if (error) throw new Error(`Failed to cache period review: ${error.message}`)
  } else {
    const { error } = await admin.from('quarterly_reviews').insert({
      user_id: userId,
      plan_year: planYear,
      quarter: vaultQuarter,
      wins: [],
      challenges: [],
      stats_snapshot,
    })
    if (error) throw new Error(`Failed to cache period review: ${error.message}`)
  }

  await relocateAuthoredPeriodReviewCacheToVault(userId, planYear, calendarQuarter)
}

export async function loadPeriodReviewCacheStatus(
  userId: string,
  planYear: number,
): Promise<Record<string, true>> {
  const rows = await loadPlanYearReviewRows(userId, planYear)
  const status: Record<string, true> = {}
  for (const row of rows) {
    const map = readCacheFromStatsSnapshot(row.stats_snapshot)
    for (const key of Object.keys(map)) status[key] = true
  }
  return status
}

/** Removes cached period reviews that include journal-derived sections (consent withdrawal). */
export async function clearPeriodReviewJournalQuotes(userId: string): Promise<number> {
  const admin = createAdminSupabase()
  const { data: rows, error: loadError } = await admin
    .from('quarterly_reviews')
    .select('plan_year, quarter, stats_snapshot, wins, challenges, pivots, next_quarter_intentions, completed_at')
    .eq('user_id', userId)
    .gte('quarter', 1)
    .lte('quarter', 4)

  if (loadError) {
    console.error('[period-review] Failed to load quarterly_reviews for journal consent cleanup:', loadError.message)
    throw new Error(`Failed to clear journal quotes from period review cache: ${loadError.message}`)
  }

  let removed = 0
  for (const row of rows ?? []) {
    if (!hasPeriodReviewCacheInSnapshot(row.stats_snapshot)) continue
    const map = readCacheFromStatsSnapshot(row.stats_snapshot)
    const { map: nextMap, removed: stripped } = stripJournalQuotesFromCacheMap(map)
    if (stripped === 0) continue
    removed += stripped

    const snapshotRow = row as QuarterlyReviewRowSnapshot
    if (isPeriodReviewCacheOnlyRow(snapshotRow)) {
      if (Object.keys(nextMap).length === 0) {
        const { error } = await admin
          .from('quarterly_reviews')
          .delete()
          .eq('user_id', userId)
          .eq('plan_year', row.plan_year)
          .eq('quarter', row.quarter)
        if (error) {
          console.error('[period-review] Failed to delete cache-only row after consent cleanup:', error.message)
          throw new Error(`Failed to clear journal quotes from period review cache: ${error.message}`)
        }
      } else {
        const { error } = await admin
          .from('quarterly_reviews')
          .update({ stats_snapshot: cacheOnlyStatsSnapshot(nextMap) })
          .eq('user_id', userId)
          .eq('plan_year', row.plan_year)
          .eq('quarter', row.quarter)
        if (error) {
          console.error('[period-review] Failed to update cache-only row after consent cleanup:', error.message)
          throw new Error(`Failed to clear journal quotes from period review cache: ${error.message}`)
        }
      }
      continue
    }

    if (hasAuthoredQuarterlyReviewContent(snapshotRow)) {
      const { row: nextRow } = consentStripJournalQuotesFromAuthoredRow(snapshotRow)
      const { error } = await admin
        .from('quarterly_reviews')
        .update({ stats_snapshot: nextRow.stats_snapshot })
        .eq('user_id', userId)
        .eq('plan_year', row.plan_year)
        .eq('quarter', row.quarter)
      if (error) {
        console.error('[period-review] Failed to strip journal quotes from authored row cache:', error.message)
        throw new Error(`Failed to clear journal quotes from period review cache: ${error.message}`)
      }
    }
  }
  return removed
}
