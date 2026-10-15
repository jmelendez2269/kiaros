import type { SupabaseClient } from '@supabase/supabase-js'

import {
  collectPatternEvidenceEntryIds,
  filterPatternInsightsForStelloquy,
  type PatternInsightForStelloquyPrompt,
} from '@/lib/journal/stelloquy-pattern-context'
import type { Database } from '@/types/database'

/**
 * Loads pattern rows for the Oracle prompt and applies Stelloquy recall consent
 * to embedded evidence (titles, dates, entry ids).
 */
export async function loadStelloquyPatternInsightsForPrompt(
  supabase: SupabaseClient<Database>,
  userId: string,
  patterns: PatternInsightForStelloquyPrompt[],
  logContext = 'oracle',
): Promise<PatternInsightForStelloquyPrompt[]> {
  const evidenceEntryIds = collectPatternEvidenceEntryIds(patterns)
  if (evidenceEntryIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('include_in_stelloquy', true)
    .in('id', evidenceEntryIds)

  if (error) {
    console.error(
      `[${logContext}] Stelloquy pattern evidence consent lookup failed; omitting patterns:`,
      error,
    )
    return []
  }

  const allowed = new Set((data ?? []).map((row) => row.id))
  return filterPatternInsightsForStelloquy(patterns, allowed)
}
