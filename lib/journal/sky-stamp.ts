/**
 * The sky above a journal entry, as the editor stamps it, and whether the
 * member has written under that sky before. Pure: no server imports.
 * Run tests: npx tsx --test lib/journal/__tests__/sky-stamp.test.ts
 */
import type { EphemerisDay } from '@/types/blueprint'
import { humanizeLunarPhase } from './intelligence'
import { overheadPatterns, type PatternRowForHome } from '@/lib/insights/home'

export interface WrittenUnder {
  label: string
  glyph: string
  /** Entries already written under this sky. */
  entries: number
  /** "eighth": the ordinal this entry would be. */
  ordinal: string
  /** The pattern's row id, for the link to the Patterns page. */
  id?: string
}

export interface SkyStamp {
  date: string
  moonPhase: string
  moonSign: string
  /** 0 new, 0.5 full, back to 1: what the moon glyph draws. */
  moonGlyphPhase: number
  retrogrades: string[]
  /** The sky overhead that the member has written under most, if any. */
  writtenUnder: WrittenUnder | null
}

const ORDINALS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

/** "eighth" up to tenth, then "11th", "22nd", "103rd". */
export function ordinalWord(n: number): string {
  if (Number.isInteger(n) && n >= 1 && n < ORDINALS.length) return ORDINALS[n]
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** Moon position for MoonGlyph: waxing runs 0 to 0.5, waning 0.5 to 1. */
export function moonGlyphPhase(day: Pick<EphemerisDay, 'moon'>): number {
  const phase = day.moon.lunarPhase
  const lit = Math.max(0, Math.min(1, day.moon.illumination))
  if (phase === 'new') return 0
  if (phase === 'full') return 0.5
  const waning = phase.startsWith('waning') || phase === 'last-quarter'
  return waning ? 1 - lit / 2 : lit / 2
}

/**
 * The stamp for one day. `patterns` are the member's pattern rows; only the
 * sky they share with the day, and how many entries sit under it, are used.
 * Never carries entry dates or text.
 */
export function buildSkyStamp(day: EphemerisDay | null | undefined, patterns: PatternRowForHome[]): SkyStamp | null {
  if (!day) return null
  const top = overheadPatterns(patterns, day, 1)[0]
  return {
    date: day.date,
    moonPhase: humanizeLunarPhase(day.moon.lunarPhase),
    moonSign: day.moon.sign,
    moonGlyphPhase: moonGlyphPhase(day),
    retrogrades: [...day.retrogrades],
    writtenUnder: top
      ? { label: top.label, glyph: top.glyph, entries: top.entries, ordinal: ordinalWord(top.entries + 1), ...(top.id ? { id: top.id } : {}) }
      : null,
  }
}

/** "You have written under Saturn square your Moon 7 times. This would be the eighth." */
export function writtenUnderLine(w: WrittenUnder): string {
  const times = w.entries === 1 ? 'once' : `${w.entries} times`
  return `You have written under ${w.label} ${times}. This would be the ${w.ordinal}.`
}
