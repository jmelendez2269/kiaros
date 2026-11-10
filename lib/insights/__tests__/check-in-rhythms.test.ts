/**
 * Check-in rhythms: when a moon phase is described, and when the record is
 * too thin to say anything.
 * Run: npx tsx --test lib/insights/__tests__/check-in-rhythms.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkInRhythms, describePhaseRhythm, MIN_CHECK_INS, type CheckInRow } from '../check-in-rhythms'

let day = 0
const row = (phase: string | null, energy: number | null, mood: string | null = null): CheckInRow =>
  ({ log_date: `2026-11-${String(++day % 28 + 1).padStart(2, '0')}`, energy_level: energy, mood_tag: mood, lunar_phase: phase })
const many = (n: number, phase: string | null, energy: number | null, mood: string | null = null) => Array.from({ length: n }, () => row(phase, energy, mood))

describe('checkInRhythms', () => {
  it('says nothing, and how many are still needed, before there are enough check-ins', () => {
    const thin = checkInRhythms(many(3, 'Full', 1, 'tired'))
    assert.deepEqual(thin, { total: 3, usualEnergyWord: null, phases: [], toGo: MIN_CHECK_INS - 3 })
  })
  it('ignores rows with nothing recorded', () => {
    assert.equal(checkInRhythms([...many(2, 'Full', 3), ...many(5, 'Full', null)]).total, 2)
  })
  it('describes a phase whose energy sits well below the usual', () => {
    const rhythms = checkInRhythms([...many(4, 'Full', 2, 'tired'), ...many(8, 'New', 4)])
    assert.equal(rhythms.usualEnergyWord, 'Even')
    const full = rhythms.phases.find(p => p.phase === 'Full')!
    assert.deepEqual(full, { phase: 'Full', checkIns: 4, energy: 'lower', energyWord: 'Low', mood: 'tired' })
    assert.equal(describePhaseRhythm(full), 'Energy has sat lower, around Low, and tired came up most.')
    assert.equal(rhythms.phases.find(p => p.phase === 'New')!.energy, 'higher')
  })
  it('leaves out a phase with too few check-ins, however striking', () => {
    const rhythms = checkInRhythms([...many(3, 'Full', 1, 'heavy'), ...many(8, 'New', 4)])
    assert.equal(rhythms.phases.some(p => p.phase === 'Full'), false)
  })
  it('leaves out a phase that sits about where the member usually does', () => {
    const rhythms = checkInRhythms([...many(4, 'Full', 3), ...many(4, 'New', 3), row('Full', 4)])
    assert.deepEqual(rhythms.phases, [])
    assert.equal(rhythms.toGo, 0)
  })
  it('names a mood only when it clearly leads', () => {
    const tied = checkInRhythms([...many(2, 'Full', 3, 'open'), ...many(2, 'Full', 3, 'tender'), ...many(4, 'New', 3)])
    assert.deepEqual(tied.phases, [])
    const leads = checkInRhythms([...many(3, 'Full', 3, 'open'), row('Full', 3, 'tender'), ...many(4, 'New', 3)])
    assert.equal(leads.phases[0].mood, 'open')
    assert.equal(describePhaseRhythm(leads.phases[0]), 'Open came up most.')
  })
  it('never grades', () => {
    const rhythms = checkInRhythms([...many(4, 'Full', 1, 'heavy'), ...many(8, 'New', 5, 'bright')])
    for (const phase of rhythms.phases) assert.doesNotMatch(describePhaseRhythm(phase), /better|worse|good|bad|should/i)
  })
})
