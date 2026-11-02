import type { PeriodReviewCacheEntry } from './cache-schema'
import type { PeriodReviewSections, PeriodReviewSourceChips } from './report-schema'

export function periodReviewEntryFromPayload(payload: unknown): PeriodReviewCacheEntry | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const v = payload as Record<string, unknown>
  if (typeof v.summary !== 'string' || typeof v.generatedAt !== 'string') return null
  return {
    summary: v.summary,
    generatedAt: v.generatedAt,
    model: typeof v.model === 'string' ? v.model : 'unknown',
    regenerations: typeof v.regenerations === 'number' ? v.regenerations : 0,
    sections:
      v.sections && typeof v.sections === 'object' && !Array.isArray(v.sections)
        ? (v.sections as PeriodReviewSections)
        : undefined,
    sourceChips:
      v.sourceChips && typeof v.sourceChips === 'object' && !Array.isArray(v.sourceChips)
        ? (v.sourceChips as PeriodReviewSourceChips)
        : undefined,
  }
}

export function periodReviewPayloadFromEntry(entry: PeriodReviewCacheEntry): Record<string, unknown> {
  return {
    summary: entry.summary,
    generatedAt: entry.generatedAt,
    model: entry.model,
    regenerations: entry.regenerations,
    ...(entry.sections ? { sections: entry.sections } : {}),
    ...(entry.sourceChips ? { sourceChips: entry.sourceChips } : {}),
  }
}
