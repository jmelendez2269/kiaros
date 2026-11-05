/**
 * Patterns page helpers: sky-present days, strips and constellation layout.
 * Run: npx tsx --test lib/insights/__tests__/pattern-sky.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { EphemerisDay } from '@/types/blueprint'
import { dayMatchesPattern, layoutConstellations, patternGlyph, patternTitle, skyPresentDates, toRuns, yearFraction } from '@/lib/insights/pattern-sky'

const day = (date: string, phase: string, sign: string, retro: string[] = [], transits: Array<[string, string, string]> = []) => ({
  date,
  sun: { longitude: 0, sign: 'Aries', degree: 0 },
  moon: { longitude: 0, sign, degree: 0, lunarPhase: phase, illumination: 0 },
  transits: transits.map(([planet, aspect, natalPlanet]) => ({ date, planet, aspect, natalPlanet, transitLongitude: 0, natalLongitude: 0, orb: 1, applying: true })),
  retrogrades: retro,
}) as unknown as EphemerisDay

const days = [
  day('2026-03-01', 'waning-crescent', 'Scorpio', ['Mercury'], [['Saturn', 'square', 'Moon']]),
  day('2026-03-02', 'waning-crescent', 'Scorpio', ['Mercury']),
  day('2026-03-03', 'new', 'Sagittarius'),
  day('2026-03-04', 'waning-crescent', 'Sagittarius'),
]

describe('sky present', () => {
  it('matches each pattern type with the same keys entries are stamped with', () => {
    assert.ok(dayMatchesPattern(days[0], 'lunar_phase', 'Waning Crescent'))
    assert.ok(dayMatchesPattern(days[0], 'lunar_sign', 'Scorpio'))
    assert.ok(dayMatchesPattern(days[0], 'retrograde', 'Mercury'))
    assert.ok(dayMatchesPattern(days[0], 'aspect', 'Saturn:square:Moon'))
    assert.ok(!dayMatchesPattern(days[1], 'aspect', 'Saturn:square:Moon'))
    assert.ok(!dayMatchesPattern(days[0], 'unknown', 'x'))
  })

  it('lists the dates and merges consecutive ones into runs', () => {
    const dates = skyPresentDates(days, 'lunar_phase', 'Waning Crescent')
    assert.deepEqual(dates, ['2026-03-01', '2026-03-02', '2026-03-04'])
    assert.deepEqual(toRuns(dates), [['2026-03-01', '2026-03-02'], ['2026-03-04', '2026-03-04']])
    assert.deepEqual(toRuns(['2026-12-31', '2027-01-01']), [['2026-12-31', '2027-01-01']], 'runs cross the year boundary')
  })

  it('places dates across the year', () => {
    assert.equal(yearFraction('2026-01-01', 2026) < 0.01, true)
    assert.equal(yearFraction('2026-07-02', 2026) > 0.49 && yearFraction('2026-07-02', 2026) < 0.51, true)
    assert.equal(yearFraction('2027-03-01', 2026), 1, 'clamped')
  })
})

describe('labels', () => {
  it('reads naturally', () => {
    assert.equal(patternTitle('aspect', 'Saturn:square:Moon'), 'Saturn square your Moon')
    assert.equal(patternTitle('lunar_phase', 'Waning Crescent'), 'Waning Crescent Moon')
    assert.equal(patternTitle('lunar_sign', 'Scorpio'), 'Moon in Scorpio')
    assert.equal(patternTitle('retrograde', 'Mercury'), 'Mercury retrograde')
    assert.equal(patternGlyph('aspect', 'Saturn:square:Moon'), '♄□☽')
    assert.equal(patternGlyph('lunar_sign', 'Scorpio'), '♏︎')
  })
})

describe('constellation layout', () => {
  const input = [{ id: 'a', stars: 11 }, { id: 'b', stars: 3 }, { id: 'c', stars: 30 }, { id: 'd', stars: 1 }, { id: 'e', stars: 6 }]
  const layout = layoutConstellations(input, 1000, 380)

  it('gives one star per entry, capped at 14, inside the canvas', () => {
    assert.equal(layout.a.stars.length, 11)
    assert.equal(layout.c.stars.length, 14)
    assert.equal(layout.d.stars.length, 1)
    for (const { stars } of Object.values(layout)) for (const s of stars) {
      assert.ok(s.x >= 0 && s.x <= 1000 && s.y >= 0 && s.y <= 380, `star at ${s.x},${s.y}`)
    }
  })

  it('is stable for the same pattern', () => {
    assert.deepEqual(layoutConstellations(input, 1000, 380), layout)
  })
})
