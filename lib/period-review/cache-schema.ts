import { planYearQuarterForPeriodStart, cacheKey, type PeriodReviewPeriod } from './periods'

export const PERIOD_REVIEW_CACHE_KEY = 'periodReviewCache'

export interface PeriodReviewCacheEntry {
  summary: string
  generatedAt: string
  model: string
  regenerations: number
}

export type PeriodReviewCacheMap = Record<string, PeriodReviewCacheEntry>

export function readCacheFromStatsSnapshot(raw: unknown): PeriodReviewCacheMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const nested = (raw as Record<string, unknown>)[PERIOD_REVIEW_CACHE_KEY]
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return {}
  const out: PeriodReviewCacheMap = {}
  for (const [key, value] of Object.entries(nested)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Record<string, unknown>
    if (typeof v.summary !== 'string' || typeof v.generatedAt !== 'string') continue
    out[key] = {
      summary: v.summary,
      generatedAt: v.generatedAt,
      model: typeof v.model === 'string' ? v.model : 'unknown',
      regenerations: typeof v.regenerations === 'number' ? v.regenerations : 0,
    }
  }
  return out
}

export function mergeStatsSnapshotPreserveCache(
  existing: unknown,
  statsUpdate: Record<string, number>,
): Record<string, unknown> {
  const cache = readCacheFromStatsSnapshot(existing)
  return {
    ...statsUpdate,
    ...(Object.keys(cache).length ? { [PERIOD_REVIEW_CACHE_KEY]: cache } : {}),
  }
}

export { cacheKey, planYearQuarterForPeriodStart }
export type { PeriodReviewPeriod }
