import type { MoonDayNudgePhase } from '@/lib/today/moon-day-nudge-copy'
import { MOON_DAY_NUDGE_COPY } from '@/lib/today/moon-day-nudge-copy'

/** Existing ritual entry route: journal composer with ritual mode pre-enabled. */
export function moonDayRitualEntryHref(phase: MoonDayNudgePhase): string {
  const prompt = MOON_DAY_NUDGE_COPY[phase].headline
  const params = new URLSearchParams({ ritual: '1', prompt })
  return `/journal?${params.toString()}`
}
