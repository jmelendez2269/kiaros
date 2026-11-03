/**
 * Sky cycle detection. Pure functions over a daily planet-longitude series, so
 * they work across year boundaries and are cheap to test.
 *
 * Definitions (agreed with the founder, 2026-11-03):
 * - Retrogrades: Mercury through Pluto, station retrograde to station direct.
 * - Eclipses: new moons within 18° of a lunar node (solar) and full moons
 *   within 12° (lunar). Eclipses within 20 days form one "eclipse season".
 *   This is the standard node-distance limit, not a full eclipse computation.
 * - Slow planets changing sign: Jupiter through Pluto entering a sign. The
 *   cycle is the first month in the new sign.
 * - Seasons: the Sun entering Aries, Cancer, Libra or Capricorn, through the
 *   day before the next of those.
 * - Personal transits: Jupiter through Pluto making a conjunction, square,
 *   opposition or trine to the member's Sun, Moon, rising or midheaven within
 *   1°. Passes less than 250 days apart (retrograde back-and-forth) are one cycle.
 */

import type { DailyPlanetLongitudes } from '@/lib/ephemeris/astronomia-adapter'
import type { AspectType, NatalChart, Planet, ZodiacSign } from '@/types/blueprint'
import type { NatalPoint, SkyCycle } from './types'

export type LongitudeSeries = Array<{ date: string; lons: DailyPlanetLongitudes }>

export type MoonEvent = { date: string; phase: 'new' | 'full'; moonLongitude: number; nodeLongitude: number }

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const RETROGRADE_PLANETS: Planet[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
export const SLOW_PLANETS: Planet[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

const PERSONAL_ASPECTS: Array<{ aspect: AspectType; angle: number }> = [
  { aspect: 'conjunction', angle: 0 },
  { aspect: 'square', angle: 90 },
  { aspect: 'opposition', angle: 180 },
  { aspect: 'trine', angle: 120 },
]
const PERSONAL_ORB = 1
const PASS_MERGE_GAP_DAYS = 250

const SOLAR_ECLIPSE_NODE_LIMIT = 18
const LUNAR_ECLIPSE_NODE_LIMIT = 12
const ECLIPSE_SEASON_GAP_DAYS = 20
const ECLIPSE_AFTERGLOW_DAYS = 13
const INGRESS_SETTLING_DAYS = 29

function lonKey(planet: Planet): keyof DailyPlanetLongitudes {
  return planet.toLowerCase() as keyof DailyPlanetLongitudes
}

export function signOf(lon: number): ZodiacSign {
  return SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]
}

export function angularSep(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return d > 180 ? 360 - d : d
}

export function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T12:00:00Z`) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

/** "Oct 25 to Nov 14", or with years when the range crosses into another year. */
export function dateRange(start: string, end: string): string {
  if (start.slice(0, 4) === end.slice(0, 4)) return `${shortDate(start)} to ${shortDate(end)}`
  return `${shortDate(start)}, ${start.slice(0, 4)} to ${shortDate(end)}, ${end.slice(0, 4)}`
}

/**
 * Samples are at noon UTC. When a planet crosses a sign boundary between two
 * samples, interpolate so a crossing before midnight is dated to the earlier day.
 */
function crossingDate(prevDate: string, curDate: string, prevLon: number, curLon: number): string {
  const delta = dailyDelta(prevLon, curLon)
  if (delta === 0) return curDate
  const boundary = delta > 0 ? Math.floor(curLon / 30) * 30 : Math.ceil(curLon / 30) * 30
  let toBoundary = boundary - prevLon
  if (toBoundary > 180) toBoundary -= 360
  if (toBoundary < -180) toBoundary += 360
  const fraction = toBoundary / delta
  return fraction < 0.5 ? prevDate : curDate
}

function dailyDelta(prev: number, cur: number): number {
  let diff = cur - prev
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

// ─── Retrogrades ──────────────────────────────────────────────────────────

export function detectRetrogrades(series: LongitudeSeries): SkyCycle[] {
  const cycles: SkyCycle[] = []
  for (const planet of RETROGRADE_PLANETS) {
    const key = lonKey(planet)
    let start: { date: string; sign: ZodiacSign } | null = null
    // A retrograde already under way at the series start has no known station; skip it.
    let skipOpen = series.length > 1 && dailyDelta(series[0].lons[key], series[1].lons[key]) < 0

    for (let i = 1; i < series.length; i++) {
      const isRetro = dailyDelta(series[i - 1].lons[key], series[i].lons[key]) < 0
      if (skipOpen) {
        if (!isRetro) skipOpen = false
        continue
      }
      if (isRetro && !start) {
        start = { date: series[i].date, sign: signOf(series[i].lons[key]) }
      } else if (!isRetro && start) {
        const endDate = series[i].date
        const endSign = signOf(series[i].lons[key])
        const where = start.sign === endSign ? `in ${start.sign}` : `from ${start.sign} back into ${endSign}`
        cycles.push({
          id: `retrograde:${planet}:${start.date}`,
          kind: 'retrograde',
          scope: 'collective',
          title: `${planet} retrograde`,
          subtitle: `${where}, ${dateRange(start.date, endDate)}`,
          startDate: start.date,
          endDate,
          headsUpDays: 7,
          keyDates: [start.date, endDate],
          planet,
          sign: start.sign,
          familyKey: `retrograde:${planet}`,
        })
        start = null
      }
    }
    // Still retrograde at the series end: the station direct is unknown, so leave it out.
  }
  return cycles
}

// ─── Slow planets changing sign ───────────────────────────────────────────

export function detectSlowIngresses(series: LongitudeSeries): SkyCycle[] {
  const cycles: SkyCycle[] = []
  for (const planet of SLOW_PLANETS) {
    const key = lonKey(planet)
    const visited = new Map<ZodiacSign, string>()
    visited.set(signOf(series[0]?.lons[key] ?? 0), series[0]?.date ?? '')
    for (let i = 1; i < series.length; i++) {
      const prevSign = signOf(series[i - 1].lons[key])
      const sign = signOf(series[i].lons[key])
      if (sign === prevSign) continue
      const date = crossingDate(series[i - 1].date, series[i].date, series[i - 1].lons[key], series[i].lons[key])
      const backward = dailyDelta(series[i - 1].lons[key], series[i].lons[key]) < 0
      const seenBefore = visited.has(sign)
      visited.set(sign, date)
      const title = backward
        ? `${planet} steps back into ${sign}`
        : seenBefore
          ? `${planet} returns to ${sign}`
          : `${planet} enters ${sign}`
      const endDate = addDays(date, INGRESS_SETTLING_DAYS)
      cycles.push({
        id: `ingress:${planet}:${sign}:${date}`,
        kind: 'ingress',
        scope: 'collective',
        title,
        subtitle: `${shortDate(date)}, a shift that colours the months or years ahead`,
        startDate: date,
        endDate,
        headsUpDays: 10,
        keyDates: [date],
        planet,
        sign,
        familyKey: `ingress:${planet}`,
      })
    }
  }
  return cycles
}

// ─── Seasons ──────────────────────────────────────────────────────────────

const SEASON_GATES: Partial<Record<ZodiacSign, { label: string; seasonName: NonNullable<SkyCycle['seasonName']> }>> = {
  Aries: { label: 'March equinox', seasonName: 'spring' },
  Cancer: { label: 'June solstice', seasonName: 'summer' },
  Libra: { label: 'September equinox', seasonName: 'autumn' },
  Capricorn: { label: 'December solstice', seasonName: 'winter' },
}

export function detectSeasons(series: LongitudeSeries): SkyCycle[] {
  const gates: Array<{ date: string; sign: ZodiacSign }> = []
  for (let i = 1; i < series.length; i++) {
    const prev = signOf(series[i - 1].lons.sun)
    const cur = signOf(series[i].lons.sun)
    if (prev !== cur && SEASON_GATES[cur]) {
      gates.push({
        date: crossingDate(series[i - 1].date, series[i].date, series[i - 1].lons.sun, series[i].lons.sun),
        sign: cur,
      })
    }
  }
  const cycles: SkyCycle[] = []
  for (let i = 0; i < gates.length - 1; i++) {
    const gate = gates[i]
    const meta = SEASON_GATES[gate.sign]!
    const endDate = addDays(gates[i + 1].date, -1)
    cycles.push({
      id: `season:${gate.sign}:${gate.date}`,
      kind: 'season',
      scope: 'collective',
      title: `The Sun enters ${gate.sign}`,
      subtitle: `${meta.label}, ${shortDate(gate.date)}. This season runs to ${dateRange(gate.date, endDate).split(' to ')[1]}`,
      startDate: gate.date,
      endDate,
      headsUpDays: 7,
      keyDates: [gate.date],
      planet: 'Sun',
      sign: gate.sign,
      seasonName: meta.seasonName,
      familyKey: `season:${gate.sign}`,
    })
  }
  return cycles
}

// ─── Eclipses ─────────────────────────────────────────────────────────────

export function classifyEclipse(event: MoonEvent): 'solar' | 'lunar' | null {
  const toNode = Math.min(
    angularSep(event.moonLongitude, event.nodeLongitude),
    angularSep(event.moonLongitude, event.nodeLongitude + 180),
  )
  if (event.phase === 'new' && toNode < SOLAR_ECLIPSE_NODE_LIMIT) return 'solar'
  if (event.phase === 'full' && toNode < LUNAR_ECLIPSE_NODE_LIMIT) return 'lunar'
  return null
}

export function detectEclipseSeasons(events: MoonEvent[]): SkyCycle[] {
  const eclipses = events
    .map((e) => ({ ...e, type: classifyEclipse(e) }))
    .filter((e): e is MoonEvent & { type: 'solar' | 'lunar' } => e.type !== null)
    .sort((a, b) => a.date.localeCompare(b.date))

  const seasons: Array<typeof eclipses> = []
  for (const e of eclipses) {
    const current = seasons[seasons.length - 1]
    if (current && daysBetween(current[current.length - 1].date, e.date) <= ECLIPSE_SEASON_GAP_DAYS) {
      current.push(e)
    } else {
      seasons.push([e])
    }
  }

  return seasons.map((group) => {
    const first = group[0]
    const last = group[group.length - 1]
    const parts = group.map(
      (e) => `${e.type} eclipse in ${signOf(e.moonLongitude)} (${shortDate(e.date)})`,
    )
    return {
      id: `eclipse:${first.date}`,
      kind: 'eclipse' as const,
      scope: 'collective' as const,
      title: 'Eclipse season',
      subtitle: parts.join(', then ').replace(/^./, (c) => c.toUpperCase()),
      startDate: first.date,
      endDate: addDays(last.date, ECLIPSE_AFTERGLOW_DAYS),
      headsUpDays: 7,
      keyDates: group.map((e) => e.date),
      sign: signOf(first.moonLongitude),
      eclipseType: first.type,
      familyKey: 'eclipse',
    }
  })
}

// ─── Personal transits ────────────────────────────────────────────────────

const POINT_LABEL: Record<NatalPoint, string> = {
  Sun: 'Sun',
  Moon: 'Moon',
  Ascendant: 'rising',
  Midheaven: 'midheaven',
}

const ASPECT_VERB: Record<string, string> = {
  conjunction: 'meets',
  square: 'squares',
  opposition: 'opposes',
  trine: 'trines',
}

export function natalPointsFromChart(chart: NatalChart): Array<{ point: NatalPoint; longitude: number }> {
  const points: Array<{ point: NatalPoint; longitude: number }> = [
    { point: 'Sun', longitude: chart.sun.longitude },
    { point: 'Moon', longitude: chart.moon.longitude },
  ]
  if (!chart.birthTimeUnknown && typeof chart.ascendantLongitude === 'number') {
    points.push({ point: 'Ascendant', longitude: chart.ascendantLongitude })
  }
  if (!chart.birthTimeUnknown && typeof chart.midheavenLongitude === 'number') {
    points.push({ point: 'Midheaven', longitude: chart.midheavenLongitude })
  }
  return points
}

export type SlowLongitudes = Pick<DailyPlanetLongitudes, 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'>
export type SlowLongitudeSeries = Array<{ date: string; lons: SlowLongitudes }>

export function detectPersonalTransits(
  series: SlowLongitudeSeries,
  points: Array<{ point: NatalPoint; longitude: number }>,
): SkyCycle[] {
  const cycles: SkyCycle[] = []
  for (const planet of SLOW_PLANETS) {
    const key = planet.toLowerCase() as keyof SlowLongitudes
    for (const { point, longitude } of points) {
      for (const { aspect, angle } of PERSONAL_ASPECTS) {
        // Runs of consecutive in-orb days, each with its tightest day.
        const passes: Array<{ start: string; end: string; exact: string; bestOrb: number }> = []
        let current: (typeof passes)[number] | null = null
        for (const day of series) {
          const orb = Math.abs(angularSep(day.lons[key], longitude) - angle)
          if (orb <= PERSONAL_ORB) {
            if (!current) current = { start: day.date, end: day.date, exact: day.date, bestOrb: orb }
            current.end = day.date
            if (orb < current.bestOrb) {
              current.bestOrb = orb
              current.exact = day.date
            }
          } else if (current) {
            passes.push(current)
            current = null
          }
        }
        // In orb at the series end: the last day is unknown, so the cycle can't close yet.
        if (current) passes.push({ ...current, end: '' })

        const groups: Array<typeof passes> = []
        for (const pass of passes) {
          const g = groups[groups.length - 1]
          if (g && g[g.length - 1].end && daysBetween(g[g.length - 1].end, pass.start) <= PASS_MERGE_GAP_DAYS) {
            g.push(pass)
          } else {
            groups.push([pass])
          }
        }

        for (const group of groups) {
          const last = group[group.length - 1]
          if (!last.end) continue
          const startDate = group[0].start
          const passesLabel = group.length > 1 ? `${group.length} exact passes, ` : ''
          cycles.push({
            id: `personal:${planet}:${aspect}:${point}:${startDate}`,
            kind: 'personal_transit',
            scope: 'personal',
            title: `${planet} ${ASPECT_VERB[aspect]} your ${POINT_LABEL[point]}`,
            subtitle: `${passesLabel}${dateRange(startDate, last.end)}`,
            startDate,
            endDate: last.end,
            headsUpDays: 14,
            keyDates: group.map((p) => p.exact),
            planet,
            natalPoint: point,
            aspect,
            familyKey: `personal:${planet}:${aspect}:${point}`,
          })
        }
      }
    }
  }
  return cycles
}
