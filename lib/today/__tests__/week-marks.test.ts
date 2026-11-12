/**
 * Marks on Today's week ribbon.
 * Run: npx tsx --test lib/today/__tests__/week-marks.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dayMarkLabel, weekMarks } from '../week-marks'

const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']
const log = (date: string, energy: number | null, mood: string | null = null) => ({ log_date: date, energy_level: energy, mood_tag: mood })

describe('weekMarks', () => {
  it('marks the days the member wrote or checked in', () => {
    const marks = weekMarks(week, '2026-11-12', ['2026-11-09', '2026-11-11', '2026-11-11'], [log('2026-11-11', 3, 'open'), log('2026-11-12', null, 'tender')])
    assert.deepEqual(marks, {
      '2026-11-09': { wrote: true, checkedIn: false },
      '2026-11-11': { wrote: true, checkedIn: true },
      '2026-11-12': { wrote: false, checkedIn: true },
    })
  })
  it('leaves a day with nothing unmarked, with no entry at all', () => {
    assert.equal('2026-11-10' in weekMarks(week, '2026-11-12', ['2026-11-09'], []), false)
    assert.deepEqual(weekMarks(week, '2026-11-12', [], []), {})
  })
  it('does not count a cleared check-in', () => {
    assert.deepEqual(weekMarks(week, '2026-11-12', [], [log('2026-11-10', null, null), log('2026-11-11', null, '')]), {})
  })
  it('ignores anything outside this week, or after today', () => {
    assert.deepEqual(weekMarks(week, '2026-11-12', ['2026-11-08', '2026-11-14', null, undefined], [log('2026-11-16', 4)]), {})
  })
  it('reads a timestamp as its date', () => {
    assert.deepEqual(weekMarks(week, '2026-11-12', ['2026-11-10T08:30:00Z'], []), { '2026-11-10': { wrote: true, checkedIn: false } })
  })
})

describe('dayMarkLabel', () => {
  it('says what the marks mean', () => {
    assert.equal(dayMarkLabel({ wrote: true, checkedIn: true }), 'wrote and checked in')
    assert.equal(dayMarkLabel({ wrote: false, checkedIn: true }), 'checked in')
    assert.equal(dayMarkLabel(undefined), null)
  })
})
