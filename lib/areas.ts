import type { MonthBlueprint, NatalChart, Planet, WeekBlueprint, ZodiacSign } from '@/types/blueprint'

export type AreaEnergyMode = 'building' | 'opening' | 'stabilizing' | 'recalibrating'

export interface AreaYearNarrative {
  theme: string
  direction: string
}

export interface AreaDefinition {
  slug: string
  name: string
  summary: string
  plannerPrompt: string
  primaryHouses: number[]
  secondaryHouses: number[]
  supportStrategies: string[]
  energyMode: AreaEnergyMode
  yearThemeTemplate: string
  interpretationLead: string
}

const ZODIAC_ORDER: ZodiacSign[] = [
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
]

const SIGN_RULERS: Record<ZodiacSign, Planet> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Pluto',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
}

const AREA_DEFINITIONS: AreaDefinition[] = [
  {
    slug: 'relationships',
    name: 'Relationships',
    summary: 'Partnership, intimacy, reciprocity, and the patterns that shape how you meet other people.',
    plannerPrompt: 'Track when connection wants openness, repair, honesty, or stronger boundaries.',
    primaryHouses: [7, 5, 8],
    secondaryHouses: [1, 11],
    supportStrategies: [
      'Use high-clarity windows for honest conversations and future planning.',
      'Use reflective windows to review patterns, expectations, and boundaries.',
      'Let the planner hold rituals for reconnection, softness, and repair.',
    ],
    energyMode: 'opening',
    yearThemeTemplate: 'Connection deepens through candor, reciprocity, and chosen intimacy.',
    interpretationLead: 'This year asks your relationships to become more mutual, more intentional, and less performative.',
  },
  {
    slug: 'financial',
    name: 'Financial',
    summary: 'Personal resources, shared money, security, value, and the long arc of material stability.',
    plannerPrompt: 'Track when the chart supports earning, organizing, renegotiating, saving, or reviewing obligations.',
    primaryHouses: [2, 8, 11],
    secondaryHouses: [6, 10],
    supportStrategies: [
      'Use growth windows for pricing, asking, and expanding income channels.',
      'Use sober windows for budgeting, repayment, and simplifying obligations.',
      'Use monthly reviews to connect money decisions with long-term safety.',
    ],
    energyMode: 'stabilizing',
    yearThemeTemplate: 'Security strengthens through structure, wiser exchange, and steadier stewardship.',
    interpretationLead: 'This year wants money to feel less reactive and more designed, with value, support, and sustainability working together.',
  },
  {
    slug: 'work-career',
    name: 'Work & Career',
    summary: 'Vocation, visibility, daily work rhythm, mastery, and the way your effort meets the world.',
    plannerPrompt: 'Track when the sky supports visibility, strategic effort, restructuring, and sustainable momentum.',
    primaryHouses: [10, 6, 2],
    secondaryHouses: [11, 1],
    supportStrategies: [
      'Use activation windows for launches, asks, applications, or leadership moves.',
      'Use maintenance windows to improve systems, routines, and energy management.',
      'Use reflective windows to realign ambition with the work that actually matters.',
    ],
    energyMode: 'building',
    yearThemeTemplate: 'Visibility compounds through disciplined craft, strategic positioning, and sustainable momentum.',
    interpretationLead: 'This year wants your work life to move from private effort into clearer structure, recognition, and traction.',
  },
]

const PLANET_LABELS: Record<keyof Omit<NatalChart, 'rising' | 'birthTimeUnknown'>, Planet> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
}

export function slugifyAreaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canonicalAreaName(name: string): string {
  const normalized = normalizeName(name)
  const match = AREA_DEFINITIONS.find((area) => normalizeName(area.name) === normalized || area.slug === slugifyAreaName(name))
  return match?.name ?? name
}

export function getAreaDefinition(nameOrSlug: string): AreaDefinition {
  const normalized = normalizeName(nameOrSlug)
  const match = AREA_DEFINITIONS.find((area) => normalizeName(area.name) === normalized || area.slug === slugifyAreaName(nameOrSlug))
  if (match) return match

  return {
    slug: slugifyAreaName(nameOrSlug),
    name: nameOrSlug,
    summary: 'A personalized life area inside your planner, ready to be interpreted through timing, focus, and yearly themes.',
    plannerPrompt: 'Use this area to connect your goals with the moments that feel most supportive.',
    primaryHouses: [],
    secondaryHouses: [],
    supportStrategies: [
      'Name what matters in this area and link it to the planner.',
      'Use active weeks to move, and quieter weeks to review.',
      'Let reflection notes build the meaning of the year over time.',
    ],
    energyMode: 'recalibrating',
    yearThemeTemplate: 'This area evolves through clearer intention, better timing, and consistent attention.',
    interpretationLead: 'This part of life is asking for a more conscious rhythm so it can become easier to track, shape, and support.',
  }
}

export function houseSign(rising: ZodiacSign, house: number): ZodiacSign {
  const risingIndex = ZODIAC_ORDER.indexOf(rising)
  return ZODIAC_ORDER[(risingIndex + house - 1) % 12]
}

export function houseRuler(rising: ZodiacSign, house: number): Planet {
  return SIGN_RULERS[houseSign(rising, house)]
}

export function areaHouseDetails(nameOrSlug: string, natalChart: NatalChart | null) {
  const definition = getAreaDefinition(nameOrSlug)

  return definition.primaryHouses.map((house) => ({
    house,
    sign: natalChart ? houseSign(natalChart.rising, house) : null,
    ruler: natalChart ? houseRuler(natalChart.rising, house) : null,
  }))
}

export function areaNatalPlanets(nameOrSlug: string, natalChart: NatalChart | null) {
  if (!natalChart) return []

  const houses = new Set(getAreaDefinition(nameOrSlug).primaryHouses)

  return Object.entries(PLANET_LABELS)
    .map(([key, planet]) => {
      const placement = natalChart[key as keyof typeof PLANET_LABELS]
      return {
        planet,
        sign: placement.sign,
        degree: placement.degree,
        house: placement.house,
      }
    })
    .filter((placement) => houses.has(placement.house))
}

export function areaActivationWeeks(nameOrSlug: string, weeks: WeekBlueprint[]) {
  const areaName = canonicalAreaName(nameOrSlug)
  return weeks.filter((week) =>
    week.goalCategoryFocus.some((focus) => normalizeName(focus) === normalizeName(areaName))
  )
}

export function areaActivationMonths(nameOrSlug: string, months: MonthBlueprint[], weeks: WeekBlueprint[]) {
  const activeMonthNumbers = new Set(
    areaActivationWeeks(nameOrSlug, weeks).map((week) => Number.parseInt(week.startDate.slice(5, 7), 10))
  )

  return months.filter((month) => activeMonthNumbers.has(month.month))
}

export function buildAreaYearNarrative({
  nameOrSlug,
  blueprintTheme,
  blueprintSummary,
  natalChart,
  weeks,
}: {
  nameOrSlug: string
  blueprintTheme?: string | null
  blueprintSummary?: string | null
  natalChart: NatalChart | null
  weeks: WeekBlueprint[]
}): AreaYearNarrative {
  const area = getAreaDefinition(nameOrSlug)
  const activeWeeks = areaActivationWeeks(nameOrSlug, weeks)
  const currentWindow = activeWeeks.find((week) => isDateInRange(todayISO(), week.startDate, week.endDate)) ?? activeWeeks[0] ?? null
  const houseDetails = areaHouseDetails(nameOrSlug, natalChart)
  const natalPlacements = areaNatalPlanets(nameOrSlug, natalChart)

  const houseSentence =
    houseDetails.length > 0
      ? `The emphasis runs through ${formatHouseCluster(houseDetails.map((detail) => detail.house))}, linking ${formatList(houseDetails.map((detail) => HOUSE_TOPICS[detail.house] ?? `House ${detail.house}`))} into one story.`
      : 'Its chart mapping is still open, so the meaning is being carried more by timing and intention than by house structure.'

  const placementSentence =
    natalPlacements.length > 0
      ? `Natal anchors already living here include ${formatList(
          natalPlacements.slice(0, 3).map((placement) => `${placement.planet} in ${placement.sign}`)
        )}, which gives this area an existing tone before the yearly transits even arrive.`
      : 'Even without natal planets in the primary houses, this area can still become loud through ruler movement, seasonal focus, and repeated attention.'

  const windowSentence = currentWindow
    ? `Its clearest timing window right now is "${currentWindow.theme}," so this is a year to work with momentum when it appears rather than waiting for perfect certainty.`
    : activeWeeks.length > 0
      ? `It receives ${activeWeeks.length} dedicated timing windows this year, which means progress comes from honoring the openings instead of treating every month the same.`
      : 'Dedicated timing windows have not been generated yet, so the strongest guidance for now is the area itself and the houses it activates.'

  const globalThemeSentence = blueprintTheme
    ? `The wider annual pattern of "${blueprintTheme}" lands here in a specifically ${area.energyMode} way.`
    : blueprintSummary
      ? 'The wider yearly blueprint already points toward this area as one of the places where the overall story becomes practical.'
      : ''

  return {
    theme: area.yearThemeTemplate,
    direction: [
      area.interpretationLead,
      globalThemeSentence,
      houseSentence,
      placementSentence,
      windowSentence,
    ]
      .filter(Boolean)
      .join(' '),
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return startDate <= date && date <= endDate
}

function formatHouseCluster(houses: number[]) {
  return formatList(houses.map((house) => `Houses ${house}`.replace('Houses ', 'House ')))
}

function formatList(items: string[]) {
  const uniqueItems = [...new Set(items.filter(Boolean))]

  if (uniqueItems.length === 0) return ''
  if (uniqueItems.length === 1) return uniqueItems[0]
  if (uniqueItems.length === 2) return `${uniqueItems[0]} and ${uniqueItems[1]}`

  return `${uniqueItems.slice(0, -1).join(', ')}, and ${uniqueItems.at(-1)}`
}

const HOUSE_TOPICS: Record<number, string> = {
  1: 'identity and self-direction',
  2: 'resources and self-worth',
  3: 'communication and everyday movement',
  4: 'home and emotional foundations',
  5: 'creativity, romance, and pleasure',
  6: 'routines, labor, and maintenance',
  7: 'partnership and reciprocity',
  8: 'intimacy, trust, and shared stakes',
  9: 'meaning, learning, and perspective',
  10: 'vocation, visibility, and public life',
  11: 'community, support, and future direction',
  12: 'rest, retreat, and hidden processes',
}
