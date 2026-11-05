/**
 * Pure helpers for the Patterns page: when each pattern's sky was present,
 * the marks on a year strip, and a stable constellation layout. No server
 * imports, so it is unit-testable.
 */

import type { EphemerisDay } from '@/types/blueprint'

export type PatternKind = 'lunar_phase' | 'lunar_sign' | 'aspect' | 'retrograde'

function humanizePhase(phase: string): string {
  return phase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Whether a day's sky matches a pattern, using the same keys that journal
 * entries are stamped with (see lib/journal/intelligence.ts).
 */
export function dayMatchesPattern(day: EphemerisDay, type: string, key: string): boolean {
  if (type === 'lunar_phase') return humanizePhase(day.moon.lunarPhase) === key
  if (type === 'lunar_sign') return day.moon.sign === key
  if (type === 'retrograde') return day.retrogrades.includes(key as EphemerisDay['retrogrades'][number])
  if (type === 'aspect') return day.transits.some(t => `${t.planet}:${t.aspect}:${t.natalPlanet}` === key)
  return false
}

/** Dates in the year (YYYY-MM-DD) when the pattern's sky was overhead. */
export function skyPresentDates(days: EphemerisDay[], type: string, key: string): string[] {
  return days.filter(d => dayMatchesPattern(d, type, key)).map(d => d.date)
}

/** Consecutive dates merged into [start, end] runs, for drawing bands. */
export function toRuns(dates: string[]): Array<[string, string]> {
  const sorted = [...new Set(dates)].sort()
  const runs: Array<[string, string]> = []
  for (const date of sorted) {
    const last = runs.at(-1)
    if (last && dayAfter(last[1]) === date) last[1] = date
    else runs.push([date, date])
  }
  return runs
}

function dayAfter(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** 0..1 position of a date across its year, for strips. */
export function yearFraction(date: string, year: number): number {
  const start = Date.UTC(year, 0, 1), end = Date.UTC(year + 1, 0, 1)
  return Math.min(1, Math.max(0, (Date.parse(date + 'T12:00:00Z') - start) / (end - start)))
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Ascendant: 'AC', Midheaven: 'MC', NorthNode: '☊', Chiron: '⚷',
}
const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}
const PHASE_GLYPH: Record<string, string> = {
  'New': '●', 'Waxing Crescent': '☽', 'First Quarter': '◐', 'Waxing Gibbous': '◑', 'Full': '○', 'Waning Gibbous': '◑', 'Last Quarter': '◑', 'Waning Crescent': '☾',
}
const ASPECT_GLYPH: Record<string, string> = { conjunction: '☌', square: '□', opposition: '☍', trine: '△', sextile: '⚹' }

export function patternGlyph(type: string, key: string): string {
  if (type === 'lunar_phase') return PHASE_GLYPH[key] ?? '☾'
  // U+FE0E asks for the text symbol, not the emoji tile some systems draw.
  if (type === 'lunar_sign') return SIGN_GLYPH[key] ? `${SIGN_GLYPH[key]}︎` : '☽'
  if (type === 'retrograde') return PLANET_GLYPH[key] ?? '℞'
  if (type === 'aspect') {
    const [planet, aspect, natal] = key.split(':')
    return `${PLANET_GLYPH[planet] ?? ''}${ASPECT_GLYPH[aspect] ?? ''}${PLANET_GLYPH[natal] ?? ''}` || '✦'
  }
  return '✦'
}

/** "Saturn square your Moon" rather than "Saturn square Moon". */
export function patternTitle(type: string, key: string): string {
  if (type === 'aspect') {
    const [planet, aspect, natal] = key.split(':')
    return `${planet} ${aspect} your ${natal}`
  }
  if (type === 'lunar_phase') return `${key} Moon`
  if (type === 'lunar_sign') return `Moon in ${key}`
  if (type === 'retrograde') return `${key} retrograde`
  return key
}

export const TYPE_COLOR: Record<string, string> = {
  lunar_phase: '#a98aef', lunar_sign: '#bba3f3', aspect: '#7aa8d8', retrograde: '#c1dcef',
}

/** A small, stable pseudo-random generator seeded from a string. */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export interface ConstellationLayout {
  cx: number
  cy: number
  stars: Array<{ x: number; y: number }>
}

/**
 * Places up to `count` constellations on a canvas and draws each one's stars
 * as a seeded walk in entry order, so the same pattern always looks the same.
 */
export function layoutConstellations(
  patterns: Array<{ id: string; stars: number }>,
  width: number,
  height: number,
): Record<string, ConstellationLayout> {
  const n = patterns.length
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4
  const rows = Math.max(1, Math.ceil(n / Math.max(1, cols)))
  const cellW = width / Math.max(1, cols), cellH = height / rows
  const out: Record<string, ConstellationLayout> = {}
  patterns.forEach((p, i) => {
    const rand = seeded(p.id)
    const col = i % cols, row = Math.floor(i / cols)
    // Stagger alternate rows so the sky does not look like a grid.
    const cx = cellW * (col + 0.5) + (row % 2 ? cellW * 0.12 : -cellW * 0.06) + (rand() - 0.5) * cellW * 0.15
    const cy = cellH * (row + 0.55) + (rand() - 0.5) * cellH * 0.18
    const radius = Math.min(cellW, cellH) * (0.22 + Math.min(p.stars, 14) * 0.016)
    const stars: Array<{ x: number; y: number }> = []
    let angle = rand() * Math.PI * 2
    let x = cx + (rand() - 0.5) * radius * 0.6, y = cy + (rand() - 0.5) * radius * 0.4
    for (let s = 0; s < Math.min(p.stars, 14); s++) {
      stars.push({ x, y })
      angle += (rand() - 0.35) * 1.9
      const step = radius * (0.32 + rand() * 0.3)
      x = Math.min(cx + radius * 1.3, Math.max(cx - radius * 1.3, x + Math.cos(angle) * step))
      y = Math.min(cy + radius * 0.8, Math.max(cy - radius * 0.8, y + Math.sin(angle) * step * 0.7))
    }
    out[p.id] = { cx, cy, stars }
  })
  return out
}
