/**
 * Sabian symbols — 360-degree zodiac lookup.
 *
 * Each integer degree of the zodiac (1–360) carries a symbolic image. The
 * Sun's degree on a given day gives that day's symbol. We use 1-based
 * indexing because "1° Aries" is degree 1, not degree 0, in the traditional
 * system.
 *
 * Source
 * ──────
 * The classical 1925 Marc Edmund Jones / Elsie Wheeler set, transcribed from
 * the third edition (Aurora Press, 1993) of *The Sabian Symbols in Astrology*.
 * Public domain in the US. See `sabian-data.ts` for the raw entries.
 *
 * 348 entries carry both the iconic image and Jones's own "This is a symbol
 * of …" interpretation sentence. The remaining 12 entries (whose pages in
 * the source PDF were column-merge garbled) carry the canonical Jones image
 * phrase but no interpretation. `getSabianForDegree()` always returns an
 * entry — the `interpretation` field is the empty string for those 12.
 */

import { SABIAN_DATA } from './sabian-data'

interface SabianSymbol {
  /** 1-based degree, 1–360. */
  degree: number
  /** Sign + degree-within-sign label, e.g. "1° Aries". */
  position: string
  /** The iconic image phrase, ending with a period. */
  symbol: string
  /**
   * Jones's "This is a symbol of …" sentence, with the leading
   * "This is a symbol of " stripped. Empty for the 12 entries whose
   * interpretation could not be cleanly recovered from the source.
   */
  interpretation: string
}

const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

function normalizeDegree(zodiacDegree: number): number {
  // Accept 0..360 or 1..360; clamp into 1..360.
  const wrapped = ((Math.floor(zodiacDegree) % 360) + 360) % 360
  return wrapped === 0 ? 360 : wrapped
}

export function formatZodiacPosition(zodiacDegree: number): string {
  const deg = normalizeDegree(zodiacDegree)
  const signIndex = Math.floor((deg - 1) / 30)
  const within = ((deg - 1) % 30) + 1
  return `${within}° ${SIGN_NAMES[signIndex]}`
}

const SYMBOLS: readonly SabianSymbol[] = Object.freeze(
  SABIAN_DATA.map((entry, i) => ({
    degree: i + 1,
    position: formatZodiacPosition(i + 1),
    symbol: entry.image,
    interpretation: entry.interpretation,
  }))
)

/**
 * Look up the Sabian symbol for a given zodiac degree. Returns an entry
 * whose `position` matches the requested degree exactly.
 */
export function getSabianForDegree(zodiacDegree: number): SabianSymbol {
  const target = normalizeDegree(zodiacDegree)
  return SYMBOLS[target - 1]
}

export type { SabianSymbol }
