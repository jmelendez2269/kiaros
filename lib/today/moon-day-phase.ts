import { getMoonPhasesForYear } from '@/lib/ephemeris/astronomia-adapter'
import type { MoonPhaseEvent } from '@/types/blueprint'
import type { MoonDayNudgePhase } from '@/lib/today/moon-day-nudge-copy'

const NUDGE_PHASES: MoonDayNudgePhase[] = ['new', 'full']

/** YYYY-MM-DD in the given IANA timezone. */
export function localDateISO(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

export function phaseEventInstant(event: Pick<MoonPhaseEvent, 'date' | 'time'>): Date {
  return new Date(`${event.date}T${event.time}:00.000Z`)
}

export function moonDayDismissalKey(phase: MoonDayNudgePhase, localDateIso: string): string {
  return `${phase}:${localDateIso}`
}

/**
 * Returns new or full when `localDateIso` is the user's local calendar day of the exact phase.
 */
export function getMoonDayPhaseForLocalDate(
  localDateIso: string,
  timeZone: string,
): MoonDayNudgePhase | null {
  const year = Number.parseInt(localDateIso.slice(0, 4), 10)
  if (!Number.isFinite(year)) return null

  for (const y of [year - 1, year, year + 1]) {
    const events = getMoonPhasesForYear(y).filter((e) =>
      NUDGE_PHASES.includes(e.phase as MoonDayNudgePhase),
    )
    for (const event of events) {
      const local = localDateISO(phaseEventInstant(event), timeZone)
      if (local === localDateIso) {
        return event.phase as MoonDayNudgePhase
      }
    }
  }
  return null
}

export function parseDismissalMap(raw: unknown): Record<string, true> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, true> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === true) out[key] = true
  }
  return out
}

export function isMoonDayDismissed(
  dismissals: Record<string, true>,
  phase: MoonDayNudgePhase,
  localDateIso: string,
): boolean {
  return dismissals[moonDayDismissalKey(phase, localDateIso)] === true
}
