/**
 * Threads a member has met before: which patterns and themes a look back may
 * name, and that only names, counts and dates reach the prompt.
 * Run: npx tsx --test lib/period-review/__tests__/returning-threads.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { EphemerisDay } from '@/types/blueprint'
import {
  chipReturningPattern,
  chipReturningTheme,
  returningThreadsPromptBlock,
  selectReturningPatterns,
  selectReturningThemes,
  type PatternRowForThreads,
} from '../returning-threads'
import { monthLabel, monthReviewHref } from '../../insights/star-chart'

const day = (date: string, over: Partial<{ phase: string; sign: string; retrogrades: string[] }> = {}) => ({
  date,
  moon: { lunarPhase: over.phase ?? 'waxing-crescent', sign: over.sign ?? 'Aries' },
  retrogrades: over.retrogrades ?? [],
  transits: [],
}) as unknown as EphemerisDay

const row = (type: string, key: string, size: number, evidence: unknown = []): PatternRowForThreads => ({
  pattern_type: type, pattern_key: key, sample_size: size, first_seen: '2025-03-04', last_seen: '2026-08-19', evidence,
})

describe('selectReturningPatterns', () => {
  const week = { periodStart: '2026-11-02', periodEnd: '2026-11-08' }
  const days = [day('2026-11-01', { phase: 'full' }), day('2026-11-03', { retrogrades: ['Mercury'] }), day('2026-11-05', { phase: 'full', sign: 'Taurus' }), day('2026-11-20', { retrogrades: ['Mars'] })]

  it('keeps established patterns whose sky was overhead in the window', () => {
    const picked = selectReturningPatterns([row('retrograde', 'Mercury', 6), row('retrograde', 'Mars', 9), row('lunar_phase', 'Full', 5)], days, week)
    assert.deepEqual(picked.map(p => p.label), ['Mercury retrograde', 'Full Moon'])
    assert.deepEqual(picked[0], { label: 'Mercury retrograde', entries: 6, firstSeen: '2025-03-04', lastSeen: '2026-08-19' })
  })
  it('leaves out a pattern that is still forming', () => {
    assert.deepEqual(selectReturningPatterns([row('retrograde', 'Mercury', 3)], days, week), [])
  })
  it('in a month, counts a moon pattern only when the member wrote under it that month', () => {
    const month = { periodStart: '2026-11-01', periodEnd: '2026-11-30' }
    assert.deepEqual(selectReturningPatterns([row('lunar_phase', 'Full', 5)], days, month), [])
    const written = row('lunar_phase', 'Full', 5, [{ entry_id: 'a', entry_date: '2026-11-05', title: 'private title' }])
    assert.deepEqual(selectReturningPatterns([written], days, month).map(p => p.label), ['Full Moon'])
    // A retrograde is not always overhead, so it counts without an entry.
    assert.deepEqual(selectReturningPatterns([row('retrograde', 'Mars', 9)], days, month).map(p => p.label), ['Mars retrograde'])
  })
  it('names at most three, the most written-under first', () => {
    const many = ['Mercury', 'Venus', 'Mars', 'Jupiter'].map((planet, i) => row('retrograde', planet, 4 + i))
    const all = [day('2026-11-03', { retrogrades: ['Mercury', 'Venus', 'Mars', 'Jupiter'] })]
    assert.deepEqual(selectReturningPatterns(many, all, week).map(p => p.entries), [7, 6, 5])
  })
})

describe('selectReturningThemes', () => {
  const topics = [
    { capture_id: 'c1', kind: 'theme', label: 'boundaries' }, { capture_id: 'c2', kind: 'theme', label: 'boundaries' },
    { capture_id: 'c1', kind: 'mood', label: 'tender' }, { capture_id: 'c1', kind: 'theme', label: 'moving house' },
    { capture_id: 'c1', kind: 'natal_aspect', label: 'Sun square Moon' },
  ]
  it('keeps themes and moods that have come up before, with both counts', () => {
    const picked = selectReturningThemes(topics, new Map([['theme:boundaries', 9], ['mood:tender', 3], ['theme:moving house', 1]]))
    assert.deepEqual(picked, [
      { label: 'boundaries', kind: 'theme', inPeriod: 2, overall: 9 },
      { label: 'tender', kind: 'mood', inPeriod: 1, overall: 3 },
    ])
  })
  it('is empty when nothing has come up before', () => {
    assert.deepEqual(selectReturningThemes(topics, new Map()), [])
  })
})

describe('what reaches the page and the prompt', () => {
  const threads = {
    patterns: [{ label: 'Mercury retrograde', entries: 6, firstSeen: '2025-03-04', lastSeen: '2026-08-19' }],
    themes: [{ label: 'boundaries', kind: 'theme' as const, inPeriod: 2, overall: 9 }],
  }
  it('writes chips in plain words', () => {
    assert.equal(chipReturningPattern(threads.patterns[0]), 'Mercury retrograde · written under 6 times')
    assert.equal(chipReturningTheme(threads.themes[0]), 'boundaries · in 9 saved conversations')
  })
  it('gives the prompt names, counts and dates, and nothing from the entries', () => {
    const block = returningThreadsPromptBlock(threads)
    assert.match(block, /Mercury retrograde: 6 journal entries across all time, first in Mar 2025, most recently in Aug 2026/)
    assert.match(block, /boundaries \(theme\): 2 this period, 9 across all saved conversations/)
    assert.doesNotMatch(block, /private title/)
  })
  it('adds nothing to the prompt when there is nothing to name', () => {
    assert.equal(returningThreadsPromptBlock(undefined), '')
    assert.equal(returningThreadsPromptBlock({ patterns: [], themes: [] }), '')
  })
})

describe('month links from a star or a pattern', () => {
  it('labels a month and opens it in Reviews', () => {
    assert.equal(monthLabel('2026-10'), 'Oct 2026')
    assert.equal(monthReviewHref('2026-03'), '/reviews?year=2026&month=3')
  })
})
