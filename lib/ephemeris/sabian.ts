/**
 * Sabian symbols — Dane Rudhyar's 1953 set (public domain).
 *
 * Each degree of the zodiac (1–360) has a symbolic image. The Sun's degree
 * on a given day gives that day's symbol. We use 1-based indexing because
 * "1° Aries" is degree 1, not degree 0, in the traditional system.
 *
 * v1 placeholder coverage: 30 sample symbols (one per ~12°). The full 360
 * list is queued as a data-only follow-up — see TODO below. Until then,
 * getSabianForDegree() returns the nearest sample plus a degree label.
 */

interface SabianSymbol {
  /** 1-based degree, 1–360 */
  degree: number
  /** Sign + degree-within-sign label, e.g. "Aries 1°" */
  position: string
  /** The symbol itself, Rudhyar's wording. */
  symbol: string
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
 * TODO: replace with the full 360-symbol Rudhyar list. The sample below
 * covers one symbol per ~12° so the SkyBanner always renders something
 * thematically appropriate to the season. Full data lands in a follow-up
 * PR alongside an attribution note.
 */
const SAMPLES: SabianSymbol[] = [
  { degree: 1, position: 'Aries 1°', symbol: 'A woman just risen from the sea; a seal is embracing her.' },
  { degree: 13, position: 'Aries 13°', symbol: 'An unsuccessful bomb explosion.' },
  { degree: 25, position: 'Aries 25°', symbol: 'A double promise reveals its inner and outer meanings.' },
  { degree: 37, position: 'Taurus 7°', symbol: 'The woman of Samaria at the ancestral well.' },
  { degree: 49, position: 'Taurus 19°', symbol: 'A new continent rising out of the ocean.' },
  { degree: 61, position: 'Gemini 1°', symbol: 'A glass-bottomed boat reveals undersea wonders.' },
  { degree: 73, position: 'Gemini 13°', symbol: 'A famous pianist giving a concert performance.' },
  { degree: 85, position: 'Gemini 25°', symbol: 'A man, trimming palms, displays a vain self-importance.' },
  { degree: 97, position: 'Cancer 7°', symbol: 'Two fairies dancing on a moonlit night.' },
  { degree: 109, position: 'Cancer 19°', symbol: 'A priest performing a marriage ceremony.' },
  { degree: 121, position: 'Leo 1°', symbol: 'Blood rushes to a man’s head as his vital energies are mobilized under the spur of his ambition.' },
  { degree: 133, position: 'Leo 13°', symbol: 'An old sea captain rocking on the porch of his cottage.' },
  { degree: 145, position: 'Leo 25°', symbol: 'A large camel crossing a vast and forbidding desert.' },
  { degree: 157, position: 'Virgo 7°', symbol: 'A harem.' },
  { degree: 169, position: 'Virgo 19°', symbol: 'A swimming race.' },
  { degree: 181, position: 'Libra 1°', symbol: 'A butterfly preserved and made perfect with a dart through it.' },
  { degree: 193, position: 'Libra 13°', symbol: 'Children blowing soap bubbles.' },
  { degree: 205, position: 'Libra 25°', symbol: 'The sight of an autumn leaf brings to a pilgrim the sudden revelation of the mystery of life and death.' },
  { degree: 217, position: 'Scorpio 7°', symbol: 'Deep-sea divers.' },
  { degree: 224, position: 'Scorpio 14°', symbol: 'Telephone linemen at work installing new connections.' },
  { degree: 229, position: 'Scorpio 19°', symbol: 'A parrot listening and then talking, repeats a conversation he has overheard.' },
  { degree: 241, position: 'Sagittarius 1°', symbol: 'A grand army of veterans on parade.' },
  { degree: 253, position: 'Sagittarius 13°', symbol: 'A widow’s past is brought to light.' },
  { degree: 265, position: 'Sagittarius 25°', symbol: 'A chubby boy on a hobby-horse.' },
  { degree: 277, position: 'Capricorn 7°', symbol: 'A veiled prophet of power.' },
  { degree: 289, position: 'Capricorn 19°', symbol: 'A child of about five carrying a huge shopping bag filled with groceries.' },
  { degree: 301, position: 'Aquarius 1°', symbol: 'An old adobe mission in California.' },
  { degree: 313, position: 'Aquarius 13°', symbol: 'A barometer.' },
  { degree: 325, position: 'Aquarius 25°', symbol: 'A butterfly with the right wing more perfectly formed.' },
  { degree: 337, position: 'Pisces 7°', symbol: 'A cross lying on rocks surrounded by sea and mist.' },
  { degree: 349, position: 'Pisces 19°', symbol: 'A master instructing his pupil.' },
  { degree: 360, position: 'Pisces 30°', symbol: 'A majestic rock formation resembling a face is idealized by a boy who takes it as his ideal of greatness.' },
]

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
 * Look up the nearest available Sabian symbol for a given zodiac degree.
 * Returns the symbol whose `degree` is closest to the requested degree.
 */
export function getSabianForDegree(zodiacDegree: number): SabianSymbol {
  const target = normalizeDegree(zodiacDegree)
  let best = SAMPLES[0]
  let bestDistance = Math.abs(SAMPLES[0].degree - target)
  for (const candidate of SAMPLES) {
    const d = Math.abs(candidate.degree - target)
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  // Override the position label to the actual requested degree so callers
  // see "14° Scorpio" instead of the sample's anchor degree.
  return { ...best, position: formatZodiacPosition(target) }
}

export type { SabianSymbol }
