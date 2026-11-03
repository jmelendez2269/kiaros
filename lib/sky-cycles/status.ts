import { daysBetween } from './detect'
import type { SkyCycle, SkyCycleStatus } from './types'

/** Days after a cycle ends that its look back stays on Today. */
export const LOOK_BACK_WINDOW_DAYS = 10

export function cycleStatus(cycle: SkyCycle, today: string): SkyCycleStatus | null {
  const totalDays = daysBetween(cycle.startDate, cycle.endDate) + 1
  if (today < cycle.startDate) {
    const until = daysBetween(today, cycle.startDate)
    return until <= cycle.headsUpDays ? { cycle, phase: 'upcoming', dayCount: until, totalDays } : null
  }
  if (today <= cycle.endDate) {
    return { cycle, phase: 'active', dayCount: daysBetween(cycle.startDate, today) + 1, totalDays }
  }
  const since = daysBetween(cycle.endDate, today)
  return since <= LOOK_BACK_WINDOW_DAYS ? { cycle, phase: 'ended', dayCount: since, totalDays } : null
}

const PHASE_ORDER = { ended: 0, upcoming: 1, active: 2 } as const
const SCOPE_ORDER = { personal: 0, collective: 1 } as const

/**
 * What Today shows: look backs first (they expire), then heads-ups, then
 * cycles under way. Personal before collective, nearest first.
 */
export function relevantCycles(cycles: SkyCycle[], today: string): SkyCycleStatus[] {
  return cycles
    .map((c) => cycleStatus(c, today))
    .filter((s): s is SkyCycleStatus => s !== null)
    .sort(
      (a, b) =>
        PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
        SCOPE_ORDER[a.cycle.scope] - SCOPE_ORDER[b.cycle.scope] ||
        a.dayCount - b.dayCount,
    )
}

const LONG_CYCLE_DAYS = 45
const NEAR_DAYS = 7

/**
 * Long collective cycles (outer retrogrades, seasons) would fill Today for
 * months. Show them only near their edges or an exact hit.
 */
export function worthShowingToday(status: SkyCycleStatus, today: string): boolean {
  if (status.phase !== 'active' || status.totalDays <= LONG_CYCLE_DAYS) return true
  // Slow transits to the member's own chart are rare and personal: keep them visible.
  if (status.cycle.scope === 'personal') return true
  const { cycle } = status
  const near = (d: string) => Math.abs(daysBetween(d, today)) <= NEAR_DAYS
  return near(cycle.startDate) || near(cycle.endDate) || cycle.keyDates.some(near)
}

/** For lists (e.g. the Reviews page): a status for any cycle, regardless of windows. */
export function statusForListing(cycle: SkyCycle, today: string): SkyCycleStatus {
  const totalDays = daysBetween(cycle.startDate, cycle.endDate) + 1
  if (today < cycle.startDate) return { cycle, phase: 'upcoming', dayCount: daysBetween(today, cycle.startDate), totalDays }
  if (today <= cycle.endDate) return { cycle, phase: 'active', dayCount: daysBetween(cycle.startDate, today) + 1, totalDays }
  return { cycle, phase: 'ended', dayCount: daysBetween(cycle.endDate, today), totalDays }
}
