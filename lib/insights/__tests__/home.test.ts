/**
 * Insights home: which patterns are overhead today, and the brightest theme.
 * Run: npx tsx --test lib/insights/__tests__/home.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { EphemerisDay } from '@/types/blueprint'
import { brightestTheme, overheadPatterns, strongestPattern, timesWritten } from '../home'

const today = { date: '2026-11-10', moon: { lunarPhase: 'new', sign: 'Scorpio' }, retrogrades: ['Mercury'], transits: [] } as unknown as EphemerisDay
const rows = [
  { pattern_type: 'retrograde', pattern_key: 'Mercury', sample_size: 6 },
  { pattern_type: 'lunar_sign', pattern_key: 'Scorpio', sample_size: 3 },
  { pattern_type: 'lunar_phase', pattern_key: 'New', sample_size: 1 },
  { pattern_type: 'retrograde', pattern_key: 'Mars', sample_size: 9 },
]

describe('overheadPatterns', () => {
  it('names the skies overhead today that the member has written under, most first', () => {
    assert.deepEqual(overheadPatterns(rows, today).map(p => [p.label, p.entries]), [['Mercury retrograde', 6], ['Moon in Scorpio', 3]])
  })
  it('leaves out a sky with a single entry, and one that is not overhead', () => {
    const labels = overheadPatterns(rows, today).map(p => p.label)
    assert.ok(!labels.includes('New Moon'))
    assert.ok(!labels.includes('Mars retrograde'))
  })
  it('is empty when the day has no stored sky', () => {
    assert.deepEqual(overheadPatterns(rows, null), [])
  })
})

describe('strongestPattern', () => {
  it('is the sky written under most', () => {
    assert.equal(strongestPattern(rows)?.label, 'Mars retrograde')
    assert.equal(strongestPattern([{ pattern_type: 'lunar_phase', pattern_key: 'New', sample_size: 1 }]), null)
  })
})

describe('brightestTheme', () => {
  it('counts conversations, not tags, and only themes', () => {
    const topics = [
      { capture_id: 'a', kind: 'theme', label: 'boundaries' }, { capture_id: 'b', kind: 'theme', label: 'boundaries' },
      { capture_id: 'a', kind: 'theme', label: 'rest' }, { capture_id: 'c', kind: 'mood', label: 'tender' },
      { capture_id: 'a', kind: 'mood', label: 'tender' }, { capture_id: 'b', kind: 'mood', label: 'tender' },
    ]
    assert.deepEqual(brightestTheme(topics), { label: 'boundaries', count: 2, of: 3 })
    assert.equal(brightestTheme([]), null)
  })
})

describe('timesWritten', () => {
  it('reads naturally for one and for many', () => {
    assert.equal(timesWritten(1), 'written under once')
    assert.equal(timesWritten(6), 'written under 6 times')
  })
})
