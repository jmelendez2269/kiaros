import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { currentWeekNumber, howWeeksWentLabel, lastClosedWeek } from '../year-strip'

const weeks = [
  { weekNumber: 1, startDate: '2026-01-05', endDate: '2026-01-11' },
  { weekNumber: 2, startDate: '2026-01-12', endDate: '2026-01-18' },
  { weekNumber: 3, startDate: '2026-01-19', endDate: '2026-01-25' },
]
describe('year strip', () => {
  it('finds the last week that has ended', () => {
    assert.equal(lastClosedWeek(weeks, '2026-01-20'), 2)
    assert.equal(lastClosedWeek(weeks, '2026-01-11'), null)
  })
  it('words the link, and has none before a week closes', () => {
    assert.equal(howWeeksWentLabel(46), 'How weeks 1 to 46 actually went →')
    assert.equal(howWeeksWentLabel(1), 'How week 1 actually went →')
    assert.equal(howWeeksWentLabel(null), null)
  })
  it('finds the current week', () => {
    assert.equal(currentWeekNumber(weeks, '2026-01-14'), 2)
    assert.equal(currentWeekNumber(weeks, '2027-01-14'), null)
  })
})
