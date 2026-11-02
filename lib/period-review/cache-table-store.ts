import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { cacheKey, type PeriodReviewCacheEntry, type PeriodReviewPeriod } from './cache-schema'
import { periodFor } from './periods'
import { periodReviewCacheEntryQuotesJournal } from './cache-vault'
import { isMissingPeriodReviewsTableError } from './period-reviews-table-errors'
import { periodReviewEntryFromPayload, periodReviewPayloadFromEntry } from './period-reviews-payload'

export async function probePeriodReviewsTable(): Promise<{ ok: true } | { ok: false; missing: true } | { ok: false; error: Error }> {
  const admin = createAdminSupabase()
  const { error } = await admin.from('period_reviews').select('id').limit(0)
  if (!error) return { ok: true }
  if (isMissingPeriodReviewsTableError(error)) return { ok: false, missing: true }
  return { ok: false, error: new Error(error.message ?? 'period_reviews probe failed') }
}

export async function loadTableCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewCacheEntry | null | 'missing_table'> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('period_reviews')
    .select('payload')
    .eq('user_id', userId)
    .eq('plan_year', period.planYear)
    .eq('period_kind', period.kind)
    .eq('period_index', period.index)
    .maybeSingle()

  if (error) {
    if (isMissingPeriodReviewsTableError(error)) return 'missing_table'
    throw new Error(`Failed to load period review: ${error.message}`)
  }
  if (!data) return null
  return periodReviewEntryFromPayload(data.payload)
}

export async function saveTableCachedPeriodReview(
  userId: string,
  period: PeriodReviewPeriod,
  entry: PeriodReviewCacheEntry,
): Promise<'missing_table' | void> {
  const admin = createAdminSupabase()
  const payload = periodReviewPayloadFromEntry(entry)
  const quotes_journal = periodReviewCacheEntryQuotesJournal(entry)
  const { error } = await admin.from('period_reviews').upsert(
    {
      user_id: userId,
      plan_year: period.planYear,
      period_kind: period.kind,
      period_index: period.index,
      payload,
      quotes_journal,
    },
    { onConflict: 'user_id,plan_year,period_kind,period_index' },
  )
  if (error) {
    if (isMissingPeriodReviewsTableError(error)) return 'missing_table'
    throw new Error(`Failed to cache period review: ${error.message}`)
  }
}

export async function loadTablePeriodReviewCacheStatus(
  userId: string,
  planYear: number,
): Promise<Record<string, true> | 'missing_table'> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('period_reviews')
    .select('period_kind, period_index')
    .eq('user_id', userId)
    .eq('plan_year', planYear)

  if (error) {
    if (isMissingPeriodReviewsTableError(error)) return 'missing_table'
    throw new Error(`Failed to load period review status: ${error.message}`)
  }

  const status: Record<string, true> = {}
  for (const row of data ?? []) {
    const kind = row.period_kind as 'month' | 'quarter'
    const index = row.period_index as number
    status[cacheKey(periodFor(kind, planYear, index))] = true
  }
  return status
}

export async function clearTablePeriodReviewJournalQuotes(userId: string): Promise<number | 'missing_table'> {
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('period_reviews').select('id').eq('user_id', userId).eq('quotes_journal', true)
  if (error) {
    if (isMissingPeriodReviewsTableError(error)) return 'missing_table'
    throw new Error(`Failed to load period reviews for consent cleanup: ${error.message}`)
  }
  const ids = (data ?? []).map((r) => r.id as string)
  if (!ids.length) return 0

  const { error: deleteError } = await admin.from('period_reviews').delete().in('id', ids)
  if (deleteError) {
    if (isMissingPeriodReviewsTableError(deleteError)) return 'missing_table'
    throw new Error(`Failed to clear journal quotes from period reviews: ${deleteError.message}`)
  }
  return ids.length
}
