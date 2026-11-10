/**
 * Today's check-in: what is accepted, how a saved row reads back, and the
 * summary line.
 * Run: npx tsx --test lib/today/__tests__/check-in.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_IN_MOODS, ENERGY_LEVELS, checkInFromRow, checkInSummary, energyLabel, parseCheckIn } from '../check-in-options'

describe('parseCheckIn', () => {
  it('accepts an energy level from 1 to 5 and a mood from the list', () => {
    assert.deepEqual(parseCheckIn({ energy: 3, mood: 'tender' }), { energy: 3, mood: 'tender' })
  })
  it('lets either one be left out or cleared', () => {
    assert.deepEqual(parseCheckIn({ energy: 2, mood: null }), { energy: 2, mood: null })
    assert.deepEqual(parseCheckIn({ mood: 'open' }), { energy: null, mood: 'open' })
    assert.deepEqual(parseCheckIn({ energy: null, mood: null }), { energy: null, mood: null })
  })
  it('refuses anything else rather than coercing it', () => {
    for (const bad of [{ energy: 0 }, { energy: 6 }, { energy: 2.5 }, { energy: '3' }, { mood: 'ecstatic' }, { mood: 4 }, { energy: 3, mood: 'TENDER' }]) {
      assert.equal(parseCheckIn(bad), null, JSON.stringify(bad))
    }
  })
  it('matches what the table allows', () => {
    assert.deepEqual(ENERGY_LEVELS.map(l => l.value), [1, 2, 3, 4, 5])
    assert.equal(new Set(CHECK_IN_MOODS).size, CHECK_IN_MOODS.length)
  })
})

describe('checkInFromRow', () => {
  it('reads a saved row', () => {
    assert.deepEqual(checkInFromRow({ energy_level: 4, mood_tag: 'bright' }), { energy: 4, mood: 'bright' })
  })
  it('is empty when there is no row', () => {
    assert.deepEqual(checkInFromRow(null), { energy: null, mood: null })
  })
  it('keeps the energy and drops a mood that is no longer on the list', () => {
    assert.deepEqual(checkInFromRow({ energy_level: 2, mood_tag: 'an older word' }), { energy: 2, mood: null })
  })
})

describe('the words on the card', () => {
  it('describes energy without grading it', () => {
    assert.equal(energyLabel(1), 'Resting')
    assert.equal(energyLabel(null), null)
    assert.doesNotMatch(ENERGY_LEVELS.map(l => l.label).join(' '), /bad|poor|good|great|best|worst/i)
  })
  it('summarises what was noted', () => {
    assert.equal(checkInSummary({ energy: 3, mood: 'tender' }), 'Even · tender')
    assert.equal(checkInSummary({ energy: null, mood: 'open' }), 'open')
    assert.equal(checkInSummary({ energy: null, mood: null }), null)
  })
})
