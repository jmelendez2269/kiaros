import type { Json, Tables } from '@/types/database'

export type PatternInsightForStelloquyPrompt = Pick<
  Tables<'user_pattern_insights'>,
  | 'pattern_type'
  | 'pattern_key'
  | 'sample_size'
  | 'confidence'
  | 'first_seen'
  | 'last_seen'
  | 'summary'
  | 'evidence'
>

type ParsedEvidenceRow = {
  entry_id: string
  entry_date: string
  title: string | null
}

/** Evidence rows stored on `user_pattern_insights.evidence` (shared shape with Insights UI). */
export function parsePatternInsightEvidence(value: Json): ParsedEvidenceRow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const entryId = typeof record.entry_id === 'string' ? record.entry_id : null
    const entryDate = typeof record.entry_date === 'string' ? record.entry_date : null
    if (!entryId || !entryDate) return []
    const title = typeof record.title === 'string' ? record.title : null
    return [{ entry_id: entryId, entry_date: entryDate, title }]
  })
}

export function collectPatternEvidenceEntryIds(patterns: PatternInsightForStelloquyPrompt[]): string[] {
  const ids = new Set<string>()
  for (const pattern of patterns) {
    for (const row of parsePatternInsightEvidence(pattern.evidence)) {
      ids.add(row.entry_id)
    }
  }
  return Array.from(ids)
}

/**
 * Stelloquy may only see pattern evidence from journal entries the member marked
 * for recall (`include_in_stelloquy`). Patterns are built from Insights consent;
 * without this filter, Kairos-only entry titles leak into the Oracle prompt.
 *
 * Safer rule: if no evidence row survives filtering, drop the whole pattern
 * (summary text is synthesized from the same Insights pool and may paraphrase
 * entries the member excluded from Stelloquy).
 */
export function filterPatternInsightsForStelloquy(
  patterns: PatternInsightForStelloquyPrompt[],
  stelloquyConsentedEntryIds: ReadonlySet<string>,
): PatternInsightForStelloquyPrompt[] {
  return patterns.flatMap((pattern) => {
    const parsed = parsePatternInsightEvidence(pattern.evidence)
    if (parsed.length === 0) {
      return [pattern]
    }

    const kept = parsed.filter((row) => stelloquyConsentedEntryIds.has(row.entry_id))
    if (kept.length === 0) {
      return []
    }

    const filteredEvidence: Json = kept.map((row) => ({
      entry_id: row.entry_id,
      entry_date: row.entry_date,
      title: row.title,
    }))

    return [{ ...pattern, evidence: filteredEvidence }]
  })
}
