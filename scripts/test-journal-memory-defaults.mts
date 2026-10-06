/**
 * Unit tests for KIAROS_MEMORY_DEFAULTS journal memory resolution and audit helpers.
 */

import assert from 'node:assert/strict'
import {
  effectiveJournalMemoryMode,
  matchJournalMemoryPreset,
  resolveNewEntryConsent,
  resolvedDefaultToggles,
} from '../lib/journal/memory-defaults.ts'
import { heuristicMemoryImportance } from '../lib/journal/memory-importance-heuristic.ts'
import { applyMemoryImportanceHeuristicIfNeeded } from '../lib/journal/consent-persist.ts'
import {
  entryIdsWithManualInsightsChange,
  entryIdsWithManualStelloquyChange,
} from '../lib/journal/consent-manual-changes.ts'
import { normalizeJournalConsent } from '../lib/journal/consent.ts'
import { readFile } from 'node:fs/promises'

console.log('=== Journal memory defaults tests ===\n')

assert.equal(effectiveJournalMemoryMode(null), 'choose_each')
assert.equal(effectiveJournalMemoryMode(undefined), 'choose_each')

const strict = resolvedDefaultToggles(
  { journal_memory_mode: null, default_include_in_insights: null, default_include_in_stelloquy: null },
  true,
)
assert.deepEqual(strict, { include_in_insights: false, include_in_stelloquy: false })

const useEntriesOracle = resolvedDefaultToggles(
  {
    journal_memory_mode: 'use_entries',
    default_include_in_insights: true,
    default_include_in_stelloquy: true,
  },
  true,
)
assert.deepEqual(useEntriesOracle, { include_in_insights: true, include_in_stelloquy: true })

const useEntriesPlanner = resolvedDefaultToggles(
  {
    journal_memory_mode: 'use_entries',
    default_include_in_insights: true,
    default_include_in_stelloquy: true,
  },
  false,
)
assert.deepEqual(useEntriesPlanner, { include_in_insights: true, include_in_stelloquy: false })

const fineTuneOff = resolvedDefaultToggles(
  {
    journal_memory_mode: 'use_entries',
    default_include_in_insights: false,
    default_include_in_stelloquy: false,
  },
  true,
)
assert.deepEqual(fineTuneOff, { include_in_insights: false, include_in_stelloquy: false })

const newEntry = resolveNewEntryConsent(
  {
    journal_memory_mode: 'use_entries',
    default_include_in_insights: true,
    default_include_in_stelloquy: true,
    memory_mode_prompted_at: '2026-01-01',
    past_entries_included_at: null,
  },
  false,
  undefined,
)
assert.equal(newEntry.include_in_insights, true)
assert.equal(newEntry.include_in_stelloquy, false)

const override = resolveNewEntryConsent(
  {
    journal_memory_mode: 'use_entries',
    default_include_in_insights: true,
    default_include_in_stelloquy: true,
    memory_mode_prompted_at: '2026-01-01',
    past_entries_included_at: null,
  },
  true,
  { include_in_insights: false },
)
assert.equal(override.include_in_insights, false)
assert.equal(override.include_in_stelloquy, true)

assert.equal(
  matchJournalMemoryPreset(
    {
      journal_memory_mode: 'use_entries',
      default_include_in_insights: true,
      default_include_in_stelloquy: false,
    },
    true,
  ),
  'custom',
)

const manualInsights = entryIdsWithManualInsightsChange([
  {
    journal_entry_id: 'a',
    event_type: 'changed',
    change_source: 'database_trigger',
    previous_include_in_insights: false,
    previous_include_in_stelloquy: false,
    current_include_in_insights: true,
    current_include_in_stelloquy: false,
  },
])
assert.ok(manualInsights.has('a'))

const insightsUnchanged = entryIdsWithManualInsightsChange([
  {
    journal_entry_id: 'a2',
    event_type: 'changed',
    change_source: 'database_trigger',
    previous_include_in_insights: true,
    previous_include_in_stelloquy: false,
    current_include_in_insights: true,
    current_include_in_stelloquy: true,
  },
])
assert.equal(insightsUnchanged.has('a2'), false)

const bulkNotManual = entryIdsWithManualInsightsChange([
  {
    journal_entry_id: 'b',
    event_type: 'changed',
    change_source: 'bulk_past_entries_include',
    previous_include_in_insights: false,
    previous_include_in_stelloquy: false,
  },
])
assert.equal(bulkNotManual.has('b'), false)

const stelloquyManual = entryIdsWithManualStelloquyChange([
  {
    journal_entry_id: 'c',
    event_type: 'changed',
    change_source: 'database_trigger',
    previous_include_in_insights: false,
    previous_include_in_stelloquy: false,
    current_include_in_insights: false,
    current_include_in_stelloquy: true,
  },
])
assert.ok(stelloquyManual.has('c'))

const stelloquyViaInsightsOnly = entryIdsWithManualStelloquyChange([
  {
    journal_entry_id: 'c2',
    event_type: 'changed',
    change_source: 'database_trigger',
    previous_include_in_insights: false,
    previous_include_in_stelloquy: false,
    current_include_in_insights: true,
    current_include_in_stelloquy: false,
  },
])
assert.equal(stelloquyViaInsightsOnly.has('c2'), false)

const heuristic = applyMemoryImportanceHeuristicIfNeeded(
  {
    include_in_insights: true,
    include_in_stelloquy: true,
    memory_pinned: false,
    memory_importance: null,
  },
  { body: 'short', isRitual: false, hadManualImportance: false },
)
assert.equal(heuristic.memory_importance, heuristicMemoryImportance({ body: 'short', isRitual: false }))

const keepManual = applyMemoryImportanceHeuristicIfNeeded(
  {
    include_in_insights: true,
    include_in_stelloquy: true,
    memory_pinned: false,
    memory_importance: 4,
  },
  { body: 'long text', isRitual: true, hadManualImportance: true },
)
assert.equal(keepManual.memory_importance, 4)

const v2Off = normalizeJournalConsent({ include_in_stelloquy: true }, false)
assert.equal(v2Off.persistStelloquyRecall, true)
assert.equal(v2Off.state.include_in_stelloquy, true)
assert.equal(v2Off.persistV2Fields, false)
assert.equal(v2Off.oracleMemory, true)

const v2OnStelloquyTicked = normalizeJournalConsent(
  { include_in_stelloquy: true, include_in_insights: true },
  true,
)
assert.equal(v2OnStelloquyTicked.state.include_in_stelloquy, true)

const migration049 = await readFile(
  new URL('../supabase/migrations/0049_journal_memory_defaults.sql', import.meta.url),
  'utf8',
)
assert.match(
  migration049,
  /DROP TRIGGER IF EXISTS trg_journal_stelloquy_consent_compat ON public\.journal_entries/,
)
assert.match(migration049, /DROP FUNCTION IF EXISTS public\.sync_journal_stelloquy_consent_compat\(\)/)
// Without the 0039 trigger, include_in_stelloquy from the app is not overwritten by oracle_memory=false.
assert.doesNotMatch(migration049, /CREATE TRIGGER trg_journal_stelloquy_consent_compat/)

console.log('✓ All journal memory defaults tests passed')
