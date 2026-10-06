/**
 * Unit tests for Stelloquy journal recall fallback when relevance search is empty or fails.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  resolveOracleJournalEntriesForPrompt,
  type OracleJournalPromptEntry,
} from '../lib/journal/oracle-journal-recall.ts'
import type { RecalledMemory } from '../lib/journal/memory-retrieval.ts'

const recentAllowed: OracleJournalPromptEntry[] = [
  { entry_date: '2026-10-05', title: 'Recent A', body: 'body a', mood_tag: null, is_ritual: false },
  { entry_date: '2026-10-04', title: 'Recent B', body: 'body b', mood_tag: 'calm', is_ritual: false },
  { entry_date: '2026-10-03', title: 'Recent C', body: 'body c', mood_tag: null, is_ritual: true },
  { entry_date: '2026-10-02', title: 'Recent D', body: 'body d', mood_tag: null, is_ritual: false },
  { entry_date: '2026-10-01', title: 'Recent E', body: 'body e', mood_tag: null, is_ritual: false },
]

const recalledMatch: RecalledMemory[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    entry_date: '2026-09-01',
    title: 'Matched',
    body: 'relevant body',
    mood_tag: null,
    is_ritual: false,
  },
]

console.log('=== Oracle journal recall fallback tests ===\n')

// (a) relevance on, no match → fallback to recent allowed (up to what caller fetched)
{
  const { entries, relevanceSources } = resolveOracleJournalEntriesForPrompt(true, [], recentAllowed)
  assert.deepEqual(entries, recentAllowed)
  assert.equal(relevanceSources, null)
  console.log('✓ (a) empty relevance recall falls back to recent allowed entries')
}

// (b) fallback uses only caller-supplied allowed recent rows; relevance path still rechecks consent
{
  const allowedOnly = recentAllowed.slice(0, 2)
  const { entries } = resolveOracleJournalEntriesForPrompt(true, null, allowedOnly)
  assert.deepEqual(entries, allowedOnly)
  assert.equal(entries.length, 2)

  const memoryRetrieval = await readFile(new URL('../lib/journal/memory-retrieval.ts', import.meta.url), 'utf8')
  assert.match(memoryRetrieval, /include_in_stelloquy['"], true\)/)
  assert.match(memoryRetrieval, /return selected\.filter\(e=>allowed\.has\(e\.id\)\)/)
  console.log('✓ (b) fallback returns pre-filtered recent entries only; recall still rechecks consent')
}

// (c) relevance on with matches → use recalled entries and expose sources
{
  const { entries, relevanceSources } = resolveOracleJournalEntriesForPrompt(true, recalledMatch, recentAllowed)
  assert.deepEqual(entries, recalledMatch)
  assert.deepEqual(relevanceSources, recalledMatch)
  console.log('✓ (c) relevance matches keep recalled entries')
}

// (d) relevance off → unchanged recent-only behavior
{
  const { entries, relevanceSources } = resolveOracleJournalEntriesForPrompt(false, recalledMatch, recentAllowed)
  assert.deepEqual(entries, recentAllowed)
  assert.equal(relevanceSources, null)
  console.log('✓ (d) relevance off ignores recall and uses recent allowed entries')
}

// Route still filters recent fetch by consent column before fallback wiring
{
  const route = await readFile(new URL('../app/api/oracle/chat/route.ts', import.meta.url), 'utf8')
  assert.match(route, /resolveOracleJournalEntriesForPrompt/)
  assert.match(route, /\.eq\(journalRecallColumn, true\)/)
  assert.match(route, /Journal relevance recall failed; using recent allowed entries/)
  console.log('✓ Oracle route keeps consent-filtered recent query and error fallback')
}

console.log('\n=== All oracle journal recall tests passed ===')
