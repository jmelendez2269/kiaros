/**
 * Run: npx tsx --test lib/sky-cycles/__tests__/turns.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import collective from '@/lib/sky-cycles/data/collective-cycles.json'
import { dayBeforeSeen, turnsHeadline, turnsOn, type StationDay } from '@/lib/sky-cycles/turns'
import type { SkyCycle } from '@/lib/sky-cycles/types'

const cycles = (collective as { cycles: SkyCycle[] }).cycles

// What the hour-level finder gives for a member in New York in November 2026.
const NEW_YORK_STATIONS: Record<string, string> = { 'Mercury:2026-11-14': '2026-11-13', 'Venus:2026-11-15': '2026-11-13' }
const newYork: StationDay = (planet, keyDate) => NEW_YORK_STATIONS[`${planet}:${keyDate}`] ?? dayBeforeSeen(planet, keyDate)

describe('turnsOn', () => {
  it('names both stations on the day Mercury and Venus turn direct', () => {
    const turns = turnsOn(cycles, '2026-11-13', newYork)
    assert.deepEqual(turns.map((t) => [t.title, t.detail]), [
      ['Mercury turns direct', 'retrograde since Oct 25'],
      ['Venus turns direct', 'retrograde since Oct 4'],
    ])
    assert.equal(turnsHeadline(turns), 'Mercury and Venus both turn direct.')
  })
  it('is quiet the day before and the day after', () => {
    assert.deepEqual(turnsOn(cycles, '2026-11-12', newYork), [])
    assert.deepEqual(turnsOn(cycles, '2026-11-14', newYork), [])
  })
  it('without a finer resolver, takes the station as the day before it is first seen', () => {
    assert.deepEqual(turnsOn(cycles, '2026-11-13').map((t) => t.title), ['Mercury turns direct'])
    assert.deepEqual(turnsOn(cycles, '2026-11-14').map((t) => t.title), ['Venus turns direct'])
  })
  it('marks a planet turning retrograde, with its sign', () => {
    const [turn] = turnsOn(cycles, '2026-10-24')
    assert.equal(turn.title, 'Mercury turns retrograde')
    assert.equal(turn.detail, 'in Scorpio')
  })
  it('names an eclipse on its day, and which end of the season it is', () => {
    assert.deepEqual(turnsOn(cycles, '2026-02-17').filter((t) => t.moment === 'eclipse').map((t) => [t.title, t.detail]), [['Solar eclipse in Aquarius', 'opens this eclipse season']])
    assert.deepEqual(turnsOn(cycles, '2026-03-03').filter((t) => t.moment === 'eclipse').map((t) => [t.title, t.detail]), [['Lunar eclipse', 'closes this eclipse season']])
  })
  it('marks a slow planet changing sign on the day it does', () => {
    assert.ok(turnsOn(cycles, '2026-01-26').some((t) => t.moment === 'enters' && t.title === 'Neptune returns to Aries'))
  })
  it('puts a transit to the member\'s own chart first, only on an exact day', () => {
    const personal: SkyCycle = { id: 'personal:Saturn:square:Moon:2026-09-20', kind: 'personal_transit', scope: 'personal', title: 'Saturn squares your Moon', subtitle: '', startDate: '2026-09-20', endDate: '2026-12-01', headsUpDays: 7, keyDates: ['2026-11-13'], planet: 'Saturn', familyKey: 'personal:Saturn:square:Moon' }
    const turns = turnsOn([...cycles, personal], '2026-11-13', newYork)
    assert.equal(turns[0].title, 'Saturn squares your Moon')
    assert.equal(turns[0].personal, true)
    assert.equal(turnsHeadline(turns), 'Three turns in the sky today.')
    assert.ok(!turnsOn([personal], '2026-11-12').length)
  })
  it('never treats a season as a turn', () => {
    const days = cycles.filter((c) => c.kind === 'season').map((c) => c.startDate)
    for (const day of days) assert.ok(turnsOn(cycles, day).every((t) => !t.cycleId.startsWith('season')))
  })
})
