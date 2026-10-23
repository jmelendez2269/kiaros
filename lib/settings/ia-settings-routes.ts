/**
 * Pure URL helpers for NEXT_PUBLIC_IA_SETTINGS (unit-tested; no server-only imports).
 */

import { calendarTabBlueprintHref, featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'
import { iaJournalFlagEnabled, journalTabWriteHref } from '@/lib/journal/ia-journal-routes'
import { goalsStudyCurriculumHref } from '@/lib/goals-study/ia-goals-routes'

/** Top offset when scrolling to in-page settings anchors (spec: 24px). */
export const SETTINGS_IA_SCROLL_OFFSET_PX = 24

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

export type SettingsIaSectionIntersect = {
  id: SettingsIaGroupId
  top: number
  ratio: number
}

/** Pick the nav-highlighted section from IntersectionObserver samples. */
export function pickSettingsIaActiveSection(params: {
  intersecting: SettingsIaSectionIntersect[]
  nearPageBottom: boolean
}): SettingsIaGroupId | null {
  const { intersecting, nearPageBottom } = params
  if (intersecting.length === 0) return null

  const order = SETTINGS_IA_GROUPS.map((g) => g.id)

  if (nearPageBottom) {
    for (let i = order.length - 1; i >= 0; i--) {
      if (intersecting.some((e) => e.id === order[i])) return order[i]
    }
  }

  const anchorLine = SETTINGS_IA_SCROLL_OFFSET_PX
  let best: SettingsIaSectionIntersect | null = null
  for (const entry of intersecting) {
    if (entry.top <= anchorLine + 8 && (!best || entry.top > best.top)) {
      best = entry
    }
  }
  if (best) return best.id

  const sorted = [...intersecting].sort((a, b) => a.top - b.top)
  return sorted[0]?.id ?? null
}

export function isSettingsIaNearPageBottom(thresholdPx = 64): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - thresholdPx
  )
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
