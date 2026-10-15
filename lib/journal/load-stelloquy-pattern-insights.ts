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
  patterns: PatternInsightForStelloquyPrompt[],
): Promise<PatternInsightForStelloquyPrompt[]> {
  const evidenceEntryIds = collectPatternEvidenceEntryIds(patterns)
  if (evidenceEntryIds.length === 0) {
    return patterns
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('include_in_stelloquy', true)
    .in('id', evidenceEntryIds)

  if (error) {
    throw new Error('Failed to load Stelloquy-consented journal entries for pattern evidence')
  }

  const allowed = new Set((data ?? []).map((row) => row.id))
  return filterPatternInsightsForStelloquy(patterns, allowed)
}
