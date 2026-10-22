import { MOON_DAY_NUDGE_COPY } from '@/lib/today/moon-day-nudge-copy'
import { getMoonDayPhaseForLocalDate, localDateISO } from '@/lib/today/moon-day-phase'

/**
 * When /journal?ritual=1 has no ?prompt=, prefill the same headline the moon nudge
 * uses (see moonDayRitualEntryHref). Returns '' if not a new/full moon local day.
 */
export function resolveMoonRitualPromptForJournal(
  ritualParam: boolean,
  timeZone: string,
  localDateIso?: string,
  now: Date = new Date(),
): string {
  if (!ritualParam) return ''
  const local = localDateIso ?? localDateISO(now, timeZone)
  const phase = getMoonDayPhaseForLocalDate(local, timeZone)
  if (!phase) return ''
  return MOON_DAY_NUDGE_COPY[phase].headline
}
