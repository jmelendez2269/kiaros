/**
 * Stelloquy must not surface pattern evidence (titles, dates, ids) from journal
 * entries where include_in_stelloquy is false.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildOracleSystemPromptSegments } from '../lib/ai/oracle-system-prompt.ts'
import {
  filterPatternInsightsForStelloquy,
  type PatternInsightForStelloquyPrompt,
} from '../lib/journal/stelloquy-pattern-context.ts'

const INCLUDED_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const EXCLUDED_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const patterns: PatternInsightForStelloquyPrompt[] = [
  {
    pattern_type: 'lunar_phase',
    pattern_key: 'Full Moon',
    sample_size: 2,
    confidence: 40,
    first_seen: '2026-01-01',
    last_seen: '2026-02-01',
    summary: 'You often journal on full moons.',
    evidence: [
      {
        entry_id: INCLUDED_ID,
        entry_date: '2026-01-01',
        title: 'Stelloquy may see this title',
      },
      {
        entry_id: EXCLUDED_ID,
        entry_date: '2026-01-15',
        title: 'Kairos-only secret title',
      },
    ],
  },
  {
    pattern_type: 'retrograde',
    pattern_key: 'Mercury',
    sample_size: 1,
    confidence: 30,
    first_seen: '2026-03-01',
    last_seen: '2026-03-01',
    summary: 'Mercury retrograde only pattern.',
    evidence: [
      {
        entry_id: EXCLUDED_ID,
        entry_date: '2026-03-01',
        title: 'Only excluded evidence',
      },
    ],
  },
]

const allowed = new Set([INCLUDED_ID])
const filtered = filterPatternInsightsForStelloquy(patterns, allowed)

assert.equal(filtered.length, 1, 'pattern with only excluded evidence should be dropped entirely')
assert.equal(filtered[0]?.pattern_key, 'Full Moon')

const evidence = filtered[0]?.evidence
assert.ok(Array.isArray(evidence) && evidence.length === 1)
assert.equal((evidence[0] as { entry_id: string }).entry_id, INCLUDED_ID)

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

const { dynamic } = buildOracleSystemPromptSegments({
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
  patternInsights: filtered,
  quarterlyReviews: [],
  planItems: [],
  today: '2026-10-15',
})

assert.match(dynamic, /Stelloquy may see this title/)
assert.doesNotMatch(dynamic, /Kairos-only secret title/)
assert.doesNotMatch(dynamic, /Only excluded evidence/)
assert.doesNotMatch(dynamic, /Mercury retrograde only pattern/)

const chatRoute = await readFile(new URL('../app/api/oracle/chat/route.ts', import.meta.url), 'utf8')
const explainRoute = await readFile(new URL('../app/api/oracle/explain/route.ts', import.meta.url), 'utf8')

assert.match(chatRoute, /loadStelloquyPatternInsightsForPrompt/)
assert.match(explainRoute, /loadStelloquyPatternInsightsForPrompt/)

console.log('✓ Stelloquy pattern evidence respects include_in_stelloquy')
console.log('  - excluded evidence titles absent from Oracle dynamic prompt')
console.log('  - included evidence title present')
console.log('  - all-excluded pattern dropped (summary not leaked)')
