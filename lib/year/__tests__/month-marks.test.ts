import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { daysOfMonth, retrogradePlanetsByDay } from '../month-marks'

describe('retrogradePlanetsByDay', () => {
  const cycles = [
    { kind: 'retrograde' as const, planet: 'Mercury' as const, startDate: '2026-11-09', endDate: '2026-11-29' },
    { kind: 'retrograde' as const, planet: 'Saturn' as const, startDate: '2026-10-20', endDate: '2026-11-02' },
    { kind: 'eclipse' as const, planet: undefined, startDate: '2026-11-10', endDate: '2026-11-10' },
  ]
  it('shades the days inside each retrograde, clipped to the month', () => {
    const m = retrogradePlanetsByDay(cycles, 2026, 10)
    assert.deepEqual(m.get(1), ['Saturn'])
    assert.equal(m.get(5), undefined)
    assert.deepEqual(m.get(9), ['Mercury'])
    assert.deepEqual(m.get(29), ['Mercury'])
    assert.equal(m.get(30), undefined)
  })
  it('ignores cycles that are not retrogrades', () => {
    assert.equal(retrogradePlanetsByDay(cycles, 2026, 10).get(10)?.length, 1)
  })
})
describe('daysOfMonth', () => {
  it('keeps only this month, as day numbers', () => {
    assert.deepEqual([...daysOfMonth(['2026-11-03', '2026-10-31', null, '2026-11-12'], '2026-11-')].sort((a, b) => a - b), [3, 12])
  })
})
