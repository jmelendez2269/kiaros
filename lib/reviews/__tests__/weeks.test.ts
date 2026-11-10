/**
 * Weeks on the Reviews timeline, the last-week card on Today, and the line a
 * prepared reflection leads with.
 * Run: npx tsx --test lib/reviews/__tests__/weeks.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { lastWeekOnToday, weekRangeLabel, weekReflectionHref, weeksForMonth, weeksStartingInYear } from '../year-timeline'
import { reflectionLine } from '../../reflections/report-line'

describe('weeksStartingInYear', () => {
  const weeks = weeksStartingInYear(2026)
  it('lists every Monday in the year, oldest first', () => {
    assert.equal(weeks[0].start, '2026-01-05')
    assert.equal(weeks.at(-1)!.start, '2026-12-28')
    assert.equal(weeks.length, 52)
    assert.ok(weeks.every(w => new Date(w.start + 'T00:00:00Z').getUTCDay() === 1))
  })
  it('addresses each week by its ISO year and number, and ends on Sunday', () => {
    assert.deepEqual(weeks.find(w => w.start === '2026-11-02'), { year: 2026, index: 45, start: '2026-11-02', end: '2026-11-08' })
    // The last Monday of 2025 opens ISO week 1 of 2026.
    assert.deepEqual(weeksStartingInYear(2025).at(-1), { year: 2026, index: 1, start: '2025-12-29', end: '2026-01-04' })
  })
  it('puts a week under the month its Monday falls in', () => {
    const november = weeksForMonth(weeks, { start: '2026-11-01' })
    assert.deepEqual(november.map(w => w.start), ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })
})

describe('week labels and links', () => {
  it('shortens a range inside one month and spells out one that crosses', () => {
    assert.equal(weekRangeLabel({ start: '2026-11-02', end: '2026-11-08' }), 'Nov 2 – 8')
    assert.equal(weekRangeLabel({ start: '2026-11-30', end: '2026-12-06' }), 'Nov 30 – Dec 6')
  })
  it('links to that week in the Reflections page', () => {
    assert.equal(weekReflectionHref({ start: '2026-11-02' }), '/reflections?kind=week&start=2026-11-02')
  })
})

describe('lastWeekOnToday', () => {
  it('points at the week that just closed, Monday to Wednesday', () => {
    assert.equal(lastWeekOnToday('2026-11-09'), '2026-11-02')
    assert.equal(lastWeekOnToday('2026-11-11'), '2026-11-02')
  })
  it('steps aside for the rest of the week', () => {
    assert.equal(lastWeekOnToday('2026-11-12'), null)
    assert.equal(lastWeekOnToday('2026-11-15'), null)
  })
})

describe('reflectionLine', () => {
  const sky = { sky: { sections: { sky: 'Saturn sat opposite your Sun.' } } }
  it('leads with the opening when the reflection was written from records', () => {
    assert.equal(reflectionLine({ status: 'ready', content: { opening: { text: 'A week of small returns.' } }, analysis: sky }), 'A week of small returns.')
  })
  it('falls back to the sky for a week with nothing recorded', () => {
    assert.equal(reflectionLine({ status: 'empty', content: null, analysis: sky }), 'Saturn sat opposite your Sun.')
  })
  it('treats the old blank state, and anything unfinished, as not yet readable', () => {
    assert.equal(reflectionLine({ status: 'empty', content: null, analysis: { observedDays: 0 } }), undefined)
    assert.equal(reflectionLine({ status: 'generating', content: null, analysis: null }), undefined)
    assert.equal(reflectionLine({ status: 'stale', content: null, analysis: null }), undefined)
  })
})
