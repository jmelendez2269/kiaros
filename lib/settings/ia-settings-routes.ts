/**
 * Pure URL helpers for NEXT_PUBLIC_IA_SETTINGS (unit-tested; no server-only imports).
 */

import { calendarTabBlueprintHref, featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'
import { iaJournalFlagEnabled, journalTabWriteHref } from '@/lib/journal/ia-journal-routes'
import { goalsStudyCurriculumHref } from '@/lib/goals-study/ia-goals-routes'

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
