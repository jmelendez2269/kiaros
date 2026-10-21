import { parseDismissalMap } from '@/lib/today/moon-day-phase'

export const MOON_DAY_NUDGE_DISMISSALS_KEY = 'kiaros-moon-day-nudge-dismissals'
export const MOON_DAY_REMINDERS_ENABLED_KEY = 'kiaros-moon-day-reminders-enabled'

export function readMoonDayDismissals(): Record<string, true> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MOON_DAY_NUDGE_DISMISSALS_KEY)
    if (!raw) return {}
    return parseDismissalMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function writeMoonDayDismissal(key: string): void {
  if (typeof window === 'undefined') return
  const current = readMoonDayDismissals()
  current[key] = true
  window.localStorage.setItem(MOON_DAY_NUDGE_DISMISSALS_KEY, JSON.stringify(current))
}

/** Default on when unset. */
export function readMoonDayRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(MOON_DAY_REMINDERS_ENABLED_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

export function writeMoonDayRemindersEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOON_DAY_REMINDERS_ENABLED_KEY, enabled ? 'true' : 'false')
}
