import { z } from 'zod'

export const JOURNAL_MEMORY_IMPORTANCE_MIN = 1
export const JOURNAL_MEMORY_IMPORTANCE_MAX = 5

export const journalConsentStateSchema = z.object({
  include_in_insights: z.boolean(),
  include_in_stelloquy: z.boolean(),
  memory_pinned: z.boolean(),
  memory_importance: z
    .number()
    .int()
    .min(JOURNAL_MEMORY_IMPORTANCE_MIN)
    .max(JOURNAL_MEMORY_IMPORTANCE_MAX)
    .nullable(),
})

export const journalConsentInputSchema = journalConsentStateSchema.partial()

export const journalConsentCompatibilityInputSchema = journalConsentInputSchema.extend({
  oracle_memory: z.boolean().optional(),
})

export type JournalConsentInput = z.infer<typeof journalConsentInputSchema>
export type JournalConsentCompatibilityInput = z.infer<
  typeof journalConsentCompatibilityInputSchema
>

export type JournalConsentState = {
  include_in_insights: boolean
  include_in_stelloquy: boolean
  memory_pinned: boolean
  memory_importance: number | null
}

export type JournalConsentWritePlan = {
  state: JournalConsentState
  oracleMemory: boolean
  persistV2Fields: boolean
  usedLegacyStelloquyFallback: boolean
}

const PRIVATE_JOURNAL_CONSENT: JournalConsentState = {
  include_in_insights: false,
  include_in_stelloquy: false,
  memory_pinned: false,
  memory_importance: null,
}

/**
 * Resolves the dual-write boundary during the consent migration.
 *
 * With v2 disabled, only the legacy oracle_memory value is persisted so the
 * current behavior remains unchanged. With v2 enabled, explicit v2 recall
 * consent wins; an explicitly supplied legacy oracle_memory value is accepted
 * only as a Stelloquy compatibility fallback. It never grants Insights use.
 */
export function normalizeJournalConsent(
  rawInput: JournalConsentCompatibilityInput,
  v2Enabled: boolean,
): JournalConsentWritePlan {
  const input = journalConsentCompatibilityInputSchema.parse(rawInput)

  if (!v2Enabled) {
    return {
      state: { ...PRIVATE_JOURNAL_CONSENT },
      oracleMemory: input.oracle_memory ?? false,
      persistV2Fields: false,
      usedLegacyStelloquyFallback: false,
    }
  }

  const usedLegacyStelloquyFallback =
    input.include_in_stelloquy === undefined && input.oracle_memory !== undefined
  const includeInStelloquy = input.include_in_stelloquy ?? input.oracle_memory ?? false

  return {
    state: {
      include_in_insights: input.include_in_insights ?? false,
      include_in_stelloquy: includeInStelloquy,
      memory_pinned: input.memory_pinned ?? false,
      memory_importance: input.memory_importance ?? null,
    },
    oracleMemory: includeInStelloquy,
    persistV2Fields: true,
    usedLegacyStelloquyFallback,
  }
}

export function privateJournalConsentInput(): JournalConsentInput {
  return { ...PRIVATE_JOURNAL_CONSENT }
}
