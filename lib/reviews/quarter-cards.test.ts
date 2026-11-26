import assert from 'node:assert/strict'
import test from 'node:test'
import { quarterCards } from './quarter-cards'
import type { TimelineQuarter } from './year-timeline'

const q = (index: number, start: string, end: string, state: TimelineQuarter['state']): TimelineQuarter => ({ index, start, end, state })

test('closed quarters open, the current one counts its week, later ones wait', () => {
  const cards = quarterCards([
    q(1, '2026-01-01', '2026-03-31', 'read'),
    q(2, '2026-04-01', '2026-06-30', 'ready'),
    q(4, '2026-10-01', '2026-12-31', 'open'),
    q(1, '2027-01-01', '2027-03-31', 'future'),
  ], '2026-11-19')
  assert.deepEqual(cards.map((c) => c.openable), [true, true, false, false])
  assert.equal(cards[0].range, 'Q1 · Jan to Mar')
  assert.equal(cards[2].status, 'Week 8 of 13 · closes Dec 31')
  assert.equal(cards[2].current, true)
  assert.equal(cards[3].status, 'Not yet')
})
