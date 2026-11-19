/**
 * The sky of a planner year, built from the app's own ephemeris tables
 * (lib/sky-cycles/data). Pure functions: no dates are written here, every
 * date comes from a detected cycle.
 */

import { getAreaDefinition } from '@/lib/areas'
import { cycleMeaning, HOUSE_AREAS, PLANET_THEMES } from '@/lib/sky-cycles/copy'
import { addDays, dateRange, daysBetween, shortDate } from '@/lib/sky-cycles/detect'
import type { SkyCycle } from '@/lib/sky-cycles/types'
import type { NatalChart, Planet, ZodiacSign } from '@/types/blueprint'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
}

export const SIGN_GLYPH: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

const ASPECT_GLYPH: Record<string, string> = { conjunction: '☌', opposition: '☍', square: '□', trine: '△' }
const POINT_GLYPH: Record<string, string> = { Sun: '☉', Moon: '☽', Ascendant: 'AC', Midheaven: 'MC' }

/** Planets whose retrogrades get their own row. The slower ones turn every year for months. */
const ROW_RETROGRADES: Planet[] = ['Mercury', 'Venus', 'Mars']
const SLOW_RETROGRADES: Planet[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

export type SkyTone = 'plum' | 'ember' | 'starlight' | 'sage' | 'violet'

export interface YearSkyRow {
  key: string
  glyph: string
  title: string
  note: string
  tone: SkyTone
  /** Percent of the year, 0 to 100. */
  bands: Array<{ left: number; width: number }>
  /** Percent of the year, 0 to 100. */
  marks: number[]
}

export interface ChartMeeting {
  id: string
  /** Sort key (YYYY-MM-DD). */
  date: string
  kicker: string
  title: string
  body: string
  tone: SkyTone
}

export interface YearSky {
  year: number
  rows: YearSkyRow[]
  /** One line on the slow planets' yearly retrogrades, or null. */
  slowRetrogrades: string | null
  /** Where the year meets the member's own chart: personal transits first, then eclipses and sign changes by house. */
  meetings: ChartMeeting[]
  /** False when the birth time is unknown, so houses are left out. */
  housesKnown: boolean
}

export interface LookAheadGoal {
  title: string
  areaName: string
}

const yearStart = (year: number) => `${year}-01-01`
const yearEnd = (year: number) => `${year}-12-31`

/** Cycles that touch any day of `year`, earliest first. */
export function cyclesInYear(cycles: SkyCycle[], year: number): SkyCycle[] {
  const from = yearStart(year)
  const to = yearEnd(year)
  return cycles
    .filter((c) => c.endDate >= from && c.startDate <= to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))
}

function daysInYear(year: number): number {
  return daysBetween(yearStart(year), yearStart(year + 1))
}

/** Where a day sits in the year, as a percent from 0 to 100. */
export function yearPosition(date: string, year: number): number {
  const pos = (daysBetween(yearStart(year), date) / daysInYear(year)) * 100
  return Math.min(100, Math.max(0, Math.round(pos * 10) / 10))
}

function band(start: string, end: string, year: number): { left: number; width: number } {
  const left = yearPosition(start < yearStart(year) ? yearStart(year) : start, year)
  const right = yearPosition(addDays(end > yearEnd(year) ? yearEnd(year) : end, 1), year)
  return { left, width: Math.max(0.5, Math.round((right - left) * 10) / 10) }
}

const inYear = (date: string, year: number) => date >= yearStart(year) && date <= yearEnd(year)

function countWord(n: number): string {
  return ['', 'Once', 'Twice', 'Three times', 'Four times'][n] ?? `${n} times`
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** Whole-sign house of a sign for this chart, or null when the birth time is unknown. */
export function wholeSignHouse(sign: ZodiacSign, chart: NatalChart | null): number | null {
  if (!chart || chart.birthTimeUnknown) return null
  const rising = SIGNS.indexOf(chart.rising)
  const target = SIGNS.indexOf(sign)
  if (rising < 0 || target < 0) return null
  return ((target - rising + 12) % 12) + 1
}

export interface EclipseEvent {
  date: string
  type: 'solar' | 'lunar'
  sign: ZodiacSign
}

/** The single eclipses inside an eclipse season, from the detector's own subtitle and key dates. */
export function eclipsesOf(cycle: SkyCycle): EclipseEvent[] {
  if (cycle.kind !== 'eclipse') return []
  const parts = Array.from(cycle.subtitle.matchAll(/(solar|lunar) eclipse in ([A-Z][a-z]+)/gi))
  return cycle.keyDates.flatMap((date, i) => {
    const part = parts[i]
    if (!part) return []
    const sign = SIGNS.find((s) => s === part[2])
    if (!sign) return []
    return [{ date, type: part[1].toLowerCase() as 'solar' | 'lunar', sign }]
  })
}

function goalInHouse(house: number, goals: LookAheadGoal[]): LookAheadGoal | null {
  const primary = goals.find((g) => getAreaDefinition(g.areaName).primaryHouses[0] === house)
  return primary ?? goals.find((g) => getAreaDefinition(g.areaName).primaryHouses.includes(house)) ?? null
}

function houseLine(house: number | null, goals: LookAheadGoal[]): string {
  if (!house) return ''
  const area = HOUSE_AREAS[house]
  const goal = goalInHouse(house, goals)
  const goalLine = goal ? ` Your goal “${goal.title}” sits in this house.` : ''
  return area ? ` Your ${ordinal(house)} house is the area of ${area}.${goalLine}` : goalLine
}

function retrogradeRows(cycles: SkyCycle[], year: number): YearSkyRow[] {
  const tones: Record<string, SkyTone> = { Mercury: 'ember', Venus: 'violet', Mars: 'plum' }
  return ROW_RETROGRADES.flatMap((planet) => {
    const runs = cycles.filter((c) => c.kind === 'retrograde' && c.planet === planet)
    if (runs.length === 0) return []
    const note =
      runs.length === 1
        ? dateRange(runs[0].startDate, runs[0].endDate)
        : `${countWord(runs.length)}: ${runs.map((r) => shortDate(r.startDate)).join(', ')}`
    return [{
      key: `retrograde:${planet}`,
      glyph: PLANET_GLYPH[planet],
      title: `${planet} retrograde`,
      note,
      tone: tones[planet],
      bands: runs.map((r) => band(r.startDate, r.endDate, year)),
      marks: [],
    }]
  })
}

function eclipseRow(cycles: SkyCycle[], year: number): YearSkyRow[] {
  const events = cycles.flatMap(eclipsesOf).filter((e) => inYear(e.date, year))
  if (events.length === 0) return []
  const months = Array.from(new Set(events.map((e) => MONTH_NAMES[Number(e.date.slice(5, 7)) - 1])))
  return [{
    key: 'eclipses',
    glyph: '●',
    title: `Eclipses in ${joinList(months)}`,
    note: joinList(events.map((e) => shortDate(e.date))),
    tone: 'starlight',
    bands: [],
    marks: events.map((e) => yearPosition(e.date, year)),
  }]
}

/** The sign a slow planet is in when the year starts: the sign of its latest ingress before then. */
function signAtYearStart(planet: Planet, all: SkyCycle[], year: number): ZodiacSign | null {
  let best: SkyCycle | null = null
  for (const c of all) {
    if (c.kind !== 'ingress' || c.planet !== planet || c.startDate >= yearStart(year)) continue
    if (!best || c.startDate > best.startDate) best = c
  }
  return best?.sign ?? null
}

function ingressRows(inYearCycles: SkyCycle[], all: SkyCycle[], year: number): YearSkyRow[] {
  const ingresses = inYearCycles.filter((c) => c.kind === 'ingress' && c.planet && c.sign && inYear(c.startDate, year))
  const planets = Array.from(new Set(ingresses.map((c) => c.planet as Planet)))
  return planets.map((planet) => {
    const own = ingresses.filter((c) => c.planet === planet)
    const before = signAtYearStart(planet, all, year)
    const signs = [before, ...own.map((c) => c.sign as ZodiacSign)].filter((s): s is ZodiacSign => Boolean(s))
    const title = signs.length > 1 ? `${planet} in ${signs[0]}, then ${signs.slice(1).join(', then ')}` : `${planet} enters ${signs[0]}`
    const dates = own.map((c) => shortDate(c.startDate))
    return {
      key: `ingress:${planet}`,
      glyph: PLANET_GLYPH[planet],
      title,
      note: `Changes sign ${joinList(dates)}`,
      tone: 'sage' as const,
      bands: [band(yearStart(year), addDays(own[0].startDate, -1), year)],
      marks: own.map((c) => yearPosition(c.startDate, year)),
    }
  })
}

function slowRetrogradeLine(cycles: SkyCycle[]): string | null {
  const parts = SLOW_RETROGRADES.flatMap((planet) =>
    cycles
      .filter((c) => c.kind === 'retrograde' && c.planet === planet)
      .map((c) => `${planet} ${dateRange(c.startDate, c.endDate)}`),
  )
  if (parts.length === 0) return null
  return `The slow planets also turn retrograde for months, as they do every year: ${parts.join('; ')}.`
}

function personalMeetings(personal: SkyCycle[], chart: NatalChart | null, year: number): ChartMeeting[] {
  return personal.map((c) => {
    const exacts = c.keyDates.filter((d) => inYear(d, year))
    const when = exacts.length ? `Exact ${joinList(exacts.map(shortDate))}` : dateRange(c.startDate, c.endDate)
    const glyphs = [PLANET_GLYPH[c.planet ?? ''], ASPECT_GLYPH[c.aspect ?? ''], POINT_GLYPH[c.natalPoint ?? '']].filter(Boolean).join(' ')
    const natalHouse =
      c.natalPoint === 'Sun' ? chart?.sun.house : c.natalPoint === 'Moon' ? chart?.moon.house : undefined
    const where = natalHouse && !chart?.birthTimeUnknown && HOUSE_AREAS[natalHouse]
      ? ` Your ${c.natalPoint} sits in your ${ordinal(natalHouse)} house, the area of ${HOUSE_AREAS[natalHouse]}.`
      : ''
    return {
      id: c.id,
      date: exacts[0] ?? c.startDate,
      kicker: `${when} · ${glyphs}`,
      title: c.title,
      body: `${cycleMeaning(c)}${where}`,
      tone: 'violet' as const,
    }
  })
}

function eclipseMeetings(cycles: SkyCycle[], chart: NatalChart | null, goals: LookAheadGoal[], year: number): ChartMeeting[] {
  return cycles
    .flatMap(eclipsesOf)
    .filter((e) => inYear(e.date, year))
    .map((e) => {
      const house = wholeSignHouse(e.sign, chart)
      return {
        id: `eclipse:${e.date}`,
        date: e.date,
        kicker: `${shortDate(e.date)} · ${e.type} eclipse`,
        title: house ? `A ${e.type} eclipse in your ${ordinal(house)} house` : `A ${e.type} eclipse in ${e.sign}`,
        body: house
          ? `In ${e.sign}. Eclipses are often read as turning points, when things begin or wrap up faster than usual.${houseLine(house, goals)}`
          : 'Eclipses are often read as turning points, when things begin or wrap up faster than usual.',
        tone: 'ember' as const,
      }
    })
}

function ingressMeetings(cycles: SkyCycle[], chart: NatalChart | null, goals: LookAheadGoal[], year: number): ChartMeeting[] {
  return cycles
    .filter((c) => c.kind === 'ingress' && c.planet && c.sign && inYear(c.startDate, year))
    .map((c) => {
      const sign = c.sign as ZodiacSign
      const house = wholeSignHouse(sign, chart)
      const theme = PLANET_THEMES[c.planet ?? ''] ?? 'its themes'
      return {
        id: c.id,
        date: c.startDate,
        kicker: `${shortDate(c.startDate)} · ${PLANET_GLYPH[c.planet ?? '']} enters ${SIGN_GLYPH[sign]}`,
        title: house ? `${c.planet} moves into your ${ordinal(house)} house` : `${c.planet} moves into ${sign}`,
        body: `${c.planet} stays in a sign for a long time, so this is read as a change in the backdrop around ${theme}.${house ? ` In ${sign}.` : ''}${houseLine(house, goals)}`,
        tone: 'sage' as const,
      }
    })
}

/**
 * The year's sky over one member's chart.
 * `collective` is every collective cycle we know; `personal` this member's
 * slow transits (any range: they are clipped to the year here).
 */
export function buildYearSky(input: {
  year: number
  collective: SkyCycle[]
  personal: SkyCycle[]
  chart: NatalChart | null
  goals: LookAheadGoal[]
}): YearSky {
  const { year, chart, goals } = input
  const collective = cyclesInYear(input.collective, year)
  const personal = cyclesInYear(input.personal, year).filter((c) => c.kind === 'personal_transit')
  const rows = [
    ...retrogradeRows(collective, year),
    ...eclipseRow(collective, year),
    ...ingressRows(collective, input.collective, year),
  ]
  const shared = [...eclipseMeetings(collective, chart, goals, year), ...ingressMeetings(collective, chart, goals, year)]
    .sort((a, b) => a.date.localeCompare(b.date))
  // Conjunctions and oppositions first, as the strongest, then by date.
  const rank = (c: SkyCycle) => ['conjunction', 'opposition', 'square', 'trine'].indexOf(c.aspect ?? '')
  const ranked = [...personal].sort((a, b) => rank(a) - rank(b) || a.startDate.localeCompare(b.startDate))
  const mine = personalMeetings(ranked, chart, year)
  return {
    year,
    rows,
    slowRetrogrades: slowRetrogradeLine(collective),
    // A few of each, so a chart with many slow transits still sees the year's eclipses.
    meetings: [...mine.slice(0, 3), ...shared.slice(0, 4)],
    housesKnown: Boolean(chart && !chart.birthTimeUnknown),
  }
}
