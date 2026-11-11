/**
 * Rhythms in the daily check-ins: how energy and mood have sat under each
 * moon phase, compared with the member's own usual. Pure, so it is
 * unit-testable. These are observations from a small record, and the
 * thresholds below keep a coincidence from being called a rhythm.
 */
import { energyLabel } from '../today/check-in-options'

export interface CheckInRow {
  log_date: string
  energy_level: number | null
  mood_tag: string | null
  lunar_phase: string | null
}

export interface PhaseRhythm {
  /** e.g. "Full" */
  phase: string
  checkIns: number
  /** 'lower' or 'higher' than the member's usual energy; null when it sits about the same or is unknown. */
  energy: 'lower' | 'higher' | null
  /** The nearest energy word for this phase's average, e.g. "Low". */
  energyWord: string | null
  /** A mood chosen under this phase at least twice, and more than any other. */
  mood: string | null
}

export interface CheckInRhythms {
  total: number
  /** The nearest energy word for the member's overall average. */
  usualEnergyWord: string | null
  /** Phases with something to say, most checked-in first. */
  phases: PhaseRhythm[]
  /** Check-ins still needed before anything is shown; 0 once there are enough. */
  toGo: number
}

/** Nothing is read from fewer check-ins than this in total. */
export const MIN_CHECK_INS = 8
/** A phase needs this many check-ins before it is described. */
export const MIN_PER_PHASE = 4
/** How far a phase's average energy must sit from the usual (on the 1 to 5 scale) to be called lower or higher. */
const ENERGY_GAP = 0.6

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

function topMood(moods: string[]): string | null {
  const counts = new Map<string, number>()
  for (const mood of moods) counts.set(mood, (counts.get(mood) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  if (!ranked.length || ranked[0][1] < 2) return null
  // A tie for first is not a rhythm.
  return ranked[1] && ranked[1][1] === ranked[0][1] ? null : ranked[0][0]
}

export function checkInRhythms(rows: CheckInRow[]): CheckInRhythms {
  const recorded = rows.filter((row) => row.energy_level !== null || row.mood_tag)
  const total = recorded.length
  if (total < MIN_CHECK_INS) return { total, usualEnergyWord: null, phases: [], toGo: MIN_CHECK_INS - total }

  const energies = recorded.flatMap((row) => (row.energy_level === null ? [] : [row.energy_level]))
  const usual = energies.length ? average(energies) : null

  const byPhase = new Map<string, CheckInRow[]>()
  for (const row of recorded) {
    if (!row.lunar_phase) continue
    byPhase.set(row.lunar_phase, [...(byPhase.get(row.lunar_phase) ?? []), row])
  }

  const phases: PhaseRhythm[] = []
  for (const [phase, list] of byPhase) {
    if (list.length < MIN_PER_PHASE) continue
    const phaseEnergies = list.flatMap((row) => (row.energy_level === null ? [] : [row.energy_level]))
    const mean = phaseEnergies.length >= MIN_PER_PHASE ? average(phaseEnergies) : null
    const energy = mean === null || usual === null ? null : mean <= usual - ENERGY_GAP ? 'lower' : mean >= usual + ENERGY_GAP ? 'higher' : null
    const mood = topMood(list.flatMap((row) => (row.mood_tag ? [row.mood_tag] : [])))
    if (!energy && !mood) continue
    phases.push({ phase, checkIns: list.length, energy, energyWord: mean === null ? null : energyLabel(Math.round(mean)), mood })
  }
  phases.sort((a, b) => b.checkIns - a.checkIns || a.phase.localeCompare(b.phase))

  return { total, usualEnergyWord: usual === null ? null : energyLabel(Math.round(usual)), phases, toGo: 0 }
}

/** One plain sentence for a phase, e.g. "Energy has sat lower, around Low, and tender came up most." */
export function describePhaseRhythm(rhythm: PhaseRhythm): string {
  const energy = rhythm.energy
    ? `Energy has sat ${rhythm.energy}${rhythm.energyWord ? `, around ${rhythm.energyWord}` : ''}`
    : null
  const mood = rhythm.mood ? `${energy ? 'and ' : ''}${rhythm.mood} came up most` : null
  const text = [energy, mood].filter(Boolean).join(', ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

/**
 * One line for Today's check-in card, about the moon phase overhead:
 * "Under the Full Moon, your energy has usually sat lower, around Low, and
 * tired has come up most." null when that phase has nothing to say yet.
 */
export function rhythmLineForPhase(rhythms: CheckInRhythms, phase: string | null | undefined): string | null {
  const rhythm = phase ? rhythms.phases.find((p) => p.phase === phase) : undefined
  if (!rhythm) return null
  const energy = rhythm.energy
    ? `your energy has usually sat ${rhythm.energy}${rhythm.energyWord ? `, around ${rhythm.energyWord}` : ''}`
    : null
  const mood = rhythm.mood ? `${rhythm.mood} has come up most` : null
  const parts = [energy, mood].filter(Boolean)
  if (!parts.length) return null
  return `Under the ${rhythm.phase} Moon, ${parts.join(energy && mood ? ', and ' : '')}.`
}
