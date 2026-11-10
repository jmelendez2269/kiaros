import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import type { EphemerisDay } from '@/types/blueprint'
import type { PeriodReviewPeriod } from './periods'
import {
  RETURNING_PATTERN_MIN_ENTRIES,
  selectReturningPatterns,
  selectReturningThemes,
  type PatternRowForThreads,
  type ReturningThreads,
} from './returning-threads'

/**
 * Loads what the look back may name as a return. Pattern rows are already
 * limited by the database to entries the member includes in Insights; topics
 * are limited here to captures saved for Insights.
 */
export async function loadReturningThreads(
  userId: string,
  period: PeriodReviewPeriod,
  days: EphemerisDay[],
): Promise<ReturningThreads> {
  const admin = createAdminSupabase()
  const from = `${period.periodStart}T00:00:00Z`, to = `${period.periodEnd}T23:59:59Z`
  const [patternsRes, periodTopicsRes] = await Promise.all([
    admin
      .from('user_pattern_insights')
      .select('pattern_type, pattern_key, sample_size, first_seen, last_seen, evidence')
      .eq('user_id', userId)
      .gte('sample_size', RETURNING_PATTERN_MIN_ENTRIES),
    admin
      .from('capture_topics')
      .select('capture_id, kind, label, oracle_captures!inner(include_in_insights)')
      .eq('user_id', userId)
      .in('kind', ['theme', 'mood'])
      .eq('oracle_captures.include_in_insights', true)
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(500),
  ])
  if (patternsRes.error) throw new Error(`Failed to load patterns: ${patternsRes.error.message}`)
  if (periodTopicsRes.error) throw new Error(`Failed to load capture topics: ${periodTopicsRes.error.message}`)

  const periodTopics = (periodTopicsRes.data ?? []).map((row) => ({ capture_id: String(row.capture_id), kind: String(row.kind), label: String(row.label) }))
  const labels = [...new Set(periodTopics.map((t) => t.label))]
  const overall = new Map<string, number>()
  if (labels.length) {
    const overallRes = await admin
      .from('capture_topics')
      .select('capture_id, kind, label, oracle_captures!inner(include_in_insights)')
      .eq('user_id', userId)
      .in('kind', ['theme', 'mood'])
      .in('label', labels)
      .eq('oracle_captures.include_in_insights', true)
      .lte('created_at', to)
      .limit(5000)
    if (overallRes.error) throw new Error(`Failed to load capture topics: ${overallRes.error.message}`)
    const seen = new Set<string>()
    for (const row of overallRes.data ?? []) {
      const key = `${row.kind}:${row.label}`, once = `${key}|${row.capture_id}`
      if (seen.has(once)) continue
      seen.add(once)
      overall.set(key, (overall.get(key) ?? 0) + 1)
    }
  }

  return {
    patterns: selectReturningPatterns((patternsRes.data ?? []) as PatternRowForThreads[], days, period),
    themes: selectReturningThemes(periodTopics, overall),
  }
}
