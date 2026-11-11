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

import { overheadMoonAndRetrogrades, patternHref, writtenUnderTransits } from '../home'
import { checkInRhythms, rhythmLineForPhase, type CheckInRow } from '../check-in-rhythms'

describe('Today: skies written under before', () => {
  const withAspects = [
    ...rows.map((r, i) => ({ ...r, id: `p${i}` })),
    { id: 'a1', pattern_type: 'aspect', pattern_key: 'Saturn:square:Moon', sample_size: 4 },
    { id: 'a2', pattern_type: 'aspect', pattern_key: 'Venus:trine:Sun', sample_size: 1 },
  ]
  it('marks a transit by its planet, aspect and natal point, once written under twice', () => {
    assert.deepEqual(writtenUnderTransits(withAspects), { 'Saturn:square:Moon': 4 })
  })
  it('lists the moon and retrogrades overhead, leaving transits to their own card', () => {
    const sky = { ...today, transits: [{ planet: 'Saturn', aspect: 'square', natalPlanet: 'Moon' }] } as unknown as EphemerisDay
    assert.deepEqual(overheadMoonAndRetrogrades(withAspects, sky).map(p => [p.label, p.id]), [['Mercury retrograde', 'p0'], ['Moon in Scorpio', 'p1']])
  })
  it('links to the pattern itself when it can', () => {
    assert.equal(patternHref('p0'), '/insights/map#pattern-p0')
    assert.equal(patternHref(), '/insights/map')
  })
})

describe('Today: the check-in card and the moon overhead', () => {
  const many = (n: number, phase: string, energy: number, mood: string | null = null): CheckInRow[] =>
    Array.from({ length: n }, (_, i) => ({ log_date: `2026-10-${String(i + 1).padStart(2, '0')}`, energy_level: energy, mood_tag: mood, lunar_phase: phase }))
  const rhythms = checkInRhythms([...many(4, 'Full', 2, 'tired'), ...many(8, 'New', 4), ...many(4, 'First Quarter', 3, 'open')])
  it('speaks about the phase overhead in one line', () => {
    assert.equal(rhythmLineForPhase(rhythms, 'Full'), 'Under the Full Moon, your energy has usually sat lower, around Low, and tired has come up most.')
  })
  it('handles a phase with only a mood, or only energy', () => {
    assert.equal(rhythmLineForPhase(rhythms, 'First Quarter'), 'Under the First Quarter Moon, open has come up most.')
    assert.equal(rhythmLineForPhase(rhythms, 'New'), 'Under the New Moon, your energy has usually sat higher, around Lifted.')
  })
  it('says nothing for a phase without a rhythm, or before there are enough check-ins', () => {
    assert.equal(rhythmLineForPhase(rhythms, 'Waning Crescent'), null)
    assert.equal(rhythmLineForPhase(checkInRhythms(many(3, 'Full', 1)), 'Full'), null)
    assert.equal(rhythmLineForPhase(rhythms, null), null)
  })
})
