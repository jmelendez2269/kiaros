/**
 * Which data-tour targets exist in the sidebar for a given IA flag set.
 * Keep in sync with AlmanacSidebar navForAccess and NavRow sub-links.
 */

import {
  NAV_CURRICULUM_TOUR_TARGET,
  primaryNavTourTarget,
  type AlmanacNavKey,
} from '@/lib/almanac/nav-tour-target'
import type { IaTourFlags } from '@/lib/tour/ia-tour-flags'

const BASE_NAV_KEYS: AlmanacNavKey[] = [
  'today',
  'week',
  'month',
  'year',
  'self',
  'journal',
  'stelloquy',
]

function navKeysForFlags(flags: IaTourFlags): AlmanacNavKey[] {
  let keys = [...BASE_NAV_KEYS]
  if (flags.goals) {
    const stelloquyIndex = keys.indexOf('stelloquy')
    keys = [...keys.slice(0, stelloquyIndex), 'goalsStudy', ...keys.slice(stelloquyIndex)]
  }
  return keys
}

/** Curriculum sub-link is present when Goals IA is on or Self still lists Curriculum. */
function hasCurriculumSubNav(flags: IaTourFlags): boolean {
  return true
}

/**
 * Tour targets rendered in the sidebar for the given flags.
 * hasOracleAccess only affects Patterns sub-link (no data-tour), not tour targets.
 */
export function collectSidebarTourTargets(
  flags: IaTourFlags,
  _hasOracleAccess = true,
): string[] {
  const keys = navKeysForFlags(flags)
  const targets = keys.map((key) =>
    primaryNavTourTarget(key, flags.calendarDay),
  )
  if (hasCurriculumSubNav(flags)) {
    targets.push(NAV_CURRICULUM_TOUR_TARGET)
  }
  return targets
}
