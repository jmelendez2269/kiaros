import type { EphemerisDay, Planet, YearEphemeris } from '@/types/blueprint'

const RETRO_THEME: Partial<Record<Planet, string>> = {
  Venus: 'taking time to feel before deciding',
  Mercury: 'rereading and double-checking',
  Mars: 'pacing your energy',
}

const RETRO_APPEND_ORDER: Planet[] = ['Mercury', 'Venus', 'Mars']

const OVERLAP_RETRO_SUBLINE =
  "Astrologers often read overlapping retrogrades as a season for looking inward and reviewing. It's a quieter stretch if you want one."

function previousIso(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function datesInRange(start: string, end: string): string[] {
  const out: string[] = []
  const d = new Date(`${start}T12:00:00Z`)
  const endMs = new Date(`${end}T12:00:00Z`).getTime()
  while (d.getTime() <= endMs) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

function formatStationDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildDayMap(days: EphemerisDay[]): Map<string, EphemerisDay> {
  return new Map(days.map((d) => [d.date, d]))
}

/** First planet stationing direct within [startDate, endDate], if any. */
export function findStationDirectInRange(
  startDate: string,
  endDate: string,
  dayByDate: Map<string, EphemerisDay>,
): { planet: Planet; date: string } | null {
  for (const date of datesInRange(startDate, endDate)) {
    const day = dayByDate.get(date)
    const prev = dayByDate.get(previousIso(date))
    if (!day || !prev) continue
    const currSet = new Set(day.retrogrades)
    for (const planet of prev.retrogrades) {
      if (!currSet.has(planet)) {
        // Astrologers cite the last day of the retrograde span (still Rx), not the first direct day.
        return { planet, date: prev.date }
      }
    }
  }
  return null
}

function otherRetrogradesInWeek(
  startDate: string,
  endDate: string,
  dayByDate: Map<string, EphemerisDay>,
  exclude: Planet,
): Planet[] {
  const found = new Set<Planet>()
  for (const date of datesInRange(startDate, endDate)) {
    const day = dayByDate.get(date)
    if (!day) continue
    for (const planet of day.retrogrades) {
      if (planet !== exclude) found.add(planet)
    }
  }
  return [...found]
}

/** Mercury / Venus / Mars retrograde on any day in the ISO week (cached ephemeris days). */
export function innerPersonalRetrogradesInWeek(
  startDate: string,
  endDate: string,
  dayByDate: Map<string, EphemerisDay>,
): Planet[] {
  const found = new Set<Planet>()
  for (const date of datesInRange(startDate, endDate)) {
    const day = dayByDate.get(date)
    if (!day) continue
    for (const planet of day.retrogrades) {
      if (RETRO_APPEND_ORDER.includes(planet)) found.add(planet)
    }
  }
  return RETRO_APPEND_ORDER.filter((p) => found.has(p))
}

export function buildWeekArcOverlappingRetrogradeCopy(
  planets: Planet[],
): { headline: string; subline: string } | null {
  if (planets.length < 2) return null
  const [first, second, ...rest] = planets
  let headline = `${first} and ${second} are both retrograde`
  if (rest.length === 1) {
    headline += `, and ${rest[0]} is retrograde`
  } else if (rest.length > 1) {
    headline += `, and ${rest.join(', ')} are retrograde`
  }
  return { headline, subline: OVERLAP_RETRO_SUBLINE }
}

export function weekArcOverlappingRetrogradeForWeek(
  weekStart: string,
  weekEnd: string,
  yearEphemeris: YearEphemeris | null,
): { headline: string; subline: string } | null {
  if (!yearEphemeris) return null
  const dayByDate = buildDayMap(yearEphemeris.days)
  const planets = innerPersonalRetrogradesInWeek(weekStart, weekEnd, dayByDate)
  return buildWeekArcOverlappingRetrogradeCopy(planets)
}

export function buildWeekArcStationPatternCopy(
  station: { planet: Planet; date: string },
  weekStart: string,
  weekEnd: string,
  dayByDate: Map<string, EphemerisDay>,
): { headline: string; subline: string } {
  const headline = `${station.planet} stations direct ${formatStationDate(station.date)}`
  let subline =
    'Astrologers often read the days around a station as a time to revisit what stalled.'

  const others = otherRetrogradesInWeek(weekStart, weekEnd, dayByDate, station.planet)
  const appendPlanet = RETRO_APPEND_ORDER.find((p) => others.includes(p) && RETRO_THEME[p])
  if (appendPlanet && RETRO_THEME[appendPlanet]) {
    subline += ` ${appendPlanet} is still retrograde, a pattern often linked with ${RETRO_THEME[appendPlanet]}.`
  }

  return { headline, subline }
}

export function weekArcStationPatternForWeek(
  weekStart: string,
  weekEnd: string,
  yearEphemeris: YearEphemeris | null,
): { headline: string; subline: string } | null {
  if (!yearEphemeris) return null
  const dayByDate = buildDayMap(yearEphemeris.days)
  const station = findStationDirectInRange(weekStart, weekEnd, dayByDate)
  if (!station) return null
  return buildWeekArcStationPatternCopy(station, weekStart, weekEnd, dayByDate)
}

/** Station-direct copy wins when both station and overlapping retrogrades apply. */
export function weekArcEphemerisFooterCopyForWeek(
  weekStart: string,
  weekEnd: string,
  yearEphemeris: YearEphemeris | null,
): { headline: string; subline: string } | null {
  const station = weekArcStationPatternForWeek(weekStart, weekEnd, yearEphemeris)
  if (station) return station
  return weekArcOverlappingRetrogradeForWeek(weekStart, weekEnd, yearEphemeris)
}
