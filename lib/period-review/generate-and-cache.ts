import { PeriodReviewCacheStorageFullError } from './cache-errors'
import type { PeriodReviewCacheEntry } from './cache-schema'
import type { PeriodReviewSections, PeriodReviewSourceChips } from './report-schema'

export type GeneratedPeriodReviewSummary = {
  summary: string
  sections: PeriodReviewSections
  sourceChips: PeriodReviewSourceChips
  model: string
}

export async function runPeriodReviewGeneration(opts: {
  assertVaultAvailable: () => Promise<void>
  generateSummary: () => Promise<GeneratedPeriodReviewSummary>
  saveEntry: (entry: PeriodReviewCacheEntry) => Promise<void>
  buildEntry: (generated: GeneratedPeriodReviewSummary) => PeriodReviewCacheEntry
}): Promise<
  | { ok: true; entry: PeriodReviewCacheEntry }
  | { ok: false; reason: 'storage_full' }
> {
  try {
    await opts.assertVaultAvailable()
  } catch (e) {
    if (e instanceof PeriodReviewCacheStorageFullError) {
      return { ok: false, reason: 'storage_full' }
    }
    throw e
  }

  const generated = await opts.generateSummary()
  const entry = opts.buildEntry(generated)
  await opts.saveEntry(entry)
  return { ok: true, entry }
}
