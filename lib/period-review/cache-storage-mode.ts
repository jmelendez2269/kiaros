import 'server-only'

import type { PeriodReviewStorageBackend } from './period-reviews-table-errors'
import { probePeriodReviewsTable } from './cache-table-store'

let cachedBackend: PeriodReviewStorageBackend | null = null

export async function getPeriodReviewStorageBackend(): Promise<PeriodReviewStorageBackend> {
  if (cachedBackend) return cachedBackend
  const probe = await probePeriodReviewsTable()
  if (probe.ok) {
    cachedBackend = 'table'
    return cachedBackend
  }
  if (!probe.ok && 'missing' in probe && probe.missing) {
    cachedBackend = 'legacy'
    return cachedBackend
  }
  if (!probe.ok && 'error' in probe) {
    throw probe.error
  }
  throw new Error('period_reviews probe failed')
}

/** Test hook: reset cached probe result between unit tests in the same process. */
export function resetPeriodReviewStorageBackendCacheForTests(): void {
  cachedBackend = null
}
