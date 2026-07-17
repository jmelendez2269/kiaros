/**
 * planetary-hours.ts
 *
 * Computes the traditional 24-hour planetary-hour cycle (12 day hours from
 * sunrise to sunset, 12 night hours from sunset to next sunrise, each ruled
 * by a planet in Chaldean order) and maps it onto a single midnight-to-
 * midnight civil day for the Planner's Day grid.
 *
 * Astronomical source: `astronomia/sunrise` (Meeus ch. 15 rise/set algorithm).
 * That module's `lon` is measured positive WESTWARD — the opposite of the
 * standard signed longitude (positive east) stored on user_profiles — so
 * every call here negates the input longitude before passing it in. Verified
 * against NYC (40.7128, -74.0060) on 2026-06-15: sunrise 05:24 ET, sunset
 * 20:29 ET, both correct for that date.
 *
 * The civil grid renders midnight-to-midnight, not sunrise-to-sunrise, so a
 * requested day pulls hours from two solar days: the tail of yesterday's
 * night (yesterday's sunset -> today's sunrise) and all of today's solar day
 * (today's sunrise -> tomorrow's sunrise), each clipped to [00:00, 24:00).
 */

import type { EnergyType } from '@/types/blueprint'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Sunrise } = require('astronomia/sunrise')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const julian = require('astronomia/julian').default

export type PlanetaryHourRuler = 'Saturn' | 'Jupiter' | 'Mars' | 'Sun' | 'Venus' | 'Mercury' | 'Moon'

export interface PlanetaryHourBand {
  /** Minutes since local midnight of the requested date, clamped to [0, 1440]. */
  startMinute: number
  endMinute: number
  ruler: PlanetaryHourRuler
  energyType: EnergyType
  isDaytime: boolean
}

export interface PlanetaryHoursInput {
  /** YYYY-MM-DD, the civil day the grid is rendering. */
  date: string
  /** Standard signed latitude, positive north. */
  lat: number
  /** Standard signed longitude, positive east. */
  lng: number
  /** IANA timezone used to place astronomical instants on the civil day's clock. */
  timeZone: string
}

// Chaldean order, slowest to fastest — the fixed sequence planetary hours cycle through.
const CHALDEAN_ORDER: PlanetaryHourRuler[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

// Index 0 = Sunday, matching Date#getUTCDay().
const WEEKDAY_RULER: PlanetaryHourRuler[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

const RULER_ENERGY: Record<PlanetaryHourRuler, EnergyType> = {
  Sun: 'push',
  Mars: 'push',
  Jupiter: 'initiate',
  Mercury: 'reflect',
  Venus: 'reflect',
  Moon: 'rest',
  Saturn: 'rest',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function calendarFor(dateStr: string): any {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new julian.Calendar(y, m, d)
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
}

/** Sunrise/sunset for a calendar date at a location. `lat`/`lng` use standard signed convention. */
export function getSunTimes(dateStr: string, lat: number, lng: number): { sunrise: Date | null; sunset: Date | null } {
  const astroLon = -lng
  const sr = new Sunrise(calendarFor(dateStr), lat, astroLon)
  const riseCal = sr.rise()
  const setCal = sr.set()
  return {
    sunrise: riseCal ? riseCal.toDate() : null,
    sunset: setCal ? setCal.toDate() : null,
  }
}

interface RawHour {
  start: Date
  end: Date
  ruler: PlanetaryHourRuler
  isDaytime: boolean
}

function splitEqually(start: Date, end: Date, count: number): { start: Date; end: Date }[] {
  const stepMs = (end.getTime() - start.getTime()) / count
  return Array.from({ length: count }, (_, i) => ({
    start: new Date(start.getTime() + i * stepMs),
    end: new Date(start.getTime() + (i + 1) * stepMs),
  }))
}

/** The 24 planetary hours of one solar day: sunrise -> sunset -> next sunrise. */
function hoursForSolarDay(sunrise: Date, sunset: Date, nextSunrise: Date, weekday: number): RawHour[] {
  const startIdx = CHALDEAN_ORDER.indexOf(WEEKDAY_RULER[weekday])
  const dayHours = splitEqually(sunrise, sunset, 12).map((h) => ({ ...h, isDaytime: true }))
  const nightHours = splitEqually(sunset, nextSunrise, 12).map((h) => ({ ...h, isDaytime: false }))
  return [...dayHours, ...nightHours].map((h, i) => ({
    ...h,
    ruler: CHALDEAN_ORDER[(startIdx + i) % 7],
  }))
}

/** Minutes since local midnight of `dateStr` in `tz`, for an instant that may fall on an adjacent day. */
export function localMinutesSinceDate(instant: Date, dateStr: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant)
  const p: Record<string, string> = {}
  for (const part of parts) if (part.type !== 'literal') p[part.type] = part.value

  let instantDate = `${p.year}-${p.month}-${p.day}`
  let hour = Number(p.hour)
  const minute = Number(p.minute)
  if (hour === 24) {
    hour = 0
    instantDate = addDays(instantDate, 1)
  }

  const dayDiffMs = new Date(`${instantDate}T00:00:00Z`).getTime() - new Date(`${dateStr}T00:00:00Z`).getTime()
  const dayDiff = Math.round(dayDiffMs / 86_400_000)
  return dayDiff * 1440 + hour * 60 + minute
}

/**
 * Planetary-hour bands for one civil day, clipped to [00:00, 24:00) local time.
 * Returns [] if sunrise/sunset is undefined for any of the three days involved
 * (near-polar latitudes) — callers should render the grid untinted in that case.
 */
export function computePlanetaryHourBands({ date, lat, lng, timeZone }: PlanetaryHoursInput): PlanetaryHourBand[] {
  const yesterday = addDays(date, -1)
  const tomorrow = addDays(date, 1)

  const { sunrise: srYesterday, sunset: ssYesterday } = getSunTimes(yesterday, lat, lng)
  const { sunrise: srToday, sunset: ssToday } = getSunTimes(date, lat, lng)
  const { sunrise: srTomorrow } = getSunTimes(tomorrow, lat, lng)

  if (!srYesterday || !ssYesterday || !srToday || !ssToday || !srTomorrow) return []

  const hoursYesterday = hoursForSolarDay(srYesterday, ssYesterday, srToday, weekdayOf(yesterday))
  const hoursToday = hoursForSolarDay(srToday, ssToday, srTomorrow, weekdayOf(date))

  const bands: PlanetaryHourBand[] = []
  for (const h of [...hoursYesterday, ...hoursToday]) {
    const startMinute = Math.max(0, localMinutesSinceDate(h.start, date, timeZone))
    const endMinute = Math.min(1440, localMinutesSinceDate(h.end, date, timeZone))
    if (endMinute <= startMinute) continue
    bands.push({
      startMinute,
      endMinute,
      ruler: h.ruler,
      energyType: RULER_ENERGY[h.ruler],
      isDaytime: h.isDaytime,
    })
  }

  bands.sort((a, b) => a.startMinute - b.startMinute)
  return bands
}
