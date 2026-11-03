import type { JournalConsentState } from '@/lib/journal/consent'

export type JournalMemoryMode = 'use_entries' | 'choose_each'

export type JournalMemorySettings = {
  journal_memory_mode: JournalMemoryMode | null
  default_include_in_insights: boolean | null
  default_include_in_stelloquy: boolean | null
  memory_mode_prompted_at: string | null
  past_entries_included_at: string | null
}

export const STRICT_CHOOSE_EACH_DEFAULTS = {
  default_include_in_insights: false,
  default_include_in_stelloquy: false,
} as const

export const USE_ENTRIES_PRESET_DEFAULTS = {
  default_include_in_insights: true,
  default_include_in_stelloquy: true,
} as const

/**
 * NULL journal_memory_mode (never chosen) behaves as use-entries: new entries
 * start included, and each entry can still be kept private. Users who chose
 * "choose each" keep strict all-off defaults. Existing entries are never changed
 * by this default; only the explicit past-entries prompt does that.
 */
export function effectiveJournalMemoryMode(
  mode: JournalMemoryMode | null | undefined,
): JournalMemoryMode {
  return mode ?? 'use_entries'
}

export function resolvedDefaultToggles(
  settings: Pick<
    JournalMemorySettings,
    'journal_memory_mode' | 'default_include_in_insights' | 'default_include_in_stelloquy'
  >,
  hasOracleAccess: boolean,
): { include_in_insights: boolean; include_in_stelloquy: boolean } {
  const mode = effectiveJournalMemoryMode(settings.journal_memory_mode)
  if (mode === 'choose_each') {
    return { include_in_insights: false, include_in_stelloquy: false }
  }

  const insights =
    settings.default_include_in_insights ?? USE_ENTRIES_PRESET_DEFAULTS.default_include_in_insights
  const stelloquy = hasOracleAccess
    ? (settings.default_include_in_stelloquy ??
      USE_ENTRIES_PRESET_DEFAULTS.default_include_in_stelloquy)
    : false

  return { include_in_insights: insights, include_in_stelloquy: stelloquy }
}

export type JournalMemoryPresetSelection = 'use_entries' | 'choose_each' | 'custom' | null

export function matchJournalMemoryPreset(
  settings: Pick<
    JournalMemorySettings,
    'journal_memory_mode' | 'default_include_in_insights' | 'default_include_in_stelloquy'
  >,
  hasOracleAccess: boolean,
): JournalMemoryPresetSelection {
  // Never chosen: behaves as use-entries (see effectiveJournalMemoryMode).
  if (settings.journal_memory_mode === null) return 'use_entries'

  const toggles = {
    insights: settings.default_include_in_insights ?? false,
    stelloquy: settings.default_include_in_stelloquy ?? false,
  }

  const chooseEach =
    settings.journal_memory_mode === 'choose_each' &&
    toggles.insights === false &&
    toggles.stelloquy === false
  if (chooseEach) return 'choose_each'

  const useEntriesOracle =
    settings.journal_memory_mode === 'use_entries' &&
    toggles.insights === true &&
    toggles.stelloquy === true
  const useEntriesPlanner =
    settings.journal_memory_mode === 'use_entries' &&
    toggles.insights === true &&
    toggles.stelloquy === false &&
    !hasOracleAccess

  if (useEntriesOracle || useEntriesPlanner) return 'use_entries'

  return 'custom'
}

/**
 * Initial consent for a new journal entry when memory defaults are enabled.
 * Explicit per-entry input from the client always wins field-by-field.
 */
export function resolveNewEntryConsent(
  settings: JournalMemorySettings,
  hasOracleAccess: boolean,
  explicit: Partial<JournalConsentState> | undefined,
): JournalConsentState {
  const defaults = resolvedDefaultToggles(settings, hasOracleAccess)
  return {
    include_in_insights: explicit?.include_in_insights ?? defaults.include_in_insights,
    include_in_stelloquy: explicit?.include_in_stelloquy ?? defaults.include_in_stelloquy,
    memory_pinned: explicit?.memory_pinned ?? false,
    memory_importance: explicit?.memory_importance ?? null,
  }
}
