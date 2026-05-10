/**
 * design-chart.ts
 *
 * Computes the two charts that Human Design and Gene Keys are built on:
 *
 *   - **Personality** activations — planetary positions at the exact birth
 *     moment. Synonymous with the natal chart, but transformed into the
 *     I Ching gate wheel rather than the Western zodiac.
 *
 *   - **Design** activations — planetary positions at the moment the Sun
 *     was exactly 88° behind its natal tropical longitude. This is *not*
 *     "88 days before birth" — it's a degree-based solar arc, which lands
 *     somewhere between 86 and 91 days before birth depending on Earth's
 *     orbital speed at the relevant time of year.
 *
 * For each chart we compute 13 activations (the standard HD/Gene Keys set):
 *   Sun, Earth, Moon, North Node, South Node,
 *   Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
 *
 *   Earth      = Sun + 180°
 *   South Node = North Node + 180°
 *
 * Lunar nodes use the *mean* node (standard HD convention), computed from
 * Meeus's polynomial expression in Julian centuries from J2000.0.
 */

import {
  getSunLongitude,
  getDailyLongitudes,
  birthLocalToUTC,
  msToJDE,
  normalizeDeg,
} from '../astronomia-adapter'
import type { BirthData } from '../astronomia-adapter'
import {
  longitudeToActivation,
  type GateActivation,
} from './gate-wheel'

const SUN_MEAN_MOTION_DEG_PER_DAY = 0.9856473354

const ACTIVATION_KEYS = [
  'sun',
  'earth',
  'moon',
  'northNode',
  'southNode',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const

export type ActivationKey = (typeof ACTIVATION_KEYS)[number]

export type ActivationSet = Record<ActivationKey, GateActivation & { longitude: number }>

export interface ChartActivations {
  jde: number
  utcMs: number
  activations: ActivationSet
}

export interface DesignChartResult {
  personality: ChartActivations
  design: ChartActivations
}

// ─── Mean lunar node ─────────────────────────────────────────────────────

/**
 * Mean longitude of the Moon's ascending node, per Meeus Astronomical
 * Algorithms (chap. 47). Returns degrees in [0, 360).
 *
 *   Ω = 125.04452 − 1934.136261·T + 0.0020708·T² + T³/450000
 */
function meanLunarNodeLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525
  const omega =
    125.04452 -
    1934.136261 * T +
    0.0020708 * T * T +
    (T * T * T) / 450000
  return normalizeDeg(omega)
}

// ─── Birth-moment JDE ────────────────────────────────────────────────────

function birthMomentJDE(birth: BirthData): { jde: number; utcMs: number } {
  if (!birth.timeUnknown && birth.time && birth.timezone) {
    const utc = birthLocalToUTC(birth.date, birth.time, birth.timezone)
    return { jde: msToJDE(utc.getTime()), utcMs: utc.getTime() }
  }
  // Unknown time: use noon at birth date in UTC. Same convention as the
  // existing natal chart code path. HD with unknown birth time is degraded —
  // gates change every ~16 minutes, so the result is unreliable.
  const utcNoon = new Date(`${birth.date}T12:00:00Z`)
  return { jde: msToJDE(utcNoon.getTime()), utcMs: utcNoon.getTime() }
}

// ─── Design moment solver: when was Sun exactly 88° before natal Sun? ────

/**
 * Returns the signed shortest delta from `from` to `to`, in (-180, 180].
 */
function signedDelta(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

/**
 * Solve for the JDE at which `getSunLongitude(jde) == targetLongitude`,
 * starting near `seedJDE`. Uses Newton-style iteration with the Sun's
 * mean motion. Sun longitude is monotonic on the timescale we care about
 * (no retrograde for the Sun), so this converges in 3–4 iterations.
 */
function solveSunLongitudeJDE(targetLongitude: number, seedJDE: number): number {
  let jde = seedJDE
  for (let i = 0; i < 12; i++) {
    const current = getSunLongitude(jde)
    const err = signedDelta(current, targetLongitude)
    if (Math.abs(err) < 1e-7) return jde
    jde += err / SUN_MEAN_MOTION_DEG_PER_DAY
  }
  return jde
}

// ─── Activation set assembly ─────────────────────────────────────────────

function buildActivationSet(jde: number, birthDateStr: string): ActivationSet {
  const longs = getDailyLongitudes(jde, birthDateStr)
  const sunLon = longs.sun
  const earthLon = normalizeDeg(sunLon + 180)
  const northNodeLon = meanLunarNodeLongitude(jde)
  const southNodeLon = normalizeDeg(northNodeLon + 180)

  const longitudes: Record<ActivationKey, number> = {
    sun: sunLon,
    earth: earthLon,
    moon: longs.moon,
    northNode: northNodeLon,
    southNode: southNodeLon,
    mercury: longs.mercury,
    venus: longs.venus,
    mars: longs.mars,
    jupiter: longs.jupiter,
    saturn: longs.saturn,
    uranus: longs.uranus,
    neptune: longs.neptune,
    pluto: longs.pluto,
  }

  const out = {} as ActivationSet
  for (const key of ACTIVATION_KEYS) {
    const lon = longitudes[key]
    out[key] = { longitude: lon, ...longitudeToActivation(lon) }
  }
  return out
}

// ─── Public API ──────────────────────────────────────────────────────────

export function computeDesignAndPersonality(birth: BirthData): DesignChartResult {
  const { jde: personalityJDE, utcMs: personalityUTC } = birthMomentJDE(birth)
  const personalityActivations = buildActivationSet(personalityJDE, birth.date)
  const natalSunLon = personalityActivations.sun.longitude

  // Design: solar arc 88° before natal Sun (degree-based, not day-based)
  const designSunTarget = normalizeDeg(natalSunLon - 88)
  const seedJDE = personalityJDE - 88 / SUN_MEAN_MOTION_DEG_PER_DAY
  const designJDE = solveSunLongitudeJDE(designSunTarget, seedJDE)
  const designUTC = (designJDE - 2440587.5) * 86400000

  // Use the same birth-year Pluto lookup for both — Pluto moves <0.1° in 89 days
  const designActivations = buildActivationSet(designJDE, birth.date)

  return {
    personality: {
      jde: personalityJDE,
      utcMs: personalityUTC,
      activations: personalityActivations,
    },
    design: {
      jde: designJDE,
      utcMs: designUTC,
      activations: designActivations,
    },
  }
}
