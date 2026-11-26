/**
 * Journal sky stamp: the moon, the sky overhead and the "this would be the Nth" count.
 * Run: npx tsx --test lib/journal/__tests__/sky-stamp.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { EphemerisDay } from '@/types/blueprint'
import { buildSkyStamp, moonGlyphPhase, ordinalWord, writtenUnderLine } from '../sky-stamp'

const day = (over: Partial<EphemerisDay['moon']> = {}, retrogrades: string[] = ['Mercury'], transits: unknown[] = []) =>
  ({ date: '2026-11-19', moon: { lunarPhase: 'waxing-crescent', sign: 'Sagittarius', illumination: 0.2, ...over }, retrogrades, transits }) as unknown as EphemerisDay

const rows = [
  { id: 'p1', pattern_type: 'retrograde', pattern_key: 'Mercury', sample_size: 7 },
  { id: 'p2', pattern_type: 'lunar_sign', pattern_key: 'Sagittarius', sample_size: 3 },
  { id: 'p3', pattern_type: 'lunar_phase', pattern_key: 'Waxing Crescent', sample_size: 1 },
]

describe('ordinalWord', () => {
  it('spells the first ten and numbers the rest', () => {
    assert.equal(ordinalWord(8), 'eighth')
    assert.equal(ordinalWord(11), '11th')
    assert.equal(ordinalWord(22), '22nd')
    assert.equal(ordinalWord(103), '103rd')
  })
})

describe('moonGlyphPhase', () => {
  it('runs 0 to 0.5 waxing and 0.5 to 1 waning', () => {
    assert.equal(moonGlyphPhase(day({ lunarPhase: 'new', illumination: 0 })), 0)
    assert.equal(moonGlyphPhase(day({ lunarPhase: 'full', illumination: 1 })), 0.5)
    assert.equal(moonGlyphPhase(day({ lunarPhase: 'waxing-gibbous', illumination: 0.8 })), 0.4)
    assert.ok(Math.abs(moonGlyphPhase(day({ lunarPhase: 'waning-crescent', illumination: 0.2 })) - 0.9) < 1e-9)
  })
})

describe('buildSkyStamp', () => {
  it('names the sky overhead written under most, and counts the next entry', () => {
    const stamp = buildSkyStamp(day(), rows)!
    assert.equal(stamp.moonPhase, 'Waxing Crescent')
    assert.equal(stamp.moonSign, 'Sagittarius')
    assert.equal(stamp.writtenUnder?.label, 'Mercury retrograde')
    assert.equal(stamp.writtenUnder?.ordinal, 'eighth')
    assert.equal(writtenUnderLine(stamp.writtenUnder!), 'You have written under Mercury retrograde 7 times. This would be the eighth.')
  })
  it('has no note when no overhead sky has been written under twice', () => {
    assert.equal(buildSkyStamp(day({ sign: 'Leo' } as never, []), rows)!.writtenUnder, null)
  })
  it('is null when the day has no stored sky', () => {
    assert.equal(buildSkyStamp(null, rows), null)
  })
  it('carries no entry dates or text', () => {
    const json = JSON.stringify(buildSkyStamp(day(), [{ ...rows[0], evidence: [{ entry_date: '2026-01-01' }] } as never]))
    assert.ok(!json.includes('2026-01-01'))
  })
})
