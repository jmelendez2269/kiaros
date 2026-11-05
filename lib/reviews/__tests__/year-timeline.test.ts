/**
 * Reviews year timeline helpers.
 * Run: npx tsx --test lib/reviews/__tests__/year-timeline.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayOfYear,
  daysInYear,
  daysWrittenByMonth,
  fallbackLine,
  firstSentence,
  packRows,
  reviewState,
  skyForMonth,
  skyGlyph,
  type TimelineMonth,
  type TimelineSkyEvent,
} from '@/lib/reviews/year-timeline'

describe('review state', () => {
  it('is read or ready once a period ends, open while it runs, future before', () => {
    assert.equal(reviewState('2026-10-01', '2026-10-31', '2026-11-05', true), 'read')
    assert.equal(reviewState('2026-10-01', '2026-10-31', '2026-11-05', false), 'ready')
    assert.equal(reviewState('2026-11-01', '2026-11-30', '2026-11-05', false), 'open')
    assert.equal(reviewState('2026-11-01', '2026-11-30', '2026-11-30', false), 'open', 'the last day still belongs to the month')
    assert.equal(reviewState('2026-12-01', '2026-12-31', '2026-11-05', false), 'future')
  })
})

describe('days written', () => {
  it('counts distinct days per month and ignores other years', () => {
    const counts = daysWrittenByMonth(['2026-01-02', '2026-01-02', '2026-01-09', '2026-03-31', '2025-12-31'], 2026)
    assert.equal(counts.length, 12)
    assert.deepEqual(counts.slice(0, 3), [2, 0, 1])
  })
})

describe('month lines', () => {
  it('takes the first sentence and keeps it short', () => {
    assert.equal(firstSentence('October kept pulling two ways. The grant consumed it.'), 'October kept pulling two ways.')
    assert.equal(firstSentence('x'.repeat(200), 20).length, 20)
    assert.ok(firstSentence('x'.repeat(200), 20).endsWith('…'))
  })

  it('says something useful before a look back is read', () => {
    assert.equal(fallbackLine('ready', 1, 'Oct 31'), '1 day written. Ready to look back on.')
    assert.equal(fallbackLine('ready', 9, 'Oct 31'), '9 days written. Ready to look back on.')
    assert.match(fallbackLine('ready', 0, 'Oct 31'), /quiet month/)
    assert.equal(fallbackLine('open', 3, 'Nov 30'), 'Still unfolding · closes Nov 30')
    assert.equal(fallbackLine('future', 0, 'Dec 31'), 'Not yet')
  })
})

describe('sky beside each month', () => {
  const ev = (id: string, start: string, end: string): TimelineSkyEvent => ({ id, kind: 'retrograde', personal: false, title: id, subtitle: '', start, end, glyph: '☿' })
  const jan: TimelineMonth = { index: 1, start: '2026-01-01', end: '2026-01-31', state: 'read', daysWritten: 0, line: '', chips: [] }
  const sky = [ev('began-in-jan', '2026-01-10', '2026-02-01'), ev('carried-over', '2025-12-20', '2026-01-05'), ev('feb', '2026-02-02', '2026-02-20')]

  it('lists what begins in the month, plus what is already under way in the first month', () => {
    assert.deepEqual(skyForMonth(sky, jan, true).map(e => e.id), ['carried-over', 'began-in-jan'], 'in date order')
    assert.deepEqual(skyForMonth(sky, jan, false).map(e => e.id), ['began-in-jan'])
  })

  it('uses planet and aspect glyphs', () => {
    assert.equal(skyGlyph('retrograde', 'Mercury'), '☿')
    assert.equal(skyGlyph('personal_transit', 'Saturn', 'square'), '□')
    assert.equal(skyGlyph('eclipse'), '◐')
  })
})

describe('bar rows', () => {
  it('stacks only bars that overlap', () => {
    const rows = packRows([
      { id: 'a', start: '2026-01-01', end: '2026-03-01' },
      { id: 'b', start: '2026-02-01', end: '2026-04-01' },
      { id: 'c', start: '2026-03-10', end: '2026-05-01' },
    ])
    assert.deepEqual(rows, { a: 0, b: 1, c: 0 })
  })

  it('keeps a gap between bars that share a row', () => {
    const rows = packRows([{ id: 'a', start: '2026-01-01', end: '2026-01-10' }, { id: 'b', start: '2026-01-12', end: '2026-01-20' }], 5)
    assert.deepEqual(rows, { a: 0, b: 1 })
  })
})

describe('calendar maths', () => {
  it('knows the day of the year and leap years', () => {
    assert.equal(dayOfYear('2026-01-01'), 1)
    assert.equal(dayOfYear('2026-11-04'), 308)
    assert.equal(daysInYear(2026), 365)
    assert.equal(daysInYear(2028), 366)
  })
})
