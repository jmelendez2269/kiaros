/**
 * IA feature flags that affect the post-onboarding tour (no server-only imports).
 */

import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'
import { iaGoalsFlagEnabled } from '@/lib/goals-study/ia-goals-routes'
import { iaJournalFlagEnabled } from '@/lib/journal/ia-journal-routes'

export type IaTourFlags = {
  /** KIAROS_CALENDAR_DAY (server env; pass from layout). */
  calendarDay: boolean
  /** NEXT_PUBLIC_IA_JOURNAL */
  journal: boolean
  /** NEXT_PUBLIC_IA_GOALS */
  goals: boolean
  /** NEXT_PUBLIC_IA_OVERLAYS */
  overlays: boolean
}

export function iaTourFlagsFromEnv(env: {
  KIAROS_CALENDAR_DAY?: string
  NEXT_PUBLIC_IA_JOURNAL?: string
  NEXT_PUBLIC_IA_GOALS?: string
  NEXT_PUBLIC_IA_OVERLAYS?: string
}): IaTourFlags {
  return {
    calendarDay: featureFlagEnabled(env.KIAROS_CALENDAR_DAY),
    journal: iaJournalFlagEnabled(env.NEXT_PUBLIC_IA_JOURNAL),
    goals: iaGoalsFlagEnabled(env.NEXT_PUBLIC_IA_GOALS),
    overlays: featureFlagEnabled(env.NEXT_PUBLIC_IA_OVERLAYS),
  }
}

export function iaTourFlagsFromProcessEnv(): IaTourFlags {
  return iaTourFlagsFromEnv({
    KIAROS_CALENDAR_DAY: process.env.KIAROS_CALENDAR_DAY,
    NEXT_PUBLIC_IA_JOURNAL: process.env.NEXT_PUBLIC_IA_JOURNAL,
    NEXT_PUBLIC_IA_GOALS: process.env.NEXT_PUBLIC_IA_GOALS,
    NEXT_PUBLIC_IA_OVERLAYS: process.env.NEXT_PUBLIC_IA_OVERLAYS,
  })
}

/** Client-safe flags (calendar day must be passed from the server). */
export function iaTourFlagsFromClientEnv(
  calendarDay: boolean,
  env: {
    NEXT_PUBLIC_IA_JOURNAL?: string
    NEXT_PUBLIC_IA_GOALS?: string
    NEXT_PUBLIC_IA_OVERLAYS?: string
  },
): IaTourFlags {
  return {
    calendarDay,
    journal: iaJournalFlagEnabled(env.NEXT_PUBLIC_IA_JOURNAL),
    goals: iaGoalsFlagEnabled(env.NEXT_PUBLIC_IA_GOALS),
    overlays: featureFlagEnabled(env.NEXT_PUBLIC_IA_OVERLAYS),
  }
}

export function isIaTourActive(flags: IaTourFlags): boolean {
  return flags.calendarDay || flags.journal || flags.goals || flags.overlays
}
