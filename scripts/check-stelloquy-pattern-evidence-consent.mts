/**
 * Stelloquy must not surface pattern evidence or summaries unless every evidence
 * entry is include_in_stelloquy = true (fail closed on mixed, missing, or empty evidence).
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildOracleSystemPromptSegments } from '../lib/ai/oracle-system-prompt.ts'
import {
  filterPatternInsightsForStelloquy,
  type PatternInsightForStelloquyPrompt,
} from '../lib/journal/stelloquy-pattern-context.ts'

const INCLUDED_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const INCLUDED_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const EXCLUDED_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const mixedPattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'lunar_phase',
  pattern_key: 'Full Moon',
  sample_size: 2,
  confidence: 40,
  first_seen: '2026-01-01',
  last_seen: '2026-02-01',
  summary: 'Mixed pattern summary must not reach Stelloquy.',
  evidence: [
    { entry_id: INCLUDED_A, entry_date: '2026-01-01', title: 'Included title A' },
    { entry_id: EXCLUDED_ID, entry_date: '2026-01-15', title: 'Kairos-only secret title' },
  ],
}

const allExcludedPattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'retrograde',
  pattern_key: 'Mercury',
  sample_size: 1,
  confidence: 30,
  first_seen: '2026-03-01',
  last_seen: '2026-03-01',
  summary: 'Mercury retrograde only pattern.',
  evidence: [{ entry_id: EXCLUDED_ID, entry_date: '2026-03-01', title: 'Only excluded evidence' }],
}

const allIncludedPattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'lunar_sign',
  pattern_key: 'Taurus',
  sample_size: 99,
  confidence: 50,
  first_seen: '2026-04-01',
  last_seen: '2026-04-02',
  summary: 'All-included pattern summary is allowed.',
  evidence: [
    { entry_id: INCLUDED_A, entry_date: '2026-04-01', title: 'Stelloquy may see this title' },
    { entry_id: INCLUDED_B, entry_date: '2026-04-02', title: 'Second included title' },
  ],
}

const emptyEvidencePattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'aspect',
  pattern_key: 'mars:square:sun',
  sample_size: 0,
  confidence: 0,
  first_seen: null,
  last_seen: null,
  summary: 'Empty evidence summary must not leak.',
  evidence: [],
}

const unparseableEvidencePattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'lunar_phase',
  pattern_key: 'New Moon',
  sample_size: 1,
  confidence: 20,
  first_seen: '2026-05-01',
  last_seen: '2026-05-01',
  summary: 'Unparseable evidence summary must not leak.',
  evidence: [{ foo: 'bar' }] as unknown as PatternInsightForStelloquyPrompt['evidence'],
}

const missingIdPattern: PatternInsightForStelloquyPrompt = {
  pattern_type: 'lunar_phase',
  pattern_key: 'Waning',
  sample_size: 1,
  confidence: 25,
  first_seen: '2026-06-01',
  last_seen: '2026-06-01',
  summary: 'Missing lookup id summary must not leak.',
  evidence: [
    {
      entry_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      entry_date: '2026-06-01',
      title: 'Not in consent lookup',
    },
  ],
}

const allowed = new Set([INCLUDED_A, INCLUDED_B])

assert.deepEqual(
  filterPatternInsightsForStelloquy([mixedPattern], allowed),
  [],
  'mixed evidence drops the whole pattern',
)

assert.deepEqual(filterPatternInsightsForStelloquy([allExcludedPattern], allowed), [])
assert.deepEqual(filterPatternInsightsForStelloquy([emptyEvidencePattern], allowed), [])
assert.deepEqual(filterPatternInsightsForStelloquy([unparseableEvidencePattern], allowed), [])
assert.deepEqual(filterPatternInsightsForStelloquy([missingIdPattern], allowed), [])

const kept = filterPatternInsightsForStelloquy([allIncludedPattern], allowed)
assert.equal(kept.length, 1)
assert.equal(kept[0]?.summary, 'All-included pattern summary is allowed.')

const minimalProfile = {
  id: 'profile-1',
  clerk_user_id: 'user_1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  display_name: 'Test',
  timezone: 'UTC',
  birth_date: '1990-01-01',
  birth_time: '12:00:00',
  birth_place: 'Test',
  birth_lat: 0,
  birth_lng: 0,
  natal_chart: null,
  human_design: null,
  tradition: null,
  onboarding_complete: true,
  plan_year: 2026,
  oracle_memory_enabled: true,
} as const

function dynamicPromptFor(patterns: PatternInsightForStelloquyPrompt[]) {
  return buildOracleSystemPromptSegments({
    profile: minimalProfile,
    ephemeris: null,
    blueprint: null,
    goalCategories: [],
    areaGoals: [],
    curriculumPlans: [],
    curriculumSessions: [],
    dailyLogs: [],
    journalEntries: [],
    oracleCaptures: [],
    patternInsights: patterns,
    quarterlyReviews: [],
    planItems: [],
    today: '2026-10-15',
  }).dynamic
}

const mixedDynamic = dynamicPromptFor(filterPatternInsightsForStelloquy([mixedPattern], allowed))
assert.doesNotMatch(mixedDynamic, /Mixed pattern summary must not reach Stelloquy/)
assert.doesNotMatch(mixedDynamic, /Kairos-only secret title/)

const keptDynamic = dynamicPromptFor(kept)
assert.doesNotMatch(keptDynamic, /All-included pattern summary is allowed/)
assert.match(keptDynamic, /Stelloquy may see this title/)
assert.match(keptDynamic, /Moon in Taurus \| 2 entries/)
assert.doesNotMatch(keptDynamic, /99 entries/)

const oraclePrompt = await readFile(
  new URL('../lib/ai/oracle-system-prompt.ts', import.meta.url),
  'utf8',
)
assert.doesNotMatch(oraclePrompt, /pattern\.summary/)
assert.match(oraclePrompt, /parsePatternInsightEvidence\(pattern\.evidence\)/)

const loader = await readFile(
  new URL('../lib/journal/load-stelloquy-pattern-insights.ts', import.meta.url),
  'utf8',
)
assert.match(loader, /\.eq\('user_id', userId\)/)
assert.match(loader, /console\.error/)
assert.match(loader, /return \[\]/)

const chatRoute = await readFile(new URL('../app/api/oracle/chat/route.ts', import.meta.url), 'utf8')
const explainRoute = await readFile(new URL('../app/api/oracle/explain/route.ts', import.meta.url), 'utf8')
assert.match(chatRoute, /\.eq\('user_id', profileId\)/)
assert.match(explainRoute, /\.eq\('user_id', profileId\)/)

const journalMemory = await readFile(new URL('../lib/copy/journal-memory.ts', import.meta.url), 'utf8')
assert.match(
  journalMemory,
  /Stelloquy may still see this entry's title and date in pattern summaries/,
)

console.log('✓ Stelloquy pattern context is strict and fail-closed')
console.log('  - mixed, empty, unparseable, missing-id, and all-excluded patterns dropped')
console.log('  - all-included pattern kept with label, evidence titles, and consented entry count only')
console.log('  - pattern summary and stored sample_size never reach the Oracle prompt')
console.log('  - loader scopes by user_id and omits patterns on lookup error')
