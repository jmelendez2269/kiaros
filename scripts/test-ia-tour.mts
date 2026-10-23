/**
 * IA Phase 7 — tour steps vs sidebar data-tour targets for every flag combination.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildTourSteps,
  LEGACY_TOUR_STEPS,
  STELLOQUY_TOUR_STEP,
} from '../lib/tour/build-tour-steps.ts'
import type { IaTourFlags } from '../lib/tour/ia-tour-flags.ts'
import { isIaTourActive } from '../lib/tour/ia-tour-flags.ts'
import { collectSidebarTourTargets } from '../lib/tour/sidebar-tour-targets.ts'
import { primaryNavTourTarget } from '../lib/almanac/nav-tour-target.ts'
import {
  isMobileNavViewport,
  isTourTargetVisibleFromMetrics,
  TOUR_MOBILE_NAV_MAX_WIDTH_PX,
} from '../lib/tour/tour-target-element.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const STELLA_CALENDAR_BODY =
  'Day, week, month and year in one place. Plan your time blocks with the sky alongside, and follow your blueprint week by week.'
const STELLA_JOURNAL_IA_BODY =
  "Write on the Write tab and find past entries under Entries. Open Patterns when you're curious about themes in your own words. Each entry keeps the transits from the moment you wrote it."
const STELLA_GOALS_BODY =
  "Life areas hold your goals alongside your chart. Curriculum holds your study plans, and sessions show up on Today when it's time to learn."
const STELLA_STELLOQUY_BODY =
  'A tab for your ongoing conversation with the stars. The floating star opens the same thread from any page.'

console.log('=== IA tour (Phase 7) tests ===\n')

function flagCombos(): IaTourFlags[] {
  const combos: IaTourFlags[] = []
  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      for (let c = 0; c < 2; c++) {
        for (let d = 0; d < 2; d++) {
          combos.push({
            calendarDay: a === 1,
            journal: b === 1,
            goals: c === 1,
            overlays: d === 1,
          })
        }
      }
    }
  }
  return combos
}

console.log('All flags off matches legacy steps')
const off: IaTourFlags = {
  calendarDay: false,
  journal: false,
  goals: false,
  overlays: false,
}
assert.equal(isIaTourActive(off), false)
assert.deepEqual(buildTourSteps(off), LEGACY_TOUR_STEPS)
console.log('✓ Legacy parity\n')

console.log('Stella final IA bodies (verbatim)')
const allOn: IaTourFlags = {
  calendarDay: true,
  journal: true,
  goals: true,
  overlays: true,
}
const full = buildTourSteps(allOn)
assert.equal(full.find((s) => s.id === 'calendar')?.body, STELLA_CALENDAR_BODY)
assert.equal(full.find((s) => s.id === 'journal')?.body, STELLA_JOURNAL_IA_BODY)
assert.equal(full.find((s) => s.id === 'goals-study')?.body, STELLA_GOALS_BODY)
assert.equal(STELLOQUY_TOUR_STEP.body, STELLA_STELLOQUY_BODY)
console.log('✓ Stella copy\n')

console.log('Every step target exists in sidebar for each flag combination')
for (const flags of flagCombos()) {
  const steps = buildTourSteps(flags)
  const targets = new Set(collectSidebarTourTargets(flags))
  for (const step of steps) {
    assert.ok(
      targets.has(step.tourTarget),
      `Missing [data-tour="${step.tourTarget}"] for flags ${JSON.stringify(flags)} (step ${step.id})`,
    )
  }
}
console.log('✓ Target coverage (16 combinations)\n')

console.log('Full IA tour shape (all flags on)')
assert.equal(full.length, 5)
assert.deepEqual(
  full.map((s) => s.id),
  ['today', 'calendar', 'journal', 'goals-study', 'stelloquy'],
)
assert.equal(full[1].tourTarget, 'nav-calendar')
assert.equal(full[1].tourTarget, primaryNavTourTarget('week', true))
console.log('✓ Full IA step ids\n')

console.log('IA tour copy guardrails (no ampersands or em dashes)')
const iaCopy: string[] = [
  STELLA_CALENDAR_BODY,
  STELLA_JOURNAL_IA_BODY,
  STELLA_GOALS_BODY,
  STELLA_STELLOQUY_BODY,
]
for (const text of iaCopy) {
  assert.ok(!text.includes('&'), `Ampersand in tour copy: ${text}`)
  assert.ok(!text.includes('—'), `Em dash in tour copy: ${text}`)
}
console.log('✓ Copy guardrails\n')

console.log('Mobile nav viewport and hidden-target visibility')
assert.equal(isMobileNavViewport(390), true)
assert.equal(isMobileNavViewport(TOUR_MOBILE_NAV_MAX_WIDTH_PX), true)
assert.equal(isMobileNavViewport(768), false)
assert.equal(
  isTourTargetVisibleFromMetrics({
    width: 0,
    height: 0,
    display: 'flex',
    visibility: 'visible',
  }),
  false,
)
assert.equal(
  isTourTargetVisibleFromMetrics({
    width: 120,
    height: 40,
    display: 'none',
    visibility: 'visible',
  }),
  false,
)
assert.equal(
  isTourTargetVisibleFromMetrics({
    width: 120,
    height: 40,
    display: 'flex',
    visibility: 'visible',
  }),
  true,
)
console.log('✓ Mobile visibility helpers\n')

console.log('Tour opens mobile drawer when target is in closed drawer')
const tourSource = readFileSync(join(root, 'components/tour/TourOverlay.tsx'), 'utf8')
assert.ok(tourSource.includes('findTourTargetElement'))
assert.ok(tourSource.includes('TOUR_OPEN_MOBILE_NAV_EVENT'))
assert.ok(tourSource.includes('isMobileNavViewport'))
const sidebarSource = readFileSync(join(root, 'components/almanac/AlmanacSidebar.tsx'), 'utf8')
assert.ok(sidebarSource.includes('TOUR_OPEN_MOBILE_NAV_EVENT'))
assert.ok(sidebarSource.includes('setMobileOpen(true)'))
console.log('✓ Mobile drawer wiring\n')

console.log('Layout passes buildTourSteps to TourOverlay')
const layoutSource = readFileSync(join(root, 'app/(app)/layout.tsx'), 'utf8')
assert.ok(layoutSource.includes('buildTourSteps'))
assert.ok(layoutSource.includes('iaTourFlagsFromProcessEnv'))
assert.ok(layoutSource.includes('<TourOverlay steps={tourSteps}'))
console.log('✓ Layout wiring\n')

console.log('Sidebar uses primaryNavTourTarget for calendar')
assert.ok(sidebarSource.includes('primaryNavTourTarget'))
console.log('✓ Sidebar data-tour helper\n')

console.log('All IA tour tests passed.')
