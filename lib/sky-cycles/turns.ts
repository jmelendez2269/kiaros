/**
 * "The sky turned today": the days a sky cycle reaches one of its hinges.
 * A planet turning retrograde or direct, an eclipse, a slow planet changing
 * sign, or a slow transit to the member's own chart going exact.
 *
 * Pure: no server imports, so it is unit-testable.
 */
import type { Planet } from '@/types/blueprint'
import { addDays, daysBetween, shortDate } from './detect'
import type { SkyCycle } from './types'

export type SkyTurnMoment = 'turns_retrograde' | 'turns_direct' | 'eclipse' | 'enters' | 'exact'

export interface SkyTurn {
  /** Stable per turn, e.g. "retrograde:Mercury:2026-10-25:turns_direct". */
  id: string
  /** The cycle it belongs to: its full read is on Today. */
  cycleId: string
  moment: SkyTurnMoment
  /** e.g. "Mercury turns direct". */
  title: string
  /** One plain line of context, e.g. "retrograde since Oct 25". */
  detail: string
  /** True for a transit to the member's own chart. */
  personal: boolean
  planet?: Planet
}

/**
 * The calendar day a station falls on for the member. A retrograde's stored
 * start and end are the first noon the planet is seen moving the new way, so
 * the station itself is up to two days earlier: callers resolve it to the hour.
 */
export type StationDay = (planet: Planet, keyDate: string) => string

/** Used when no finer resolver is given: the station is taken as the day before it is first seen. */
export const dayBeforeSeen: StationDay = (_planet, keyDate) => addDays(keyDate, -1)

const STATION_SEARCH_DAYS = 2

function stationTurn(cycle: SkyCycle, which: 'start' | 'end', today: string, stationDay: StationDay): SkyTurn | null {
  if (!cycle.planet) return null
  const keyDate = which === 'start' ? cycle.startDate : cycle.endDate
  if (Math.abs(daysBetween(keyDate, today)) > STATION_SEARCH_DAYS) return null
  if (stationDay(cycle.planet, keyDate) !== today) return null
  const moment = which === 'start' ? 'turns_retrograde' : 'turns_direct'
  return {
    id: `${cycle.id}:${moment}`,
    cycleId: cycle.id,
    moment,
    title: `${cycle.planet} turns ${which === 'start' ? 'retrograde' : 'direct'}`,
    detail: which === 'start' ? (cycle.sign ? `in ${cycle.sign}` : '') : `retrograde since ${shortDate(cycle.startDate)}`,
    personal: false,
    planet: cycle.planet,
  }
}

function eclipseTurn(cycle: SkyCycle, today: string): SkyTurn | null {
  const index = cycle.keyDates.indexOf(today)
  if (index < 0 || !cycle.eclipseType) return null
  const first = cycle.eclipseType
  const type = index % 2 === 0 ? first : first === 'solar' ? 'lunar' : 'solar'
  const name = `${type === 'solar' ? 'Solar' : 'Lunar'} eclipse`
  return {
    id: `${cycle.id}:eclipse:${today}`,
    cycleId: cycle.id,
    moment: 'eclipse',
    title: index === 0 && cycle.sign ? `${name} in ${cycle.sign}` : name,
    detail: index === 0 ? 'opens this eclipse season' : 'closes this eclipse season',
    personal: false,
  }
}

/** Every turn that falls on `today`, personal ones first. Seasons are left out: they are not a turn of the sky's direction. */
export function turnsOn(cycles: SkyCycle[], today: string, stationDay: StationDay = dayBeforeSeen): SkyTurn[] {
  const turns: SkyTurn[] = []
  for (const cycle of cycles) {
    if (cycle.kind === 'retrograde') {
      for (const which of ['start', 'end'] as const) {
        const turn = stationTurn(cycle, which, today, stationDay)
        if (turn) turns.push(turn)
      }
    } else if (cycle.kind === 'eclipse') {
      const turn = eclipseTurn(cycle, today)
      if (turn) turns.push(turn)
    } else if (cycle.kind === 'ingress' && cycle.startDate === today) {
      turns.push({ id: `${cycle.id}:enters`, cycleId: cycle.id, moment: 'enters', title: cycle.title, detail: 'a slow planet changes sign', personal: false, planet: cycle.planet })
    } else if (cycle.kind === 'personal_transit' && cycle.keyDates.includes(today)) {
      turns.push({ id: `${cycle.id}:exact:${today}`, cycleId: cycle.id, moment: 'exact', title: cycle.title, detail: 'exact today, in your own chart', personal: true, planet: cycle.planet })
    }
  }
  return turns.sort((a, b) => Number(b.personal) - Number(a.personal) || a.title.localeCompare(b.title))
}

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/** One sentence naming what turned, e.g. "Mercury and Venus both turn direct." */
export function turnsHeadline(turns: SkyTurn[]): string {
  if (turns.length === 0) return ''
  if (turns.length === 1) return `${turns[0].title}.`
  if (turns.length === 2) {
    const [a, b] = turns
    const stations = a.moment === b.moment && (a.moment === 'turns_direct' || a.moment === 'turns_retrograde') && a.planet && b.planet
    if (stations) return `${a.planet} and ${b.planet} both turn ${a.moment === 'turns_direct' ? 'direct' : 'retrograde'}.`
    return `${a.title}, and ${b.title}.`
  }
  return `${COUNT_WORDS[turns.length] ?? turns.length} turns in the sky today.`
}
