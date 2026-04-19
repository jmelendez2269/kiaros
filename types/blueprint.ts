export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

export type AspectType = 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile'

export type MoonPhase = 'new' | 'first-quarter' | 'full' | 'last-quarter'

export type LunarPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent'

export type EnergyType = 'push' | 'rest' | 'reflect' | 'initiate'

// ─── Natal Chart ────────────────────────────────────────────────────────────

export interface PlanetPosition {
  longitude: number   // 0–360 geocentric ecliptic
  sign: ZodiacSign
  degree: number      // 0–30 within sign
  house: number       // 1–12, Whole Sign
  retrograde?: boolean
}

export interface NatalChart {
  sun: PlanetPosition
  moon: PlanetPosition
  mercury: PlanetPosition
  venus: PlanetPosition
  mars: PlanetPosition
  jupiter: PlanetPosition
  saturn: PlanetPosition
  uranus: PlanetPosition
  neptune: PlanetPosition
  pluto: PlanetPosition
  rising: ZodiacSign    // Ascendant sign = House 1 in Whole Sign
  birthTimeUnknown: boolean
}

// ─── Ephemeris ───────────────────────────────────────────────────────────────

export interface Transit {
  date: string          // YYYY-MM-DD
  planet: Planet
  natalPlanet: Planet
  aspect: AspectType
  transitLongitude: number
  natalLongitude: number
  orb: number           // degrees
  applying: boolean     // true = approaching exact, false = separating
}

export interface MoonPhaseEvent {
  date: string    // YYYY-MM-DD
  time: string    // HH:MM UTC
  phase: MoonPhase
  sign: ZodiacSign
  longitude: number
}

export interface RetrogradePeriod {
  planet: Planet
  startDate: string   // YYYY-MM-DD (station retrograde)
  endDate: string     // YYYY-MM-DD (station direct)
  startSign: ZodiacSign
  endSign: ZodiacSign
}

export interface EphemerisDay {
  date: string    // YYYY-MM-DD
  sun: { longitude: number; sign: ZodiacSign; degree: number }
  moon: {
    longitude: number
    sign: ZodiacSign
    degree: number
    lunarPhase: LunarPhase
    illumination: number   // 0–1
  }
  moonPhaseEvent?: MoonPhaseEvent
  transits: Transit[]
  retrogrades: Planet[]
}

export interface YearEphemeris {
  userId: string
  year: number
  startDate: string
  endDate: string
  days: EphemerisDay[]
  moonPhases: MoonPhaseEvent[]
  retrogradePeriods: RetrogradePeriod[]
  significantTransits: Transit[]   // orb ≤ 0.5° — the tightest hits
}

// ─── Blueprint Output ────────────────────────────────────────────────────────

export interface PeriodRange {
  startDate: string   // YYYY-MM-DD
  endDate: string
  reason: string
}

export interface WeekBlueprint {
  weekNumber: number   // 1-based from Jan 1
  startDate: string    // YYYY-MM-DD (Monday)
  endDate: string      // YYYY-MM-DD (Sunday)
  theme: string
  intentions: string[]  // 2–3 specific intentions
  energyType: EnergyType
  cosmicContext: string  // what's happening astrologically this week
  goalCategoryFocus: string[]  // names of goal categories this week favors
}

export interface MonthBlueprint {
  month: number   // 1–12
  name: string    // 'January' etc.
  theme: string
  intentions: string[]
  keyTransits: string[]   // human-readable: "Saturn trine your natal Venus"
  moonPhases: { phase: MoonPhase; date: string; significance: string }[]
  energyArc: string   // narrative of how energy moves through this month
}

export interface QuarterBlueprint {
  quarter: number   // 1–4
  theme: string
  intention: string   // one driving intention
  focusAreas: string[]  // goal category names this quarter favors
  cosmicHighlights: string[]  // 2–4 key astrological events
  pushPeriods: PeriodRange[]
  restPeriods: PeriodRange[]
}

export interface BlueprintOutput {
  yearTheme: string
  yearSummary: string   // 3–5 sentences grounded in natal + transits
  quarters: QuarterBlueprint[]
  months: MonthBlueprint[]
  weeks: WeekBlueprint[]
  pushPeriods: PeriodRange[]
  restPeriods: PeriodRange[]
}
