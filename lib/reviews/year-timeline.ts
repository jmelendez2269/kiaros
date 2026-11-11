/**
 * Shape of the Reviews page year timeline (Year and List views), plus the
 * pure helpers that build it. No server imports, so it is unit-testable.
 */

import { addDays, weekOf } from '../reflections/periods'

export type ReviewState = 'read' | 'ready' | 'open' | 'future'

export interface TimelineMonth {
  index: number
  /** First and last day (YYYY-MM-DD, inclusive). */
  start: string
  end: string
  state: ReviewState
  /** Distinct days with a journal entry. */
  daysWritten: number
  /** One line about the month: the look back's first sentence once read, else what is known. */
  line: string
  /** Source chips from a saved look back. */
  chips: string[]
}

export interface TimelineQuarter {
  index: number
  start: string
  end: string
  state: ReviewState
}

export interface TimelineWeek {
  /** ISO week year and number, as the weekly reflection is addressed. */
  year: number
  index: number
  /** Monday and Sunday (YYYY-MM-DD, inclusive). */
  start: string
  end: string
  state: ReviewState
  /** The first sentence of the week's reflection once it is prepared. */
  line: string | null
}

export type SkyEventKind = 'retrograde' | 'eclipse' | 'ingress' | 'season' | 'personal_transit'

export interface TimelineSkyEvent {
  id: string
  kind: SkyEventKind
  personal: boolean
  title: string
  subtitle: string
  start: string
  end: string
  /** A short glyph for the list view. */
  glyph: string
}

export interface TimelineUnwrapped {
  /** ready: the year has ended and nothing is prepared yet; read: a reflection exists; so-far: the year is under way and can be read as it goes; waiting: the year has not begun. */
  state: 'ready' | 'read' | 'so-far' | 'waiting'
  opensOn: string
  daysToGo: number
}

export interface YearTimeline {
  year: number
  today: string
  /** Years the member can switch between, oldest first. */
  years: number[]
  months: TimelineMonth[]
  quarters: TimelineQuarter[]
  /** Weeks (Monday to Sunday) whose Monday falls in this year, from when the member joined. */
  weeks: TimelineWeek[]
  sky: TimelineSkyEvent[]
  unwrapped: TimelineUnwrapped
}

const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthName(index: number): string {
  return MONTH_LONG[index - 1] ?? ''
}

export function reviewState(start: string, end: string, today: string, cached: boolean): ReviewState {
  if (end < today) return cached ? 'read' : 'ready'
  if (start <= today) return 'open'
  return 'future'
}

/** Every Monday-to-Sunday week whose Monday falls in the calendar year, oldest first. */
export function weeksStartingInYear(year: number): Array<{ year: number; index: number; start: string; end: string }> {
  const jan1 = `${year}-01-01`
  let monday = addDays(jan1, (8 - new Date(jan1 + 'T00:00:00Z').getUTCDay()) % 7)
  const out: Array<{ year: number; index: number; start: string; end: string }> = []
  while (monday.slice(0, 4) === String(year)) {
    out.push({ ...weekOf(monday), start: monday, end: addDays(monday, 6) })
    monday = addDays(monday, 7)
  }
  return out
}

/** The weeks listed under a month: those whose Monday falls in it. */
export function weeksForMonth<T extends { start: string }>(weeks: T[], month: { start: string }): T[] {
  return weeks.filter(w => w.start.slice(0, 7) === month.start.slice(0, 7))
}

/** "Nov 2 – 8", or "Nov 30 – Dec 6" across a month end. */
export function weekRangeLabel(week: { start: string; end: string }): string {
  const sameMonth = week.start.slice(0, 7) === week.end.slice(0, 7)
  return `${shortDay(week.start)} – ${sameMonth ? Number(week.end.slice(8, 10)) : shortDay(week.end)}`
}

/** Today shows last week's card Monday to Wednesday, for the week that closed on Sunday. */
const LAST_WEEK_CARD_DAYS = 3

/** The Monday of the week that just closed, while its card is showing on Today; else null. */
export function lastWeekOnToday(todayDate: string): string | null {
  const sinceMonday = (new Date(`${todayDate}T00:00:00Z`).getUTCDay() + 6) % 7
  return sinceMonday < LAST_WEEK_CARD_DAYS ? addDays(todayDate, -sinceMonday - 7) : null
}

/** Where a week's reflection opens. The Reflections page forwards it when the journal holds look backs. */
export function weekReflectionHref(week: { start: string }): string {
  return `/reflections?kind=week&start=${week.start}`
}

/** The first sentence of a look back, short enough for one line. */
export function firstSentence(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const match = clean.match(/^(.+?[.!?])(\s|$)/)
  const sentence = match ? match[1] : clean
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
}
const ASPECT_GLYPH: Record<string, string> = { conjunction: '☌', square: '□', opposition: '☍', trine: '△', sextile: '⚹' }

export function skyGlyph(kind: SkyEventKind, planet?: string, aspect?: string): string {
  if (kind === 'eclipse') return '◐'
  if (kind === 'season') return '☉'
  if (kind === 'personal_transit') return ASPECT_GLYPH[aspect ?? ''] ?? '✦'
  return PLANET_GLYPH[planet ?? ''] ?? '✦'
}

/** Days written per month (index 1..12) from a list of entry dates in one year. */
export function daysWrittenByMonth(dates: string[], year: number): number[] {
  const perMonth = Array.from({ length: 12 }, () => new Set<string>())
  for (const date of dates) {
    if (Number(date.slice(0, 4)) !== year) continue
    perMonth[Number(date.slice(5, 7)) - 1]?.add(date.slice(0, 10))
  }
  return perMonth.map(s => s.size)
}

/** What a month without a read look back can still say. */
export function fallbackLine(state: ReviewState, daysWritten: number, closesOn: string): string {
  if (state === 'future') return 'Not yet'
  if (state === 'open') return `Still unfolding · closes ${closesOn}`
  if (daysWritten === 0) return 'A quiet month in the journal. The look back draws on the sky and your plans.'
  return `${daysWritten} ${daysWritten === 1 ? 'day' : 'days'} written. Ready to look back on.`
}

/**
 * Sky events to show beside a month in the list view: those that begin in it,
 * plus, in the first visible month, anything already under way.
 */
export function skyForMonth(sky: TimelineSkyEvent[], month: TimelineMonth, first: boolean): TimelineSkyEvent[] {
  return sky
    .filter(e => (e.start >= month.start && e.start <= month.end) || (first && e.start < month.start && e.end >= month.start))
    .sort((a, b) => a.start.localeCompare(b.start))
}

/**
 * Packs overlapping bars into rows (greedy, by start date) so none overlap.
 * Returns the row number for each event id.
 */
export function packRows(events: Array<{ id: string; start: string; end: string }>, gapDays = 0): Record<string, number> {
  const rowsEnd: string[] = []
  const out: Record<string, number> = {}
  for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    let row = rowsEnd.findIndex(end => addDaysISO(end, gapDays) < e.start)
    if (row === -1) { row = rowsEnd.length; rowsEnd.push(e.end) } else rowsEnd[row] = e.end
    out[e.id] = row
  }
  return out
}

function addDaysISO(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Day of year (1-based) for a date, and the year's length. */
export function dayOfYear(date: string): number {
  const year = Number(date.slice(0, 4))
  return Math.floor((Date.parse(date + 'T12:00:00Z') - Date.UTC(year, 0, 1, 12)) / 86_400_000) + 1
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

export function shortDay(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
}
