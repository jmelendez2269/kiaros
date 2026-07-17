/**
 * energy-windows.ts
 *
 * The Planner's primary energy model: a handful of broad, coherent windows
 * derived from the sun's real daily arc (sunrise, solar noon, sunset) at the
 * user's location. This replaced per-hour planetary hours as the grid tint —
 * a planet flipping every ~70 minutes never produces a usable "rest window"
 * or "push window" to plan against. Planetary hours remain available in
 * `planetary-hours.ts` as an optional detail layer.
 *
 * Shape of the day:
 *   Rest      midnight -> sunrise         (night, wind-down)
 *   Rising    sunrise  -> mid-morning     (energy building — initiate)
 *   Peak      mid-morning -> early aft.   (centered on solar noon — push)
 *   Settling  early afternoon -> sunset   (declining light — reflect)
 *   Rest      sunset   -> midnight
 */

import type { EnergyType } from '@/types/blueprint'
import { getSunTimes, localMinutesSinceDate } from './planetary-hours'

export interface EnergyWindow {
  /** Minutes since local midnight, clamped to [0, 1440]. */
  startMinute: number
  endMinute: number
  energyType: EnergyType
  label: string
  /** Why this window carries this energy — e.g. "Moon △ natal Venus · 2:14p". */
  reason?: string
}

export interface EnergyWindowsInput {
  /** YYYY-MM-DD, the civil day the grid is rendering. */
  date: string
  /** Standard signed latitude, positive north. */
  lat: number
  /** Standard signed longitude, positive east. */
  lng: number
  /** IANA timezone used to place solar instants on the civil day's clock. */
  timeZone: string
}

// Where the morning tips from "rising" into "peak", as a fraction of the
// sunrise -> solar-noon span; and where the afternoon tips from "peak" into
// "settling", as a fraction of the noon -> sunset span. Peak straddles noon.
const RISING_FRACTION = 0.55
const PEAK_AFTERNOON_FRACTION = 0.4

/**
 * Coherent solar-phase energy windows for one civil day, clipped to
 * [00:00, 24:00) local time. Returns [] when sunrise/sunset is undefined
 * (near-polar latitudes) — callers should render the grid untinted.
 */
export function computeEnergyWindows({ date, lat, lng, timeZone }: EnergyWindowsInput): EnergyWindow[] {
  const { sunrise, sunset } = getSunTimes(date, lat, lng)
  if (!sunrise || !sunset) return []

  const rise = localMinutesSinceDate(sunrise, date, timeZone)
  const set = localMinutesSinceDate(sunset, date, timeZone)
  if (set <= rise || rise < 0 || set > 1440) return []

  const noon = (rise + set) / 2
  const risingEnd = Math.round(rise + (noon - rise) * RISING_FRACTION)
  const peakEnd = Math.round(noon + (set - noon) * PEAK_AFTERNOON_FRACTION)

  const windows: EnergyWindow[] = [
    { startMinute: 0, endMinute: Math.round(rise), energyType: 'rest', label: 'Rest' },
    { startMinute: Math.round(rise), endMinute: risingEnd, energyType: 'initiate', label: 'Rising' },
    { startMinute: risingEnd, endMinute: peakEnd, energyType: 'push', label: 'Peak' },
    { startMinute: peakEnd, endMinute: Math.round(set), energyType: 'reflect', label: 'Settling' },
    { startMinute: Math.round(set), endMinute: 1440, energyType: 'rest', label: 'Rest' },
  ]

  return windows.filter((w) => w.endMinute > w.startMinute)
}
