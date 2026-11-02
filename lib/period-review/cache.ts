import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  hasPeriodReviewCacheInSnapshot,
  isPeriodReviewCacheOnlyRow,
  isFormQuarterlyReviewRow,
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
  periodReviewCacheEntryQuotesJournal,
  pickPeriodReviewVaultQuarter,
  type QuarterlyReviewRowSnapshot,
} from './cache-vault'

export {
  PERIOD_REVIEW_CACHE_KEY,
  mergeStatsSnapshotPreserveCache,
  readCacheFromStatsSnapshot,
} from './cache-schema'
export type { PeriodReviewCacheEntry, PeriodReviewCacheMap } from './cache-schema'
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

async function stripPeriodReviewCacheFromAuthoredRows(userId: string, planYear: number): Promise<void> {
  const admin = createAdminSupabase()
  const rows = await loadPlanYearReviewRows(userId, planYear)
  for (const row of rows) {
    if (!isFormQuarterlyReviewRow(row)) continue
    if (!hasPeriodReviewCacheInSnapshot(row.stats_snapshot)) continue
    const base =
      row.stats_snapshot && typeof row.stats_snapshot === 'object' && !Array.isArray(row.stats_snapshot)
        ? { ...(row.stats_snapshot as Record<string, unknown>) }
        : {}
    delete base[PERIOD_REVIEW_CACHE_KEY]
    await admin
      .from('quarterly_reviews')
      .update({ stats_snapshot: base })
      .eq('user_id', userId)
      .eq('plan_year', planYear)
      .eq('quarter', row.quarter)
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

  await stripPeriodReviewCacheFromAuthoredRows(userId, planYear)
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
  const { data: rows } = await admin
    .from('quarterly_reviews')
    .select('plan_year, quarter, stats_snapshot, wins, challenges, pivots, next_quarter_intentions, completed_at')
    .eq('user_id', userId)
    .gte('quarter', 1)
    .lte('quarter', 4)

  let removed = 0
  for (const row of rows ?? []) {
    if (!hasPeriodReviewCacheInSnapshot(row.stats_snapshot)) continue
    const map = readCacheFromStatsSnapshot(row.stats_snapshot)
    let changed = false
    for (const [key, entry] of Object.entries(map)) {
      if (periodReviewCacheEntryQuotesJournal(entry)) {
        delete map[key]
        removed += 1
        changed = true
      }
    }
    if (!changed) continue

    const snapshotRow = row as QuarterlyReviewRowSnapshot
    if (isPeriodReviewCacheOnlyRow(snapshotRow)) {
      if (Object.keys(map).length === 0) {
        await admin
          .from('quarterly_reviews')
          .delete()
          .eq('user_id', userId)
          .eq('plan_year', row.plan_year)
          .eq('quarter', row.quarter)
      } else {
        await admin
          .from('quarterly_reviews')
          .update({ stats_snapshot: cacheOnlyStatsSnapshot(map) })
          .eq('user_id', userId)
          .eq('plan_year', row.plan_year)
          .eq('quarter', row.quarter)
      }
      continue
    }
  }
  return removed
}
