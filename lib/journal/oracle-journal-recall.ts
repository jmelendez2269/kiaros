import type { RecalledMemory } from '@/lib/journal/memory-retrieval'
import type { Tables } from '@/types/database'

export type OracleJournalPromptEntry = Pick<
  Tables<'journal_entries'>,
  'entry_date' | 'title' | 'body' | 'mood_tag' | 'is_ritual'
>

/**
 * Chooses journal entries for the Stelloquy system prompt.
 * When relevance recall is enabled but returns nothing (empty or skipped), falls back to
 * the caller's pre-filtered recent allowed entries (same as relevance-off behavior).
 */
export function resolveOracleJournalEntriesForPrompt(
  relevanceMemoryEnabled: boolean,
  recalledMemories: RecalledMemory[] | null,
  recentAllowedEntries: OracleJournalPromptEntry[] | null | undefined,
): { entries: OracleJournalPromptEntry[]; relevanceSources: RecalledMemory[] | null } {
  const recent = recentAllowedEntries ?? []

  if (!relevanceMemoryEnabled) {
    return { entries: recent, relevanceSources: null }
  }

  if (recalledMemories && recalledMemories.length > 0) {
    return { entries: recalledMemories, relevanceSources: recalledMemories }
  }

  return { entries: recent, relevanceSources: null }
}
