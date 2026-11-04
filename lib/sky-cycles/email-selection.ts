import { cycleStatus } from './status'
import type { SkyCycle, SkyCycleStatus } from './types'

export type SkyCycleEmailKind = 'heads_up' | 'look_back'

/** Look-back notes go out on days 1 to 3 after a cycle ends (a missed cron day still catches up). */
const LOOK_BACK_SEND_DAYS = 3
const MAX_ITEMS_PER_EMAIL = 4

export function sentKey(cycleId: string, kind: SkyCycleEmailKind): string {
  return `${cycleId}|${kind}`
}

const byPriority = (a: SkyCycleStatus, b: SkyCycleStatus) =>
  (a.cycle.scope === 'personal' ? 0 : 1) - (b.cycle.scope === 'personal' ? 0 : 1) || a.dayCount - b.dayCount

/**
 * What one member's email holds today: heads-ups for cycles inside their
 * heads-up window and look-back notes for cycles that just ended, minus
 * anything already sent. At most four items, personal first.
 */
export function selectSkyCycleEmailItems(
  cycles: SkyCycle[],
  today: string,
  alreadySent: ReadonlySet<string>,
): { headsUps: SkyCycleStatus[]; lookBacks: SkyCycleStatus[] } {
  const headsUps: SkyCycleStatus[] = []
  const lookBacks: SkyCycleStatus[] = []
  for (const cycle of cycles) {
    const status = cycleStatus(cycle, today)
    if (!status) continue
    if (status.phase === 'upcoming' && !alreadySent.has(sentKey(cycle.id, 'heads_up'))) {
      headsUps.push(status)
    } else if (
      status.phase === 'ended' &&
      status.dayCount >= 1 &&
      status.dayCount <= LOOK_BACK_SEND_DAYS &&
      !alreadySent.has(sentKey(cycle.id, 'look_back'))
    ) {
      lookBacks.push(status)
    }
  }
  headsUps.sort(byPriority)
  lookBacks.sort(byPriority)
  const keepHeadsUps = headsUps.slice(0, MAX_ITEMS_PER_EMAIL)
  const keepLookBacks = lookBacks.slice(0, MAX_ITEMS_PER_EMAIL - keepHeadsUps.length)
  return { headsUps: keepHeadsUps, lookBacks: keepLookBacks }
}
