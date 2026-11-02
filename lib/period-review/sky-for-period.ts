import type { YearEphemeris, MoonPhaseEvent, RetrogradePeriod, Transit, Planet } from '@/types/blueprint'
import type { PeriodReviewPeriod } from './periods'
import { getDailyLongitudesForDate, lonToSign } from '@/lib/ephemeris/astronomia-adapter'

export interface PlanetIngress {
  planet: Planet
  sign: string
  date: string
}

export interface PeriodSkySummary {
  moonPhases: MoonPhaseEvent[]
  retrogradePeriods: RetrogradePeriod[]
  significantTransits: Transit[]
  ingresses: PlanetIngress[]
  /** No eclipse events in current ephemeris schema; reserved for chip copy. */
  eclipseCount: number
  signChangeCount: number
  text: string
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function overlapsPeriod(start: string, end: string | undefined, period: PeriodReviewPeriod): boolean {
  const pEnd = end ?? start
  return start <= period.periodEnd && pEnd >= period.periodStart
}

function countSignChangesInPeriod(ephemeris: YearEphemeris, period: PeriodReviewPeriod): number {
  const days = ephemeris.days.filter((d) => inRange(d.date, period.periodStart, period.periodEnd))
  if (days.length < 2) return 0
  let changes = 0
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1]
    const cur = days[i]
    if (prev.sun.sign !== cur.sun.sign) changes += 1
    if (prev.moon.sign !== cur.moon.sign) changes += 1
  }
  return changes
}

function extractIngressesForPeriod(ephemeris: YearEphemeris, period: PeriodReviewPeriod): PlanetIngress[] {
  const days = ephemeris.days.filter((d) => inRange(d.date, period.periodStart, period.periodEnd))
  if (days.length < 2) return []

  const ingresses: PlanetIngress[] = []
  const innerPlanets: Planet[] = ['Sun', 'Mercury', 'Venus', 'Mars']

  for (let i = 1; i < days.length; i++) {
    const prevDate = days[i - 1].date
    const curDate = days[i].date

    for (const planet of innerPlanets) {
      const prevLons = getDailyLongitudesForDate(prevDate)
      const curLons = getDailyLongitudesForDate(curDate)

      const prevLon = prevLons[planet.toLowerCase() as keyof typeof prevLons] as number
      const curLon = curLons[planet.toLowerCase() as keyof typeof curLons] as number

      const prevSign = lonToSign(prevLon)
      const curSign = lonToSign(curLon)

      if (prevSign !== curSign) {
        ingresses.push({
          planet,
          sign: curSign,
          date: curDate,
        })
      }
    }
  }

  return ingresses
}

export function summarizeSkyForPeriod(
  ephemeris: YearEphemeris | null,
  period: PeriodReviewPeriod,
): PeriodSkySummary {
  if (!ephemeris) {
    return {
      moonPhases: [],
      retrogradePeriods: [],
      significantTransits: [],
      ingresses: [],
      eclipseCount: 0,
      signChangeCount: 0,
      text: 'Sky data for this period is not available yet.',
    }
  }

  const moonPhases = ephemeris.moonPhases.filter((e) => inRange(e.date, period.periodStart, period.periodEnd))
  const retrogradePeriods = ephemeris.retrogradePeriods.filter((r) =>
    overlapsPeriod(r.startDate, r.endDate, period),
  )
  const significantTransits = ephemeris.significantTransits.filter((t) =>
    inRange(t.date, period.periodStart, period.periodEnd),
  )
  const ingresses = extractIngressesForPeriod(ephemeris, period)
  const signChangeCount = countSignChangesInPeriod(ephemeris, period)

  const lines: string[] = []
  if (moonPhases.length) {
    lines.push(
      `Lunations (${moonPhases.length}): ${moonPhases
        .slice(0, 6)
        .map((m) => `${m.phase} ${m.date}`)
        .join('; ')}`,
    )
  }
  if (retrogradePeriods.length) {
    lines.push(
      `Retrograde windows: ${retrogradePeriods
        .slice(0, 5)
        .map((r) => `${r.planet} ${r.startDate}–${r.endDate ?? 'ongoing'}`)
        .join('; ')}`,
    )
  }
  if (significantTransits.length) {
    lines.push(
      `Tight transits: ${significantTransits
        .slice(0, 8)
        .map(
          (t) =>
            `${t.planet} ${t.aspect} natal ${t.natalPlanet} (${t.date}, orb ${t.orb.toFixed(1)}°)`,
        )
        .join('; ')}`,
    )
  }
  if (!lines.length) {
    lines.push('The ephemeris shows a quieter sky stretch across these dates.')
  }

  return {
    moonPhases,
    retrogradePeriods,
    significantTransits,
    ingresses,
    eclipseCount: 0,
    signChangeCount,
    text: lines.join('\n'),
  }
}
