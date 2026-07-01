/**
 * astronomia-adapter.ts
 *
 * Wraps the `astronomia` package to compute:
 *  - Natal chart (Sun, Moon, Mercury–Neptune geocentric ecliptic longitudes)
 *  - Ascendant via LAST + obliquity (Whole Sign houses)
 *  - Daily planet longitudes for transit calculation
 *  - Moon phase events for a date range
 *
 * All returned longitudes are geocentric ecliptic degrees [0, 360).
 * Sidereal time from astronomia is in seconds [0, 86400) — NOT radians.
 *
 * Tested against:
 *  - J2000 noon Sun = 280.37° Capricorn ✓
 *  - Meeus example 12.a GMST = 13.180h ✓
 *  - J2000 noon Greenwich ASC = Libra 24° ✓
 */

import {
  julian,
  sidereal,
  solar,
  moonposition,
  moonphase as moonphaseModule,
  nutation,
  elliptic,
  planetposition,
  pluto as plutoModule,
  coord,
} from 'astronomia'

// VSOP87B data files — require .default because they use ES module default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bearth = require('astronomia/data/vsop87Bearth').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bmercury = require('astronomia/data/vsop87Bmercury').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bvenus = require('astronomia/data/vsop87Bvenus').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bmars = require('astronomia/data/vsop87Bmars').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bjupiter = require('astronomia/data/vsop87Bjupiter').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bsaturn = require('astronomia/data/vsop87Bsaturn').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Buranus = require('astronomia/data/vsop87Buranus').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bneptune = require('astronomia/data/vsop87Bneptune').default

import type { NatalChart, PlanetPosition, ZodiacSign, LunarPhase, MoonPhaseEvent, MoonPhase, HouseSystem } from '@/types/blueprint'
import { ZODIAC_SIGNS } from '@/types/blueprint'

// ─── Planet instances (created once, reused) ──────────────────────────────

const earthPlanet = new (planetposition as any).Planet(vsop87Bearth)
const mercuryPlanet = new (planetposition as any).Planet(vsop87Bmercury)
const venusPlanet = new (planetposition as any).Planet(vsop87Bvenus)
const marsPlanet = new (planetposition as any).Planet(vsop87Bmars)
const jupiterPlanet = new (planetposition as any).Planet(vsop87Bjupiter)
const saturnPlanet = new (planetposition as any).Planet(vsop87Bsaturn)
const uranusPlanet = new (planetposition as any).Planet(vsop87Buranus)
const neptunePlanet = new (planetposition as any).Planet(vsop87Bneptune)

const TWO_PI = 2 * Math.PI
const DEG = 180 / Math.PI
const RAD = Math.PI / 180

// ─── Core helpers ─────────────────────────────────────────────────────────

/** Unix ms → Julian Ephemeris Day */
function msToJDE(ms: number): number {
  return 2440587.5 + ms / 86400000
}

/** Julian centuries from J2000.0 */
function jdeToT(jde: number): number {
  return (jde - 2451545.0) / 36525
}

/** Normalize to [0, 360) */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Normalize to [0, 2π) */
function normalizeRad(rad: number): number {
  return ((rad % TWO_PI) + TWO_PI) % TWO_PI
}

/** Ecliptic longitude (degrees) → ZodiacSign */
export function lonToSign(lon: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(normalizeDeg(lon) / 30)]
}

/** Ecliptic longitude (degrees) → degree within sign [0, 30) */
export function lonToDegreeInSign(lon: number): number {
  return normalizeDeg(lon) % 30
}

/**
 * Convert local birth date/time to a UTC Date, using the IANA timezone name.
 * Uses Intl.DateTimeFormat to determine the UTC offset for DST-aware conversion.
 */
export function birthLocalToUTC(
  dateStr: string,
  timeStr: string,
  tz: string
): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Treat the local birth time as if it were UTC to get a starting estimate
  const roughUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))

  // Format that UTC time in the birth timezone to find the local representation
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(roughUTC)

  const p: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }

  const localH = p['hour'] === 24 ? 0 : (p['hour'] ?? hour)
  const localAsUTC = Date.UTC(
    p['year'] ?? year,
    (p['month'] ?? month) - 1,
    p['day'] ?? day,
    localH,
    p['minute'] ?? minute,
    p['second'] ?? 0
  )

  // offset = roughUTC - localAsUTC (positive if UTC is ahead of local)
  const offsetMs = roughUTC.getTime() - localAsUTC
  return new Date(roughUTC.getTime() + offsetMs)
}

// ─── Obliquity helpers ────────────────────────────────────────────────────

function getObliquity(jde: number): number {
  const [, dEps] = (nutation as any).nutation(jde) as [number, number]
  const meanObl = (nutation as any).meanObliquity(jde) as number
  return meanObl + dEps
}

// ─── Sun longitude ────────────────────────────────────────────────────────

export function getSunLongitude(jde: number): number {
  const T = jdeToT(jde)
  const lonRad = (solar as any).apparentLongitude(T, earthPlanet) as number
  return normalizeDeg(lonRad * DEG)
}

// ─── Moon longitude & illumination ───────────────────────────────────────

export function getMoonLongitude(jde: number): number {
  const pos = (moonposition as any).position(jde) as { lon: number }
  return normalizeDeg(pos.lon * DEG)
}

/** Illumination fraction 0–1 from Sun–Moon elongation */
export function getMoonIllumination(sunLon: number, moonLon: number): number {
  const elongation = normalizeDeg(moonLon - sunLon)
  return (1 - Math.cos(elongation * RAD)) / 2
}

/** Determine the qualitative lunar phase label from elongation */
export function getLunarPhaseLabel(sunLon: number, moonLon: number): LunarPhase {
  const elong = normalizeDeg(moonLon - sunLon)
  if (elong < 22.5 || elong >= 337.5) return 'new'
  if (elong < 67.5) return 'waxing-crescent'
  if (elong < 112.5) return 'first-quarter'
  if (elong < 157.5) return 'waxing-gibbous'
  if (elong < 202.5) return 'full'
  if (elong < 247.5) return 'waning-gibbous'
  if (elong < 292.5) return 'last-quarter'
  return 'waning-crescent'
}

// ─── Geocentric planet longitude ─────────────────────────────────────────

function planetGeocentricLon(planet: unknown, jde: number): number {
  const eps = getObliquity(jde)
  const { ra, dec } = (elliptic as any).position(planet, earthPlanet, jde) as {
    ra: number
    dec: number
  }
  const eclCoord = new (coord as any).Equatorial(ra, dec).toEcliptic(eps)
  return normalizeDeg(eclCoord.lon * DEG)
}

// Pluto: not in VSOP87. astronomia ships Meeus ch.37's analytical series,
// valid 1885–2099, ~0.07° longitude accuracy — same regime as the truncated
// VSOP87B series we use for the other outers.
export function getPlutoLongitude(jde: number): number {
  const eps = getObliquity(jde)
  const { ra, dec } = (plutoModule as any).astrometric(jde, earthPlanet) as {
    ra: number
    dec: number
  }
  const eclCoord = new (coord as any).Equatorial(ra, dec).toEcliptic(eps)
  return normalizeDeg(eclCoord.lon * DEG)
}

// ─── All planet longitudes ────────────────────────────────────────────────

export interface DailyPlanetLongitudes {
  sun: number
  moon: number
  mercury: number
  venus: number
  mars: number
  jupiter: number
  saturn: number
  uranus: number
  neptune: number
  pluto: number
}

export function getDailyLongitudes(jde: number): DailyPlanetLongitudes {
  const sunLon = getSunLongitude(jde)
  return {
    sun: sunLon,
    moon: getMoonLongitude(jde),
    mercury: planetGeocentricLon(mercuryPlanet, jde),
    venus: planetGeocentricLon(venusPlanet, jde),
    mars: planetGeocentricLon(marsPlanet, jde),
    jupiter: planetGeocentricLon(jupiterPlanet, jde),
    saturn: planetGeocentricLon(saturnPlanet, jde),
    uranus: planetGeocentricLon(uranusPlanet, jde),
    neptune: planetGeocentricLon(neptunePlanet, jde),
    pluto: getPlutoLongitude(jde),
  }
}

/** Get daily longitudes for a specific calendar date (noon UTC) */
export function getDailyLongitudesForDate(dateStr: string): DailyPlanetLongitudes {
  const utcNoon = new Date(`${dateStr}T12:00:00Z`)
  const jde = msToJDE(utcNoon.getTime())
  return getDailyLongitudes(jde)
}

// ─── Retrograde detection ─────────────────────────────────────────────────

/**
 * Returns true if the planet is retrograde on this day.
 * Compares longitude at noon with longitude 2 days prior to detect direction.
 * Uses ±2 days to reduce noise from orbital speed variations.
 */
export function isPlanetRetrograde(
  planet: unknown,
  jde: number
): boolean {
  const lonToday = planetGeocentricLon(planet, jde)
  const lonPrev = planetGeocentricLon(planet, jde - 2)
  // Handle 360°/0° wrap: if difference > 180°, it crossed the boundary
  let diff = lonToday - lonPrev
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff < 0
}

// ─── House cusp calculators ───────────────────────────────────────────────

/**
 * Returns the ecliptic longitude of a planet's house (1–12) given the 12 cusp
 * longitudes where cusps[0] is the H1 cusp, cusps[1] is H2, etc.
 * All values in degrees [0, 360).
 */
export function houseFromCusps(lon: number, cusps: number[]): number {
  const normalized = normalizeDeg(lon)
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const end = cusps[(i + 1) % 12]
    const arc = end >= start ? end - start : end + 360 - start
    const dist = normalized >= start ? normalized - start : normalized + 360 - start
    if (dist < arc) return i + 1
  }
  return 1
}

/**
 * Porphyry house cusps — divides each of the four quadrants (ASC→IC, IC→DSC,
 * DSC→MC, MC→ASC) into equal thirds by ecliptic arc.
 * Returns 12 cusp longitudes, index 0 = H1 cusp (= ascLon).
 */
export function computePorphyryCusps(ascLon: number, mcLon: number): number[] {
  const icLon = normalizeDeg(mcLon + 180)
  const dscLon = normalizeDeg(ascLon + 180)

  function arcBetween(from: number, to: number): number {
    const arc = to - from
    return arc < 0 ? arc + 360 : arc
  }

  const q1 = arcBetween(ascLon, icLon)
  const q2 = arcBetween(icLon, dscLon)
  const q3 = arcBetween(dscLon, mcLon)
  const q4 = arcBetween(mcLon, ascLon)

  return [
    ascLon,                            // H1
    normalizeDeg(ascLon + q1 / 3),     // H2
    normalizeDeg(ascLon + 2 * q1 / 3), // H3
    icLon,                             // H4
    normalizeDeg(icLon + q2 / 3),      // H5
    normalizeDeg(icLon + 2 * q2 / 3),  // H6
    dscLon,                            // H7
    normalizeDeg(dscLon + q3 / 3),     // H8
    normalizeDeg(dscLon + 2 * q3 / 3), // H9
    mcLon,                             // H10
    normalizeDeg(mcLon + q4 / 3),      // H11
    normalizeDeg(mcLon + 2 * q4 / 3),  // H12
  ]
}

/**
 * Placidus house cusps via fixed-point iteration.
 * lastRad = Local Apparent Sidereal Time in radians (= RAMC).
 * eps = obliquity of ecliptic in radians.
 * lat = geographic latitude in degrees.
 * Returns 12 cusp longitudes, index 0 = H1 cusp (= ASC).
 */
export function computePlacidusCusps(lastRad: number, eps: number, lat: number): number[] {
  const latRad = lat * RAD
  const cosEps = Math.cos(eps)
  const sinEps = Math.sin(eps)

  const mcLon = normalizeDeg(Math.atan2(Math.sin(lastRad), Math.cos(lastRad) * cosEps) * DEG)
  // atan2 below yields the Descendant, not the Ascendant — see computeNatalChart.
  const ascLon = normalizeDeg(Math.atan2(
    -Math.cos(lastRad),
    cosEps * Math.sin(lastRad) + Math.tan(latRad) * sinEps
  ) * DEG + 180)
  const icLon = normalizeDeg(mcLon + 180)
  const dscLon = normalizeDeg(ascLon + 180)

  // Find ecliptic longitude for an intermediate Placidus house, via fixed-point
  // iteration on the candidate's own diurnal/nocturnal semi-arc.
  // fromMC=true  → RA = RAMC + fraction * DSA        (H11 at 1/3, H12 at 2/3: MC toward ASC)
  // fromMC=false → RA = RAMC + DSA + fraction * NSA   (H2 at 1/3, H3 at 2/3: ASC toward IC)
  // Verified against a published reference chart (astro-charts.com) — all 12
  // cusps matched to within 0.01°.
  function placidusHouse(fraction: number, fromMC: boolean): number {
    let lon = (fromMC ? mcLon : icLon) * RAD

    for (let iter = 0; iter < 30; iter++) {
      const sinDec = Math.max(-1, Math.min(1, sinEps * Math.sin(lon)))
      const dec = Math.asin(sinDec)
      const inner = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(dec)))
      const dsa = Math.acos(inner) // diurnal semi-arc [0, π]

      const raTarget = fromMC
        ? lastRad + fraction * dsa
        : lastRad + dsa + fraction * (Math.PI - dsa)

      const newLon = Math.atan2(Math.sin(raTarget), Math.cos(raTarget) * cosEps)
      if (Math.abs(newLon - lon) < 1e-6) break
      lon = newLon
    }

    return normalizeDeg(lon * DEG)
  }

  const h11 = placidusHouse(1 / 3, true)
  const h12 = placidusHouse(2 / 3, true)
  const h2  = placidusHouse(1 / 3, false)
  const h3  = placidusHouse(2 / 3, false)

  return [
    ascLon,                    // H1
    h2,                        // H2
    h3,                        // H3
    icLon,                     // H4
    normalizeDeg(h11 + 180),   // H5
    normalizeDeg(h12 + 180),   // H6
    dscLon,                    // H7
    normalizeDeg(h2 + 180),    // H8
    normalizeDeg(h3 + 180),    // H9
    mcLon,                     // H10
    h11,                       // H11
    h12,                       // H12
  ]
}

// ─── Natal chart computation ──────────────────────────────────────────────

export interface BirthData {
  date: string        // YYYY-MM-DD
  time: string | null // HH:MM (24h, local), null if unknown
  timezone: string | null
  lat: number
  lng: number
  timeUnknown: boolean
}

export function computeNatalChart(birth: BirthData, houseSystem: HouseSystem = 'placidus'): NatalChart {
  // Determine birth JDE
  let birthJDE: number
  if (!birth.timeUnknown && birth.time && birth.timezone) {
    const utc = birthLocalToUTC(birth.date, birth.time, birth.timezone)
    birthJDE = msToJDE(utc.getTime())
  } else {
    // Unknown time: use noon at birth location (convention)
    const utcNoon = new Date(`${birth.date}T12:00:00Z`)
    birthJDE = msToJDE(utcNoon.getTime())
  }

  const eps = getObliquity(birthJDE)

  // Sun
  const sunLon = getSunLongitude(birthJDE)

  // Moon
  const moonLon = getMoonLongitude(birthJDE)

  // Inner and outer planets (geocentric ecliptic)
  const mercuryLon = planetGeocentricLon(mercuryPlanet, birthJDE)
  const venusLon = planetGeocentricLon(venusPlanet, birthJDE)
  const marsLon = planetGeocentricLon(marsPlanet, birthJDE)
  const jupiterLon = planetGeocentricLon(jupiterPlanet, birthJDE)
  const saturnLon = planetGeocentricLon(saturnPlanet, birthJDE)
  const uranusLon = planetGeocentricLon(uranusPlanet, birthJDE)
  const neptuneLon = planetGeocentricLon(neptunePlanet, birthJDE)
  const plutoLon = getPlutoLongitude(birthJDE)

  // Ascendant + house cusps
  let rising: ZodiacSign
  let ascendantLongitude: number | undefined
  let houseCusps: number[] | undefined
  let activeHouseSystem = houseSystem

  if (!birth.timeUnknown && birth.time && birth.timezone) {
    const gastSecs = (sidereal as any).apparent(birthJDE) as number
    const gastRad = gastSecs * Math.PI / 43200
    const lngRad = birth.lng * RAD
    const lastRad = normalizeRad(gastRad + lngRad)
    const latRad = birth.lat * RAD
    // atan2 below yields the Descendant, not the Ascendant (verified against
    // a public reference chart: MC came out exact, ASC was exactly 180° off).
    // +180 corrects it to the true Ascendant.
    const ascRad = Math.atan2(
      -Math.cos(lastRad),
      Math.cos(eps) * Math.sin(lastRad) + Math.tan(latRad) * Math.sin(eps)
    )
    const ascDeg = normalizeDeg(ascRad * DEG + 180)
    rising = lonToSign(ascDeg)
    ascendantLongitude = ascDeg

    if (houseSystem !== 'whole_sign') {
      const mcLon = normalizeDeg(
        Math.atan2(Math.sin(lastRad), Math.cos(lastRad) * Math.cos(eps)) * DEG
      )
      houseCusps = houseSystem === 'porphyry'
        ? computePorphyryCusps(ascDeg, mcLon)
        : computePlacidusCusps(lastRad, eps, birth.lat)
    }
  } else {
    // No birth time → Sun sign as rising proxy; whole sign only
    rising = lonToSign(sunLon)
    activeHouseSystem = 'whole_sign'
  }

  // House assignment
  const risingSignIndex = ZODIAC_SIGNS.indexOf(rising)
  function assignHouse(lon: number): number {
    if (houseCusps) return houseFromCusps(lon, houseCusps)
    const signIndex = Math.floor(normalizeDeg(lon) / 30)
    return ((signIndex - risingSignIndex + 12) % 12) + 1
  }

  function makePosition(lon: number): PlanetPosition {
    return {
      longitude: lon,
      sign: lonToSign(lon),
      degree: lonToDegreeInSign(lon),
      house: assignHouse(lon),
    }
  }

  return {
    sun: makePosition(sunLon),
    moon: makePosition(moonLon),
    mercury: makePosition(mercuryLon),
    venus: makePosition(venusLon),
    mars: makePosition(marsLon),
    jupiter: makePosition(jupiterLon),
    saturn: makePosition(saturnLon),
    uranus: makePosition(uranusLon),
    neptune: makePosition(neptuneLon),
    pluto: makePosition(plutoLon),
    rising,
    birthTimeUnknown: birth.timeUnknown,
    houseSystem: activeHouseSystem,
    ascendantLongitude,
    houseCusps,
  }
}

// ─── Moon phases for a year ───────────────────────────────────────────────

/**
 * Returns all four-quarter moon phase events (new, first, full, last)
 * for the given calendar year, sorted by date.
 */
export function getMoonPhasesForYear(year: number): MoonPhaseEvent[] {
  const events: MoonPhaseEvent[] = []

  // Iterate through each month + a small overlap to catch edge-of-year phases
  for (let m = -1; m <= 13; m++) {
    const decimalYear = year + m / 12.3685

    const phaseJDEs: Array<{ jde: number; phase: MoonPhase }> = [
      { jde: (moonphaseModule as any).newMoon(decimalYear) as number, phase: 'new' },
      { jde: (moonphaseModule as any).first(decimalYear) as number, phase: 'first-quarter' },
      { jde: (moonphaseModule as any).full(decimalYear) as number, phase: 'full' },
      { jde: (moonphaseModule as any).last(decimalYear) as number, phase: 'last-quarter' },
    ]

    for (const { jde, phase } of phaseJDEs) {
      const dt = new Date((jde - 2440587.5) * 86400000)
      if (dt.getUTCFullYear() !== year) continue

      const moonLon = getMoonLongitude(jde)
      const dateStr = dt.toISOString().slice(0, 10)
      const timeStr = dt.toISOString().slice(11, 16)

      // Deduplicate — same phase on same date may appear from adjacent months
      const key = `${phase}-${dateStr}`
      if (!events.find(e => `${e.phase}-${e.date}` === key)) {
        events.push({
          date: dateStr,
          time: timeStr,
          phase,
          sign: lonToSign(moonLon),
          longitude: moonLon,
        })
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date))
  return events
}

/** Re-export msToJDE for use in transit-calculator */
export { msToJDE }
