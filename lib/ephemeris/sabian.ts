/**
 * Sabian symbols — 360-degree zodiac lookup.
 *
 * Each integer degree of the zodiac (1–360) carries a symbolic image. The
 * Sun's degree on a given day gives that day's symbol. We use 1-based
 * indexing because "1° Aries" is degree 1, not degree 0, in the traditional
 * system.
 *
 * Source notes
 * ─────────────
 * The classical 1925 Marc Edmund Jones / Elsie Wheeler set is public domain
 * in the United States. Dane Rudhyar's 1973 reformulations in *An
 * Astrological Mandala* are derivative interpretations whose public-domain
 * status is murkier — we treat them as quotable in small numbers with
 * attribution, not bulk-reproduced.
 *
 * v1 coverage
 * ────────────
 * 32 transcribed entries (Rudhyar, attributed) are anchored at the exact
 * degrees below. The remaining 328 degrees are stubbed: each returns its
 * exact degree label plus the nearest transcribed symbol as a readable
 * fallback, with `pending: true` so UI can mark them. Replacing a pending
 * entry is a single edit to TRANSCRIBED — `getSabianForDegree()` stays
 * stable.
 *
 * Roadmap
 * ────────
 * Drop in the full 360-entry vetted set (single PR, data-only) and the
 * `pending` flag on all entries flips to false. No call-site changes.
 */

interface SabianSymbol {
  /** 1-based degree, 1–360 */
  degree: number
  /** Sign + degree-within-sign label, e.g. "Aries 1°" */
  position: string
  /** The symbol itself. For pending entries, the nearest transcribed symbol. */
  symbol: string
  /** True when this degree has not yet been transcribed from source. */
  pending: boolean
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

/**
 * Transcribed Rudhyar symbols — degree → prose. These are the only entries
 * where `pending` is false. Add to this map (don't edit the generated
 * `SYMBOLS` array) when transcribing new degrees.
 */
const TRANSCRIBED: Record<number, string> = {
  1: 'A woman just risen from the sea; a seal is embracing her.',
  13: 'An unsuccessful bomb explosion.',
  25: 'A double promise reveals its inner and outer meanings.',
  37: 'The woman of Samaria at the ancestral well.',
  49: 'A new continent rising out of the ocean.',
  61: 'A glass-bottomed boat reveals undersea wonders.',
  73: 'A famous pianist giving a concert performance.',
  85: 'A man, trimming palms, displays a vain self-importance.',
  97: 'Two fairies dancing on a moonlit night.',
  109: 'A priest performing a marriage ceremony.',
  121: 'Blood rushes to a man’s head as his vital energies are mobilized under the spur of his ambition.',
  133: 'An old sea captain rocking on the porch of his cottage.',
  145: 'A large camel crossing a vast and forbidding desert.',
  157: 'A harem.',
  169: 'A swimming race.',
  181: 'A butterfly preserved and made perfect with a dart through it.',
  193: 'Children blowing soap bubbles.',
  205: 'The sight of an autumn leaf brings to a pilgrim the sudden revelation of the mystery of life and death.',
  217: 'Deep-sea divers.',
  224: 'Telephone linemen at work installing new connections.',
  229: 'A parrot listening and then talking, repeats a conversation he has overheard.',
  241: 'A grand army of veterans on parade.',
  253: 'A widow’s past is brought to light.',
  265: 'A chubby boy on a hobby-horse.',
  277: 'A veiled prophet of power.',
  289: 'A child of about five carrying a huge shopping bag filled with groceries.',
  301: 'An old adobe mission in California.',
  313: 'A barometer.',
  325: 'A butterfly with the right wing more perfectly formed.',
  337: 'A cross lying on rocks surrounded by sea and mist.',
  349: 'A master instructing his pupil.',
  360: 'A majestic rock formation resembling a face is idealized by a boy who takes it as his ideal of greatness.',
}

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

/**
 * Fully-populated 1..360 lookup, indexed by `degree - 1`. Built once at
 * module load by anchoring on TRANSCRIBED and filling gaps with the
 * nearest transcribed prose as a graceful fallback.
 */
const SYMBOLS: readonly SabianSymbol[] = (() => {
  const transcribedDegrees = Object.keys(TRANSCRIBED)
    .map((k) => Number.parseInt(k, 10))
    .sort((a, b) => a - b)

  function nearestTranscribed(degree: number): number {
    let best = transcribedDegrees[0]
    let bestDistance = Math.abs(best - degree)
    for (const candidate of transcribedDegrees) {
      const d = Math.abs(candidate - degree)
      if (d < bestDistance) {
        best = candidate
        bestDistance = d
      }
    }
    return best
  }

  const out: SabianSymbol[] = []
  for (let degree = 1; degree <= 360; degree++) {
    const transcribed = TRANSCRIBED[degree]
    if (transcribed) {
      out.push({
        degree,
        position: formatZodiacPosition(degree),
        symbol: transcribed,
        pending: false,
      })
    } else {
      const anchor = nearestTranscribed(degree)
      out.push({
        degree,
        position: formatZodiacPosition(degree),
        symbol: TRANSCRIBED[anchor],
        pending: true,
      })
    }
  }
  return Object.freeze(out)
})()

/**
 * Look up the Sabian symbol for a given zodiac degree. Always returns an
 * entry whose `position` matches the requested degree exactly. Entries
 * flagged `pending: true` carry the nearest transcribed symbol as a
 * readable placeholder until source-vetted prose is added to TRANSCRIBED.
 */
export function getSabianForDegree(zodiacDegree: number): SabianSymbol {
  const target = normalizeDegree(zodiacDegree)
  return SYMBOLS[target - 1]
}

export type { SabianSymbol }
