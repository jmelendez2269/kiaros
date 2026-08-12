import assert from 'node:assert/strict'
import {
  journalConsentCompatibilityInputSchema,
  normalizeJournalConsent,
  privateJournalConsentInput,
} from '../lib/journal/consent.ts'

const legacyOff = normalizeJournalConsent({ oracle_memory: true }, false)
assert.deepEqual(legacyOff, {
  state: {
    include_in_insights: false,
    include_in_stelloquy: false,
    memory_pinned: false,
    memory_importance: null,
  },
  oracleMemory: true,
  persistV2Fields: false,
  usedLegacyStelloquyFallback: false,
})

const privateV2 = normalizeJournalConsent({}, true)
assert.deepEqual(privateV2.state, privateJournalConsentInput())
assert.equal(privateV2.oracleMemory, false)
assert.equal(privateV2.persistV2Fields, true)

const legacyV2 = normalizeJournalConsent({ oracle_memory: true }, true)
assert.equal(legacyV2.state.include_in_stelloquy, true)
assert.equal(legacyV2.state.include_in_insights, false)
assert.equal(legacyV2.oracleMemory, true)
assert.equal(legacyV2.usedLegacyStelloquyFallback, true)

const explicitV2Wins = normalizeJournalConsent(
  {
    oracle_memory: true,
    include_in_stelloquy: false,
    include_in_insights: true,
    memory_pinned: true,
    memory_importance: 4,
  },
  true,
)
assert.deepEqual(explicitV2Wins, {
  state: {
    include_in_insights: true,
    include_in_stelloquy: false,
    memory_pinned: true,
    memory_importance: 4,
  },
  oracleMemory: false,
  persistV2Fields: true,
  usedLegacyStelloquyFallback: false,
})

const independentPermissions = normalizeJournalConsent(
  { include_in_insights: false, include_in_stelloquy: true },
  true,
)
assert.equal(independentPermissions.state.include_in_insights, false)
assert.equal(independentPermissions.state.include_in_stelloquy, true)

assert.equal(
  journalConsentCompatibilityInputSchema.safeParse({ memory_importance: null }).success,
  true,
)
assert.equal(
  journalConsentCompatibilityInputSchema.safeParse({ memory_importance: 0 }).success,
  false,
)
assert.equal(
  journalConsentCompatibilityInputSchema.safeParse({ memory_importance: 6 }).success,
  false,
)
assert.equal(
  journalConsentCompatibilityInputSchema.safeParse({ memory_importance: 2.5 }).success,
  false,
)

console.log('journal consent contract checks passed')
