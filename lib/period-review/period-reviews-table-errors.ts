export type PeriodReviewsTableErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
}

/** True when Postgres/PostgREST reports the period_reviews relation is missing. */
export function isMissingPeriodReviewsTableError(error: PeriodReviewsTableErrorLike | null | undefined): boolean {
  if (!error) return false
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()
  const details = (error.details ?? '').toLowerCase()
  if (code === '42P01') return true
  if (code === 'PGRST205') return true
  if (message.includes('period_reviews') && (message.includes('does not exist') || message.includes('could not find'))) {
    return true
  }
  if (details.includes('period_reviews')) return true
  return false
}

export type PeriodReviewStorageBackend = 'table' | 'legacy'

export function resolvePeriodReviewStorageBackend(
  probeError: PeriodReviewsTableErrorLike | null | undefined,
): PeriodReviewStorageBackend {
  if (isMissingPeriodReviewsTableError(probeError)) return 'legacy'
  if (probeError) {
    throw new Error(`period_reviews probe failed: ${probeError.message ?? probeError.code ?? 'unknown'}`)
  }
  return 'table'
}

export function periodReviewVaultAvailableForStorage(
  storage: PeriodReviewStorageBackend,
  vaultPickOk: boolean,
): boolean {
  if (storage === 'table') return true
  return vaultPickOk
}
