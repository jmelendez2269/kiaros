/**
 * Pure URL helpers for NEXT_PUBLIC_IA_GOALS (unit-tested; no server-only imports).
 * Sidebar-only IA: routes stay on /areas and /curriculum when the flag is on.
 */

import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

export type GoalsStudySubKey = 'life-areas' | 'curriculum'

export function iaGoalsFlagEnabled(value: string | undefined): boolean {
  return featureFlagEnabled(value)
}

export function goalsStudyLifeAreasHref(): string {
  return '/areas'
}

export function goalsStudyCurriculumHref(): string {
  return '/curriculum'
}

export function goalsStudyNavHref(): string {
  return goalsStudyLifeAreasHref()
}

/** Which Goals and study sub-section is active for a pathname (paths unchanged under IA). */
export function resolveGoalsStudySubKey(pathname: string): GoalsStudySubKey | null {
  if (pathname.startsWith('/curriculum')) return 'curriculum'
  if (pathname === '/areas' || pathname.startsWith('/areas/')) return 'life-areas'
  return null
}

export function isGoalsStudyPath(pathname: string): boolean {
  return resolveGoalsStudySubKey(pathname) !== null
}
