/**
 * transit-calculator.ts
 *
 * Builds the full YearEphemeris for a user:
 *  - Daily planet positions from startDate to Dec 31
 *  - Transit detection: transiting planets aspecting natal planet positions
 *  - Retrograde period detection
 *  - Moon phase events (delegated to astronomia-adapter)
 *
 * Performance note: computing a full year (~365 days × 9 planets) takes
 * ~2–4 seconds. This is done once and cached in ephemeris_cache.
 */

import {
  getDailyLongitudesForDate,
  getMoonLongitude,
  getMoonIllumination,
  getLunarPhaseLabel,
  getMoonPhasesForYear,
  lonToSign,
  lonToDegreeInSign,
  normalizeDeg,
  msToJDE,
} from './astronomia-adapter'

import type {
  NatalChart,
  YearEphemeris,
  EphemerisDay,
  Transit,
  RetrogradePeriod,
  MoonPhaseEvent,
  Planet,
  AspectType,
} from '@/types/blueprint'

// ─── Aspect definitions ──────────────────────────────────────────────────

interface AspectDef {
  type: AspectType
  angle: number
  orb: number   // degrees
}

const ASPECTS: AspectDef[] = [
  { type: 'conjunction',  angle:   0, orb: 6.0 },
  { type: 'opposition',   angle: 180, orb: 6.0 },
  { type: 'square',       angle:  90, orb: 5.0 },
  { type: 'trine',        angle: 120, orb: 5.0 },
  { type: 'sextile',      angle:  60, orb: 4.0 },
]

/** Angular separation between two ecliptic longitudes [0, 180] */
function angularSep(a: number, b: number): number {
  const diff = Math.abs(normalizeDeg(a - b))
  return diff > 180 ? 360 - diff : diff
}

/**
 * Returns all aspects between transitLon and natalLon that are within orb,
 * including whether they are applying (transit planet approaching exact).
 */
function findAspects(
  transitLon: number,
  transitLonYesterday: number,
  natalLon: number,
  transitPlanet: Planet,
  natalPlanet: Planet,
  date: string
): Transit[] {
  const results: Transit[] = []

  // Direction of transit planet (positive = direct, negative = retrograde)
  let motion = transitLon - transitLonYesterday
  if (motion > 180) motion -= 360
  if (motion < -180) motion += 360

  for (const aspect of ASPECTS) {
    const sep = angularSep(transitLon, natalLon)
    const orb = Math.abs(sep - aspect.angle)

    if (orb <= aspect.orb) {
      // Determine if applying: is the orb getting smaller?
      const sepYesterday = angularSep(transitLonYesterday, natalLon)
      const orbYesterday = Math.abs(sepYesterday - aspect.angle)
      const applying = orbYesterday > orb

      results.push({
        date,
        planet: transitPlanet,
        natalPlanet,
        aspect: aspect.type,
        transitLongitude: transitLon,
        natalLongitude: natalLon,
        orb,
        applying,
      })
    }
  }

  return results
}

// ─── Planet list for transit scanning ────────────────────────────────────

// Slow planets make meaningful transits; Sun/Moon/Mercury/Venus move too fast
// to be blueprint-relevant but are important for daily cosmic weather.
const OUTER_PLANETS: Planet[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
const ALL_TRANSIT_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

type LonKey = Lowercase<Planet>

function getLon(lons: Record<string, number>, planet: Planet): number {
  return lons[planet.toLowerCase() as LonKey] ?? 0
}

// ─── Retrograde detection across year ────────────────────────────────────

const RETROGRADE_PLANETS: Planet[] = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

function detectRetrogradePeriods(
  dailyLons: Array<{ date: string; lons: Record<string, number> }>
): RetrogradePeriod[] {
  const periods: RetrogradePeriod[] = []

  for (const planet of RETROGRADE_PLANETS) {
    let inRetrograde = false
    let startDate = ''
    let startSign = 'Aries' as RetrogradePeriod['startSign']

    for (let i = 1; i < dailyLons.length; i++) {
      const todayLon = getLon(dailyLons[i].lons, planet)
      const prevLon = getLon(dailyLons[i - 1].lons, planet)

      let diff = todayLon - prevLon
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360

      const isRetro = diff < -0.01   // threshold to avoid noise

      if (isRetro && !inRetrograde) {
        inRetrograde = true
        startDate = dailyLons[i].date
        startSign = lonToSign(todayLon)
      } else if (!isRetro && inRetrograde) {
        inRetrograde = false
        periods.push({
          planet,
          startDate,
          endDate: dailyLons[i].date,
          startSign,
          endSign: lonToSign(todayLon),
        })
      }
    }

    // Open-ended retrograde at year end
    if (inRetrograde) {
      const last = dailyLons[dailyLons.length - 1]
      periods.push({
        planet,
        startDate,
        endDate: last.date,
        startSign,
        endSign: lonToSign(getLon(last.lons, planet)),
      })
    }
  }

  return periods
}

// ─── Main: compute year ephemeris ─────────────────────────────────────────

export interface ComputeYearEphemerisOptions {
  userId: string
  natalChart: NatalChart
  startDate: string    // YYYY-MM-DD (start of planning year)
  year: number
}

export function computeYearEphemeris(opts: ComputeYearEphemerisOptions): YearEphemeris {
  const { userId, natalChart, startDate, year } = opts
  const endDate = `${year}-12-31`

  // Build array of YYYY-MM-DD dates from startDate to endDate
  const dates: string[] = []
  const cur = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  // Compute daily longitudes for all dates (and day-before for retrograde/applying)
  const dailyLons: Array<{ date: string; lons: Record<string, number> }> = []

  // Include one day before startDate for delta calculations
  const dayBefore = new Date(`${startDate}T12:00:00Z`)
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
  const dayBeforeStr = dayBefore.toISOString().slice(0, 10)
  dailyLons.push({
    date: dayBeforeStr,
    lons: getDailyLongitudesForDate(dayBeforeStr) as unknown as Record<string, number>,
  })

  for (const date of dates) {
    dailyLons.push({
      date,
      lons: getDailyLongitudesForDate(date) as unknown as Record<string, number>,
    })
  }

  // Moon phases for the year
  const moonPhases = getMoonPhasesForYear(year).filter(
    e => e.date >= startDate && e.date <= endDate
  )

  // Retrograde periods
  const retrogradePeriods = detectRetrogradePeriods(dailyLons)

  // Extract the natal planet longitudes we'll check transits against
  const natalLons: Partial<Record<Planet, number>> = {
    Sun: natalChart.sun.longitude,
    Moon: natalChart.moon.longitude,
    Mercury: natalChart.mercury.longitude,
    Venus: natalChart.venus.longitude,
    Mars: natalChart.mars.longitude,
    Jupiter: natalChart.jupiter.longitude,
    Saturn: natalChart.saturn.longitude,
    Uranus: natalChart.uranus.longitude,
    Neptune: natalChart.neptune.longitude,
    Pluto: natalChart.pluto.longitude,
  }

  // Build EphemerisDay array + collect all transits
  const allTransits: Transit[] = []
  const days: EphemerisDay[] = []

  for (let i = 1; i < dailyLons.length; i++) {  // i=1 because we need yesterday at i-1
    const { date, lons } = dailyLons[i]
    if (date < startDate) continue

    const prevLons = dailyLons[i - 1].lons
    const sunLon = getLon(lons, 'Sun')
    const moonLon = getLon(lons, 'Moon')

    // Which planets are retrograde today?
    const retrogrades: Planet[] = []
    for (const planet of RETROGRADE_PLANETS) {
      const todayLon = getLon(lons, planet)
      const prevLon = getLon(prevLons, planet)
      let diff = todayLon - prevLon
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      if (diff < -0.01) retrogrades.push(planet)
    }

    // Transits: outer planets to all natal planets (most astrologically relevant)
    const dayTransits: Transit[] = []
    for (const transitPlanet of OUTER_PLANETS) {
      const tLon = getLon(lons, transitPlanet)
      const tLonPrev = getLon(prevLons, transitPlanet)

      for (const [natalPlanetName, natalLon] of Object.entries(natalLons)) {
        const aspects = findAspects(
          tLon,
          tLonPrev,
          natalLon,
          transitPlanet,
          natalPlanetName as Planet,
          date
        )
        dayTransits.push(...aspects)
      }
    }

    // Collect all transits; the caller can filter by orb for the prompt
    allTransits.push(...dayTransits)

    // Moon phase event for this day?
    const moonPhaseEvent = moonPhases.find(e => e.date === date)

    // Illumination
    const jdeNoon = msToJDE(new Date(`${date}T12:00:00Z`).getTime())
    const illum = getMoonIllumination(sunLon, moonLon)
    const lunarPhase = getLunarPhaseLabel(sunLon, moonLon)

    days.push({
      date,
      sun: {
        longitude: sunLon,
        sign: lonToSign(sunLon),
        degree: lonToDegreeInSign(sunLon),
      },
      moon: {
        longitude: moonLon,
        sign: lonToSign(moonLon),
        degree: lonToDegreeInSign(moonLon),
        lunarPhase,
        illumination: Math.round(illum * 100) / 100,
      },
      moonPhaseEvent,
      transits: dayTransits,
      retrogrades,
    })
  }

  // Significant transits: tight orb (≤ 1° for outer planets)
  const significantTransits = allTransits
    .filter(t => OUTER_PLANETS.includes(t.planet) && t.orb <= 1.0)
    .sort((a, b) => a.orb - b.orb)

  return {
    userId,
    year,
    startDate,
    endDate,
    days,
    moonPhases,
    retrogradePeriods,
    significantTransits,
  }
}

// ─── Blueprint-level summary helpers ─────────────────────────────────────

/**
 * Summarise key transit windows for the blueprint prompt.
 * Groups consecutive days with the same transit into a date range.
 * Returns only outer-planet transits for brevity.
 */
export function summariseTransitWindows(
  ephemeris: YearEphemeris
): string[] {
  const windows: string[] = []
  const seen = new Map<string, { start: string; end: string }>()

  for (const day of ephemeris.days) {
    for (const t of day.transits) {
      if (!OUTER_PLANETS.includes(t.planet)) continue
      if (t.orb > 3) continue  // only include ≤3° orb for summary

      const key = `${t.planet}-${t.aspect}-${t.natalPlanet}`
      const existing = seen.get(key)
      if (existing) {
        existing.end = day.date
      } else {
        seen.set(key, { start: day.date, end: day.date })
      }
    }
  }

  for (const [key, { start, end }] of seen.entries()) {
    const [planet, aspect, natalPlanet] = key.split('-')
    if (start === end) {
      windows.push(`${planet} ${aspect} natal ${natalPlanet} on ${start}`)
    } else {
      windows.push(`${planet} ${aspect} natal ${natalPlanet}: ${start} to ${end}`)
    }
  }

  return windows.sort()
}
