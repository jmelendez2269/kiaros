import {
  getDailyLongitudesForDate,
  getMoonPhasesForYear,
  getTrueNodeLongitude,
  msToJDE,
  type DailyPlanetLongitudes,
} from '@/lib/ephemeris/astronomia-adapter'
import { addDays, type LongitudeSeries, type MoonEvent } from './detect'

// Longitudes for a date never change, so a warm server instance reuses them.
const lonCache = new Map<string, DailyPlanetLongitudes>()
const MAX_CACHE = 4000

function lonsFor(date: string): DailyPlanetLongitudes {
  const hit = lonCache.get(date)
  if (hit) return hit
  const lons = getDailyLongitudesForDate(date)
  if (lonCache.size >= MAX_CACHE) lonCache.clear()
  lonCache.set(date, lons)
  return lons
}

export function buildLongitudeSeries(from: string, to: string): LongitudeSeries {
  const series: LongitudeSeries = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    series.push({ date: d, lons: lonsFor(d) })
  }
  return series
}

export function buildMoonEvents(from: string, to: string): MoonEvent[] {
  const events: MoonEvent[] = []
  const firstYear = Number(from.slice(0, 4))
  const lastYear = Number(to.slice(0, 4))
  for (let year = firstYear; year <= lastYear; year++) {
    for (const e of getMoonPhasesForYear(year)) {
      if (e.phase !== 'new' && e.phase !== 'full') continue
      if (e.date < from || e.date > to) continue
      const jde = msToJDE(Date.parse(`${e.date}T${e.time}:00Z`))
      events.push({
        date: e.date,
        phase: e.phase,
        moonLongitude: e.longitude,
        nodeLongitude: getTrueNodeLongitude(jde),
      })
    }
  }
  return events
}
