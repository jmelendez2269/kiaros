import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  PERIOD_REVIEW_CACHE_KEY,
  cacheKey,
  planYearQuarterForPeriodStart,
  readCacheFromStatsSnapshot,
  type PeriodReviewCacheEntry,
  type PeriodReviewPeriod,
} from './cache-schema'

export {
  PERIOD_REVIEW_CACHE_KEY,
  mergeStatsSnapshotPreserveCache,
  readCacheFromStatsSnapshot,
} from './cache-schema'
export type { PeriodReviewCacheEntry, PeriodReviewCacheMap } from './cache-schema'

export async function loadCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewCacheEntry | null> {
  const { planYear, quarter } = planYearQuarterForPeriodStart(period.periodStart)
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('quarterly_reviews')
    .select('stats_snapshot')
    .eq('user_id', userId)
    .eq('plan_year', planYear)
    .eq('quarter', quarter)
    .maybeSingle()
  if (!data?.stats_snapshot) return null
  const map = readCacheFromStatsSnapshot(data.stats_snapshot)
  return map[cacheKey(period)] ?? null
}

export async function saveCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
  entry: PeriodReviewCacheEntry,
): Promise<void> {
  const { planYear, quarter } = planYearQuarterForPeriodStart(period.periodStart)
  const admin = createAdminSupabase()
  const { data: existing } = await admin
    .from('quarterly_reviews')
    .select('stats_snapshot, wins, challenges, completed_at')
    .eq('user_id', userId)
    .eq('plan_year', planYear)
    .eq('quarter', quarter)
    .maybeSingle()

  const priorStats = existing?.stats_snapshot ?? {}
  const cache = readCacheFromStatsSnapshot(priorStats)
  cache[cacheKey(period)] = entry

  const baseStats =
    priorStats && typeof priorStats === 'object' && !Array.isArray(priorStats)
      ? { ...(priorStats as Record<string, unknown>) }
      : {}
  delete baseStats[PERIOD_REVIEW_CACHE_KEY]

  const stats_snapshot = {
    ...baseStats,
    [PERIOD_REVIEW_CACHE_KEY]: cache,
  }

  if (existing) {
    const { error } = await admin
      .from('quarterly_reviews')
      .update({ stats_snapshot })
      .eq('user_id', userId)
      .eq('plan_year', planYear)
      .eq('quarter', quarter)
    if (error) throw new Error(`Failed to cache period review: ${error.message}`)
    return
  }

  const { error } = await admin.from('quarterly_reviews').insert({
    user_id: userId,
    plan_year: planYear,
    quarter,
    wins: [],
    challenges: [],
    stats_snapshot,
  })
  if (error) throw new Error(`Failed to cache period review: ${error.message}`)
}
