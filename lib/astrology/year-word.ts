import { ZODIAC_SIGNS, type NatalChart, type ZodiacSign } from '@/types/blueprint'

const HOUSE_YEAR_WORDS: Record<number, string> = {
  1: 'Embodiment',
  2: 'Roots',
  3: 'Voice',
  4: 'Foundation',
  5: 'Expression',
  6: 'Devotion',
  7: 'Reciprocity',
  8: 'Alchemy',
  9: 'Expansion',
  10: 'Legacy',
  11: 'Alliances',
  12: 'Surrender',
}

const HOUSE_THEMES: Record<number, string> = {
  1: 'identity, vitality, and self-definition',
  2: 'values, resources, and stability',
  3: 'learning, communication, and daily rhythm',
  4: 'home, inner life, and emotional grounding',
  5: 'creativity, pleasure, and courageous self-expression',
  6: 'craft, routines, and devotional practice',
  7: 'partnership, collaboration, and mutuality',
  8: 'transformation, intimacy, and deeper trust',
  9: 'meaning, study, and widening your worldview',
  10: 'reputation, vocation, and visible leadership',
  11: 'community, belonging, and future vision',
  12: 'rest, healing, and spiritual release',
}

const SIGN_FLAVORS: Record<ZodiacSign, string> = {
  Aries: 'with courage and directness',
  Taurus: 'through steadiness and patience',
  Gemini: 'through curiosity and conversation',
  Cancer: 'through care and emotional honesty',
  Leo: 'with heart and creative visibility',
  Virgo: 'through refinement and meaningful practice',
  Libra: 'through harmony and relational intelligence',
  Scorpio: 'through depth, honesty, and transformation',
  Sagittarius: 'through faith, growth, and perspective',
  Capricorn: 'through discipline and long-range commitment',
  Aquarius: 'through originality and future-minded thinking',
  Pisces: 'through intuition, compassion, and surrender',
}

export interface AstrologicalYearWord {
  word: string
  profectionHouse: number
  profectionSign: ZodiacSign
  rationale: string
}

function calculateAgeAtDate(birthDate: string, referenceDate: Date): number {
  const birth = new Date(`${birthDate}T12:00:00`)
  let age = referenceDate.getFullYear() - birth.getFullYear()

  const hasHadBirthday =
    referenceDate.getMonth() > birth.getMonth() ||
    (referenceDate.getMonth() === birth.getMonth() && referenceDate.getDate() >= birth.getDate())

  if (!hasHadBirthday) {
    age -= 1
  }

  return Math.max(age, 0)
}

function wholeSignHouseSign(rising: ZodiacSign, house: number): ZodiacSign {
  const risingIndex = ZODIAC_SIGNS.indexOf(rising)
  return ZODIAC_SIGNS[(risingIndex + house - 1) % ZODIAC_SIGNS.length]
}

function buildReferenceDate(planYear: number): Date {
  const now = new Date()
  if (planYear === now.getFullYear()) {
    return now
  }

  return new Date(`${planYear}-07-01T12:00:00`)
}

export function deriveAstrologicalYearWord({
  birthDate,
  natalChart,
  planYear,
}: {
  birthDate: string | null | undefined
  natalChart: NatalChart | null | undefined
  planYear: number
}): AstrologicalYearWord | null {
  if (!birthDate || !natalChart?.rising) {
    return null
  }

  const referenceDate = buildReferenceDate(planYear)
  const age = calculateAgeAtDate(birthDate, referenceDate)
  const profectionHouse = (age % 12) + 1
  const profectionSign = wholeSignHouseSign(natalChart.rising, profectionHouse)
  const word = HOUSE_YEAR_WORDS[profectionHouse]
  const theme = HOUSE_THEMES[profectionHouse]
  const flavor = SIGN_FLAVORS[profectionSign]

  return {
    word,
    profectionHouse,
    profectionSign,
    rationale: `Your ${planYear} profection emphasizes the ${profectionHouse}${ordinalSuffix(profectionHouse)} house in ${profectionSign}, highlighting ${theme} ${flavor}.`,
  }
}

function ordinalSuffix(value: number): string {
  const remainderTen = value % 10
  const remainderHundred = value % 100

  if (remainderTen === 1 && remainderHundred !== 11) return 'st'
  if (remainderTen === 2 && remainderHundred !== 12) return 'nd'
  if (remainderTen === 3 && remainderHundred !== 13) return 'rd'
  return 'th'
}
