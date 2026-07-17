/**
 * transit-windows.ts
 *
 * Personalizes the Planner's energy windows from the user's actual sky that
 * day. Three real inputs, layered:
 *
 *  1. Solar frame (location)  — sunrise/sunset night-rest baseline, from
 *     energy-windows.ts. Nobody's push window is 3 AM.
 *  2. Day lean (personal)     — the user's active transits for the date
 *     (transiting Sun..Pluto aspecting their natal planets). These hold all
 *     day, so they tilt the day's character rather than its hours: a
 *     Mars-trine-Sun day keeps its Peak; a Saturn-square-Moon day softens
 *     Peak into "Steady".
 *  3. Moon hits (personal, timed) — the transiting Moon crosses aspects to
 *     the user's natal planets at specific clock times (~2–4 per day). Each
 *     hit carves a ~2h sub-window around exactness with its own energy.
 *
 * Everything is deterministic: fixed aspect→energy mapping tables, real
 * ephemeris math, and each personalized window carries a `reason` naming
 * the actual transit. Falls back to the plain solar frame when the user has
 * no natal chart / cached ephemeris.
 */

import type { AspectType, EnergyType, NatalChart, Planet, Transit } from '@/types/blueprint'
import { getMoonLongitude, msToJDE, birthLocalToUTC, normalizeDeg } from '@/lib/ephemeris/astronomia-adapter'
import { computeEnergyWindows, type EnergyWindow, type EnergyWindowsInput } from './energy-windows'
import { getSunTimes, localMinutesSinceDate } from './planetary-hours'

export interface TransitWindowsInput extends EnergyWindowsInput {
  natalChart: NatalChart | null
  /** The user's transits for this date from the ephemeris cache (daily resolution). */
  dayTransits: Transit[]
}

// ─── Shared formatting ─────────────────────────────────────────────────────

const ASPECT_GLYPH: Record<AspectType, string> = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '⚹',
}

function formatClock(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  const displayH = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? 'a' : 'p'
  return `${displayH}:${String(mm).padStart(2, '0')}${suffix}`
}

// ─── Day lean: whole-day transits tilt the day's character ────────────────

const HARMONIOUS_LEAN: Partial<Record<AspectType, number>> = { trine: 1, sextile: 0.6 }
const HARD_LEAN: Partial<Record<AspectType, number>> = { square: -1, opposition: -0.8 }
const HEAVY_PLANETS: Planet[] = ['Saturn', 'Pluto', 'Neptune']
const BRIGHT_PLANETS: Planet[] = ['Sun', 'Venus', 'Jupiter']

function transitContribution(t: Transit): number {
  let base: number
  if (t.aspect === 'conjunction') {
    if (BRIGHT_PLANETS.includes(t.planet)) base = 0.8
    else if (t.planet === 'Mars') base = 0.4
    else if (HEAVY_PLANETS.includes(t.planet)) base = -0.6
    else base = 0.2
  } else {
    base = HARMONIOUS_LEAN[t.aspect] ?? HARD_LEAN[t.aspect] ?? 0
  }
  // Tighter orb = stronger influence (6° is the widest orb we track).
  const orbWeight = Math.max(0.2, 1 - t.orb / 6)
  return base * orbWeight
}

interface DayLean {
  /** [-1, 1]: positive = supported/energized day, negative = heavy/frictional day. */
  score: number
  /** Tightest-orb transit of the day — the day's neutral headline. */
  headline: string | null
  /** Strongest supportive / heaviest contributor — used when the lean relabels a window. */
  topPositive: string | null
  topNegative: string | null
}

function formatTransit(t: Transit): string {
  return `${t.planet} ${ASPECT_GLYPH[t.aspect]} natal ${t.natalPlanet}`
}

function computeDayLean(dayTransits: Transit[]): DayLean {
  // The Moon's own transits are handled as timed hits, not day character.
  const slow = dayTransits.filter((t) => t.planet !== 'Moon')
  if (slow.length === 0) return { score: 0, headline: null, topPositive: null, topNegative: null }

  // A day with ~30 wide-orb transits always sums to ~zero — real skies are
  // mixed. Read the day the way an astrologer would: by its strongest few
  // contacts, and headline the single most exact one.
  const scored = slow
    .map((t) => ({ t, c: transitContribution(t) }))
    .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
  const top = scored.slice(0, 3)
  const sum = top.reduce((acc, s) => acc + s.c, 0)
  const score = Math.max(-1, Math.min(1, sum / 2))

  const headlineTransit = [...slow].sort((a, b) => a.orb - b.orb)[0]
  const positives = scored.filter((s) => s.c > 0)
  const negatives = scored.filter((s) => s.c < 0)
  return {
    score,
    headline: headlineTransit ? formatTransit(headlineTransit) : null,
    topPositive: positives.length > 0 ? formatTransit(positives[0].t) : null,
    topNegative: negatives.length > 0 ? formatTransit(negatives[0].t) : null,
  }
}

// ─── Moon hits: timed lunar aspects to natal planets ───────────────────────

export interface MoonHit {
  /** Minutes since local midnight of the requested date. */
  minute: number
  natalPlanet: Planet
  aspect: AspectType
  energyType: EnergyType
  label: string
}

const ASPECT_TARGETS: { angle: number; aspect: AspectType }[] = [
  { angle: 0, aspect: 'conjunction' },
  { angle: 60, aspect: 'sextile' },
  { angle: 90, aspect: 'square' },
  { angle: 120, aspect: 'trine' },
  { angle: 180, aspect: 'opposition' },
  { angle: 240, aspect: 'trine' },
  { angle: 270, aspect: 'square' },
  { angle: 300, aspect: 'sextile' },
]

const NATAL_PLANET_KEYS: { key: keyof NatalChart; planet: Planet }[] = [
  { key: 'sun', planet: 'Sun' },
  { key: 'moon', planet: 'Moon' },
  { key: 'mercury', planet: 'Mercury' },
  { key: 'venus', planet: 'Venus' },
  { key: 'mars', planet: 'Mars' },
  { key: 'jupiter', planet: 'Jupiter' },
  { key: 'saturn', planet: 'Saturn' },
  { key: 'uranus', planet: 'Uranus' },
  { key: 'neptune', planet: 'Neptune' },
  { key: 'pluto', planet: 'Pluto' },
]

function moonHitEnergy(aspect: AspectType, natalPlanet: Planet): { energyType: EnergyType; label: string } {
  const harmonious = aspect === 'trine' || aspect === 'sextile'
  const hard = aspect === 'square' || aspect === 'opposition'
  if (harmonious) {
    if ((['Sun', 'Mars', 'Jupiter', 'Saturn'] as Planet[]).includes(natalPlanet)) {
      return { energyType: 'push', label: 'Lift' }
    }
    if ((['Uranus', 'Neptune', 'Pluto'] as Planet[]).includes(natalPlanet)) {
      return { energyType: 'initiate', label: 'Spark' }
    }
    return { energyType: 'reflect', label: 'Ease' } // Mercury, Venus, Moon
  }
  if (hard) {
    if (HEAVY_PLANETS.includes(natalPlanet)) return { energyType: 'rest', label: 'Soften' }
    return { energyType: 'reflect', label: 'Soften' }
  }
  // Conjunction: the Moon joins the natal planet's own nature.
  if ((['Sun', 'Mars', 'Jupiter'] as Planet[]).includes(natalPlanet)) return { energyType: 'push', label: 'Lift' }
  if ((['Mercury', 'Venus'] as Planet[]).includes(natalPlanet)) return { energyType: 'reflect', label: 'Ease' }
  if (natalPlanet === 'Moon') return { energyType: 'rest', label: 'Soften' } // monthly lunar return — inward
  return { energyType: 'reflect', label: 'Soften' }
}

/**
 * Exact local times when the transiting Moon perfects an aspect to any natal
 * planet during the civil day. Hourly sampling + bisection: the Moon's
 * elongation from a fixed natal point increases monotonically (~0.55°/hour),
 * so each aspect angle is crossed at most once per day, cleanly.
 */
export function computeMoonHits(date: string, timeZone: string, natal: NatalChart): MoonHit[] {
  const dayStart = birthLocalToUTC(date, '00:00', timeZone).getTime()
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const dayEnd = birthLocalToUTC(next.toISOString().slice(0, 10), '00:00', timeZone).getTime()

  const SAMPLES = 24
  const stepMs = (dayEnd - dayStart) / SAMPLES
  const moonLon: number[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    moonLon.push(getMoonLongitude(msToJDE(dayStart + i * stepMs)))
  }

  const hits: MoonHit[] = []
  for (const { key, planet } of NATAL_PLANET_KEYS) {
    const pos = natal[key] as { longitude?: number } | undefined
    if (pos?.longitude === undefined) continue
    const natalLon = pos.longitude

    for (let i = 0; i < SAMPLES; i++) {
      const a = normalizeDeg(moonLon[i] - natalLon)
      let b = normalizeDeg(moonLon[i + 1] - natalLon)
      if (b < a) b += 360 // unwrap across 360→0

      for (const target of ASPECT_TARGETS) {
        for (const T of [target.angle, target.angle + 360]) {
          if (a < T && T <= b) {
            // Bisect between sample i and i+1 down to ~15 seconds.
            let lo = dayStart + i * stepMs
            let hi = dayStart + (i + 1) * stepMs
            for (let iter = 0; iter < 14; iter++) {
              const mid = (lo + hi) / 2
              let u = normalizeDeg(getMoonLongitude(msToJDE(mid)) - natalLon)
              if (u < a - 1) u += 360
              if (u < T) lo = mid
              else hi = mid
            }
            const minute = Math.max(0, Math.min(1439, Math.round(((lo + hi) / 2 - dayStart) / 60_000)))
            const { energyType, label } = moonHitEnergy(target.aspect, planet)
            hits.push({ minute, natalPlanet: planet, aspect: target.aspect, energyType, label })
          }
        }
      }
    }
  }

  hits.sort((x, y) => x.minute - y.minute)
  return hits
}

// ─── Assembly: frame + lean + hits → coherent windows ─────────────────────

const LEAN_THRESHOLD = 0.35
const HIT_HALF_SPAN = 60 // minutes each side of exactness
const MIN_WINDOW = 40 // absorb slivers shorter than this

interface Segment extends EnergyWindow {
  fromHit: boolean
}

export function computeTransitWindows(input: TransitWindowsInput): EnergyWindow[] {
  const base = computeEnergyWindows(input)
  if (base.length === 0) return base

  const { natalChart, dayTransits, date, lat, lng, timeZone } = input

  // 1. Day lean tilts the base frame's character. The headline transit (most
  //    exact contact of the day) always shows on Peak, so every day reads as
  //    that person's day even when the sky is mixed.
  const lean = computeDayLean(dayTransits)
  const leaned: EnergyWindow[] = base.map((w) => {
    if (w.label !== 'Peak' || !lean.headline) return { ...w }
    if (lean.score >= LEAN_THRESHOLD && lean.topPositive) {
      return { ...w, reason: `carried by ${lean.topPositive}` }
    }
    if (lean.score <= -LEAN_THRESHOLD && lean.topNegative) {
      return { ...w, energyType: 'reflect', label: 'Steady', reason: `${lean.topNegative} — gentler pace` }
    }
    return { ...w, reason: `${lean.headline} today` }
  })

  if (!natalChart) return leaned

  // 2. Moon hits carve timed sub-windows during waking hours — sunrise
  //    through 10 PM. An evening hit (Moon ⚹ natal Venus at 9 PM) is real
  //    life; pre-dawn hits stay under the night's Rest.
  const { sunrise, sunset } = getSunTimes(date, lat, lng)
  if (!sunrise || !sunset) return leaned
  const rise = localMinutesSinceDate(sunrise, date, timeZone)
  const wakingEnd = Math.max(localMinutesSinceDate(sunset, date, timeZone), 22 * 60)

  const hits = computeMoonHits(date, timeZone, natalChart).filter((h) => h.minute >= rise && h.minute <= wakingEnd)
  if (hits.length === 0) return leaned

  // Hit spans, overlaps split at the midpoint between exactness times.
  const spans = hits.map((h) => ({
    start: Math.max(rise, h.minute - HIT_HALF_SPAN),
    end: Math.min(wakingEnd, h.minute + HIT_HALF_SPAN),
    hit: h,
  }))
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) {
      const mid = Math.round((spans[i - 1].hit.minute + spans[i].hit.minute) / 2)
      spans[i - 1].end = mid
      spans[i].start = mid
    }
  }

  // Flatten base + spans into segments at every boundary.
  const boundaries = new Set<number>()
  for (const w of leaned) {
    boundaries.add(w.startMinute)
    boundaries.add(w.endMinute)
  }
  for (const s of spans) {
    boundaries.add(s.start)
    boundaries.add(s.end)
  }
  const sorted = [...boundaries].sort((a, b) => a - b)

  const segments: Segment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (end <= start) continue
    const mid = (start + end) / 2
    const span = spans.find((s) => s.start <= mid && mid < s.end)
    if (span) {
      const h = span.hit
      segments.push({
        startMinute: start,
        endMinute: end,
        energyType: h.energyType,
        label: h.label,
        reason: `Moon ${ASPECT_GLYPH[h.aspect]} natal ${h.natalPlanet} · ${formatClock(h.minute)}`,
        fromHit: true,
      })
    } else {
      const bw = leaned.find((w) => w.startMinute <= mid && mid < w.endMinute)
      if (bw) segments.push({ ...bw, startMinute: start, endMinute: end, fromHit: false })
    }
  }

  // Merge same-energy/same-label neighbors, then absorb slivers.
  const merged: Segment[] = []
  for (const seg of segments) {
    const prev = merged[merged.length - 1]
    if (prev && prev.energyType === seg.energyType && prev.label === seg.label && prev.reason === seg.reason) {
      prev.endMinute = seg.endMinute
    } else {
      merged.push({ ...seg })
    }
  }
  const result: Segment[] = []
  for (const seg of merged) {
    const len = seg.endMinute - seg.startMinute
    const prev = result[result.length - 1]
    if (len < MIN_WINDOW && prev && !seg.fromHit) {
      prev.endMinute = seg.endMinute // absorb short base slivers between hits
    } else {
      result.push(seg)
    }
  }

  return result.map(({ fromHit: _fromHit, ...w }) => w)
}
