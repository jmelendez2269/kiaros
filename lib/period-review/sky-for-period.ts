import type { YearEphemeris, MoonPhaseEvent, RetrogradePeriod, Transit } from '@/types/blueprint'
import type { PeriodReviewPeriod } from './periods'

export interface PeriodSkySummary {
  moonPhases: MoonPhaseEvent[]
  retrogradePeriods: RetrogradePeriod[]
  significantTransits: Transit[]
  text: string
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function overlapsPeriod(start: string, end: string | undefined, period: PeriodReviewPeriod): boolean {
  const pEnd = end ?? start
  return start <= period.periodEnd && pEnd >= period.periodStart
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
    text: lines.join('\n'),
  }
}
