/**
 * Pure URL helpers for NEXT_PUBLIC_IA_SETTINGS (unit-tested; no server-only imports).
 */

import { calendarTabBlueprintHref, featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'
import { iaJournalFlagEnabled, journalTabWriteHref } from '@/lib/journal/ia-journal-routes'
import { goalsStudyCurriculumHref } from '@/lib/goals-study/ia-goals-routes'

/** Top offset when scrolling to in-page settings anchors (spec: 24px). */
export const SETTINGS_IA_SCROLL_OFFSET_PX = 24

/**
 * Tailwind class: sticky save bar sits above the Stelloquy dock on narrow viewports (~390px).
 */
export const SETTINGS_IA_STICKY_BAR_MOBILE_BOTTOM_CLASS = 'max-md:bottom-[5rem]'

export const SETTINGS_IA_GROUPS = [
  { id: 'birth-data', label: 'Birth details' },
  { id: 'chart', label: 'Chart' },
  { id: 'year', label: 'Your year' },
  { id: 'look', label: 'Look and voice' },
  { id: 'journal', label: 'Journal and reminders' },
  { id: 'plan', label: 'Plan and usage' },
  { id: 'shortcuts', label: 'Shortcuts' },
] as const

export type SettingsIaGroupId = (typeof SETTINGS_IA_GROUPS)[number]['id']

export function iaSettingsFlagEnabled(value: string | undefined): boolean {
  return featureFlagEnabled(value)
}

export function settingsBirthDataHref(iaSettingsEnabled: boolean): string {
  return iaSettingsEnabled ? '/settings#birth-data' : '/settings'
}

export function settingsMoonReminderHref(iaSettingsEnabled: boolean): string {
  return iaSettingsEnabled ? '/settings#moon-reminder' : '/settings'
}

/** Placeholder label until Stella finalizes copy (moon-day nudge → settings). */
export const MOON_DAY_NUDGE_REMINDER_SETTINGS_LABEL = 'Reminder settings'

export function scrollSettingsAnchorIntoView(
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): void {
  const top =
    element.getBoundingClientRect().top + window.scrollY - SETTINGS_IA_SCROLL_OFFSET_PX
  window.scrollTo({ top: Math.max(0, top), behavior })
}

export function settingsShortcutBlueprintHref(): string {
  return calendarTabBlueprintHref()
}

export function settingsShortcutJournalHref(iaJournalEnabled: boolean): string {
  return iaJournalEnabled ? journalTabWriteHref() : '/journal'
}

export function settingsShortcutCurriculumHref(): string {
  return goalsStudyCurriculumHref()
}

export function resolveSettingsIaFlagsFromEnv(): {
  iaSettings: boolean
  iaJournal: boolean
} {
  return {
    iaSettings: iaSettingsFlagEnabled(process.env.NEXT_PUBLIC_IA_SETTINGS),
    iaJournal: iaJournalFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL),
  }
}
