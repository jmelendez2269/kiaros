/**
 * The daily check-in on Today: one energy level and one mood word. Pure, so
 * the page, the server action and the tests share one definition.
 */

/** Energy runs 1 to 5, as the daily_logs table stores it. The words describe, they do not grade. */
export const ENERGY_LEVELS = [
  { value: 1, label: 'Resting' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Even' },
  { value: 4, label: 'Lifted' },
  { value: 5, label: 'Full' },
] as const

export const CHECK_IN_MOODS = ['steady', 'tender', 'restless', 'heavy', 'foggy', 'open', 'bright', 'tired'] as const

export type CheckInMood = (typeof CHECK_IN_MOODS)[number]

export interface CheckIn {
  energy: number | null
  mood: CheckInMood | null
}

export const EMPTY_CHECK_IN: CheckIn = { energy: null, mood: null }

export function energyLabel(value: number | null): string | null {
  return ENERGY_LEVELS.find((level) => level.value === value)?.label ?? null
}

/** Accepts only a whole energy level from 1 to 5 and a mood from the list. Anything else is refused, not coerced. */
export function parseCheckIn(input: { energy?: unknown; mood?: unknown }): CheckIn | null {
  const { energy, mood } = input
  const energyOk = energy === null || energy === undefined || (typeof energy === 'number' && Number.isInteger(energy) && energy >= 1 && energy <= 5)
  const moodOk = mood === null || mood === undefined || (typeof mood === 'string' && (CHECK_IN_MOODS as readonly string[]).includes(mood))
  if (!energyOk || !moodOk) return null
  return { energy: (energy as number | null | undefined) ?? null, mood: (mood as CheckInMood | null | undefined) ?? null }
}

/** A saved mood outside the current list (from an older version) is shown as not chosen. */
export function checkInFromRow(row: { energy_level: number | null; mood_tag: string | null } | null | undefined): CheckIn {
  if (!row) return EMPTY_CHECK_IN
  return parseCheckIn({ energy: row.energy_level, mood: row.mood_tag }) ?? {
    energy: parseCheckIn({ energy: row.energy_level })?.energy ?? null,
    mood: null,
  }
}

/** What the card says once something is saved, e.g. "Even · tender". */
export function checkInSummary(checkIn: CheckIn): string | null {
  const parts = [energyLabel(checkIn.energy), checkIn.mood].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
