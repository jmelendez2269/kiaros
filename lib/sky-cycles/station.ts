import 'server-only'

import { getDailyLongitudes, msToJDE, type DailyPlanetLongitudes } from '@/lib/ephemeris/astronomia-adapter'
import type { Planet } from '@/types/blueprint'
import { addDays } from './detect'
import type { StationDay } from './turns'

const HOUR_MS = 3_600_000

function hourlyDelta(prev: number, cur: number): number {
  let diff = cur - prev
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

function localDate(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * The member's calendar day on which a planet stations, found to the hour.
 * `keyDate` is the first noon (UTC) the planet is seen moving the new way, so
 * the station lies in the two days before it. Falls back to the day before
 * `keyDate` if no change of direction is found in that span.
 */
export function stationLocalDate(planet: Planet, keyDate: string, timeZone: string): string {
  const key = planet.toLowerCase() as keyof DailyPlanetLongitudes
  const end = Date.parse(`${keyDate}T12:00:00Z`)
  const start = end - 48 * HOUR_MS
  const lonAt = (ms: number) => getDailyLongitudes(msToJDE(ms))[key]
  if (typeof lonAt(start) !== 'number') return addDays(keyDate, -1)

  let prevLon = lonAt(start)
  let prevDelta: number | null = null
  for (let ms = start + HOUR_MS; ms <= end; ms += HOUR_MS) {
    const lon = lonAt(ms)
    const delta = hourlyDelta(prevLon, lon)
    if (prevDelta !== null && delta !== 0 && Math.sign(delta) !== Math.sign(prevDelta)) {
      // The direction changed during the hour before this one.
      return localDate(ms - HOUR_MS, timeZone)
    }
    if (delta !== 0) prevDelta = delta
    prevLon = lon
  }
  return addDays(keyDate, -1)
}

/** A resolver for `turnsOn`, in the member's timezone. */
export function stationDayIn(timeZone: string): StationDay {
  return (planet, keyDate) => stationLocalDate(planet, keyDate, timeZone)
}
