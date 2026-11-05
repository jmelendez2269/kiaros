/**
 * Yearly Unwrapped story frames.
 * Run: npx tsx --test lib/reflections/__tests__/story.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildStoryFrames, fullestMonth, sentences } from '@/lib/reflections/story'
import type { Evidence, ReflectionContent } from '@/lib/reflections/report-schema'

const p = (text: string, sources = ['journal:a']) => ({ text, sources })
const content: ReflectionContent = {
  opening: p('You began the year writing lists. You ended it writing about what you wanted. Nothing dramatic changed.'),
  moments: [p('A walk in March.')],
  observations: [{ ...p('Your quieter entries cluster near the new moon. They mention sleep.'), key: 'rest', kind: 'recurrence', contradictingSources: [] }],
  rhythms: null,
  turningPoints: p('In September you said no to a standing weekend. It changed the autumn.', ['journal:b', 'capture:c']),
  discoveries: null,
  goalThread: null,
  lookingAhead: { focus: p('Keep Sundays slow.'), experiments: [p('Decide the rest day on Sunday night.')] },
  letter: p('Take it gently.'),
}
const ev = (id: string, date: string, title: string, authored = true): Evidence => ({ id, kind: 'journal', date, recordedAt: date, title, text: '', goalId: null, authored })
const sources = [ev('journal:a', '2025-01-03', 'Lists'), ev('journal:b', '2025-09-22', 'Weekends'), ev('capture:c', '2025-09-01', 'Saved advice', false)]
const analysis = { observedDays: 162, totalDays: 365, months: [{ month: '2025-01', days: 11 }, { month: '2025-03', days: 23 }, { month: '2025-04', days: 14 }] }

describe('story frames', () => {
  const frames = buildStoryFrames(content, analysis, sources)

  it('builds five frames in order', () => {
    assert.deepEqual(frames.map(f => f.key), ['year', 'showed-up', 'showed', 'turning', 'carry'])
  })

  it('opens with the first sentence and keeps the second beneath it', () => {
    assert.equal(frames[0].big, 'You began the year writing lists.')
    assert.equal(frames[0].small, 'You ended it writing about what you wanted.')
  })

  it('counts recorded days and names the fullest month', () => {
    assert.equal(frames[1].big, '162')
    assert.equal(frames[1].small, 'days recorded, out of 365. Your fullest month was March with 23 days.')
  })

  it('dates the turning point from the member\'s own entry, never saved AI advice', () => {
    assert.equal(frames[3].meta, 'Sep 22 · Weekends')
    assert.equal(frames[3].big, 'In September you said no to a standing weekend.')
  })

  it('carries forward the first experiment', () => {
    assert.equal(frames[4].big, 'Decide the rest day on Sunday night.')
  })

  it('leaves out frames it has no data for', () => {
    const thin = buildStoryFrames({ ...content, observations: [], turningPoints: null, lookingAhead: { focus: p('Rest.'), experiments: [] } }, null, [])
    assert.deepEqual(thin.map(f => f.key), ['year', 'carry'])
    assert.equal(thin[1].big, 'Rest.')
  })
})

describe('helpers', () => {
  it('splits sentences', () => {
    assert.deepEqual(sentences('One. Two! Three'), ['One.', 'Two!', 'Three'])
  })
  it('finds the fullest month', () => {
    assert.equal(fullestMonth([{ month: '2025-02', days: 1 }]), 'February with 1 day')
    assert.equal(fullestMonth([{ month: '2025-02', days: 0 }]), null)
  })
})
