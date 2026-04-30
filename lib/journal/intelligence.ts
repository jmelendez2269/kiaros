import type { EphemerisDay, Transit, YearEphemeris } from '@/types/blueprint'
import type { Json, TablesInsert } from '@/types/database'

export type PatternRefreshTarget = {
  patternType: 'aspect' | 'lunar_phase' | 'lunar_sign' | 'retrograde'
  patternKey: string
}

export function humanizeLunarPhase(phase: string): string {
  return phase
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function findEphemerisDay(ephemeris: YearEphemeris | null, entryDate: string): EphemerisDay | null {
  if (!ephemeris || !Array.isArray(ephemeris.days)) return null
  return ephemeris.days.find((day) => day.date === entryDate) ?? null
}

export function buildAspectKey(transit: Pick<Transit, 'planet' | 'aspect' | 'natalPlanet'>): string {
  return `${transit.planet}:${transit.aspect}:${transit.natalPlanet}`
}

export function computeCyclePhase(
  entryDate: string,
  periodStart: string,
  avgCycleLength: number,
  avgPeriodLength: number
): string {
  const entry = new Date(entryDate)
  const period = new Date(periodStart)
  const diffDays = Math.floor((entry.getTime() - period.getTime()) / (1000 * 60 * 60 * 24))
  const dayOfCycle = ((diffDays % avgCycleLength) + avgCycleLength) % avgCycleLength + 1

  if (dayOfCycle <= avgPeriodLength) return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 17) return 'ovulatory'
  return 'luteal'
}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function compactTransit(transit: Transit): Json {
  return {
    planet: transit.planet,
    natalPlanet: transit.natalPlanet,
    aspect: transit.aspect,
    aspectKey: buildAspectKey(transit),
    orb: round(transit.orb, 2),
    applying: transit.applying,
  }
}

function mergeTransitContext(existing: Json | null | undefined, sky: Json): Json {
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return { ...existing, sky }
  }

  return { sky }
}

export function buildJournalTransitContext(
  existing: Json | null | undefined,
  day: EphemerisDay | null
): Json | null {
  if (!day) return existing ?? null

  const sky: Json = {
    date: day.date,
    sun: {
      sign: day.sun.sign,
      degree: round(day.sun.degree, 2),
    },
    moon: {
      sign: day.moon.sign,
      degree: round(day.moon.degree, 2),
      lunarPhase: day.moon.lunarPhase,
      illumination: day.moon.illumination,
    },
    moonPhaseEvent: day.moonPhaseEvent
      ? {
          phase: day.moonPhaseEvent.phase,
          sign: day.moonPhaseEvent.sign,
          time: day.moonPhaseEvent.time,
        }
      : null,
    transits: day.transits
      .slice()
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 12)
      .map(compactTransit),
    retrogrades: day.retrogrades,
  }

  return mergeTransitContext(existing, sky)
}

export function buildJournalSkyInsert(params: {
  userId: string
  journalEntryId: string
  entryDate: string
  day: EphemerisDay
}): TablesInsert<'journal_entry_sky'> {
  const { userId, journalEntryId, entryDate, day } = params

  return {
    journal_entry_id: journalEntryId,
    user_id: userId,
    entry_date: entryDate,
    sun_sign: day.sun.sign,
    sun_degree: round(day.sun.degree, 3),
    moon_phase: humanizeLunarPhase(day.moon.lunarPhase),
    moon_sign: day.moon.sign,
    moon_degree: round(day.moon.degree, 3),
    moon_illumination: day.moon.illumination,
    moon_phase_event: day.moonPhaseEvent?.phase ?? null,
    retrogrades: day.retrogrades,
    transit_count: day.transits.length,
  }
}

export function buildJournalAspectInserts(params: {
  userId: string
  journalEntryId: string
  entryDate: string
  day: EphemerisDay
}): TablesInsert<'journal_entry_aspects'>[] {
  const { userId, journalEntryId, entryDate, day } = params
  const lunarPhase = humanizeLunarPhase(day.moon.lunarPhase)

  return day.transits.map((transit) => ({
    journal_entry_id: journalEntryId,
    user_id: userId,
    entry_date: entryDate,
    transiting_planet: transit.planet,
    natal_planet: transit.natalPlanet,
    aspect: transit.aspect,
    aspect_key: buildAspectKey(transit),
    orb: round(transit.orb, 3),
    applying: transit.applying,
    transit_longitude: round(transit.transitLongitude, 4),
    natal_longitude: round(transit.natalLongitude, 4),
    lunar_phase: lunarPhase,
    lunar_sign: day.moon.sign,
    retrogrades: day.retrogrades,
  }))
}

export function getPatternRefreshTargets(day: EphemerisDay | null): PatternRefreshTarget[] {
  if (!day) return []

  const deduped = new Map<string, PatternRefreshTarget>()
  const add = (target: PatternRefreshTarget) => {
    deduped.set(`${target.patternType}:${target.patternKey}`, target)
  }

  add({ patternType: 'lunar_phase', patternKey: humanizeLunarPhase(day.moon.lunarPhase) })
  add({ patternType: 'lunar_sign', patternKey: day.moon.sign })

  day.retrogrades.forEach((planet) => {
    add({ patternType: 'retrograde', patternKey: planet })
  })

  day.transits.forEach((transit) => {
    add({ patternType: 'aspect', patternKey: buildAspectKey(transit) })
  })

  return Array.from(deduped.values())
}
