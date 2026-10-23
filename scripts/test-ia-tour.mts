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
  STELLOQUY_TOUR_PLACEHOLDER,
} from '../lib/tour/build-tour-steps.ts'
import type { IaTourFlags } from '../lib/tour/ia-tour-flags.ts'
import { isIaTourActive } from '../lib/tour/ia-tour-flags.ts'
import { collectSidebarTourTargets } from '../lib/tour/sidebar-tour-targets.ts'
import { primaryNavTourTarget } from '../lib/almanac/nav-tour-target.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

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
const allOn: IaTourFlags = {
  calendarDay: true,
  journal: true,
  goals: true,
  overlays: true,
}
const full = buildTourSteps(allOn)
assert.equal(full.length, 5)
assert.deepEqual(
  full.map((s) => s.id),
  ['today', 'calendar', 'journal', 'goals-study', 'stelloquy'],
)
assert.equal(full[1].tourTarget, 'nav-calendar')
assert.equal(full[1].tourTarget, primaryNavTourTarget('week', true))
console.log('✓ Full IA step ids\n')

console.log('Placeholder copy has no ampersands or em dashes')
const placeholderBodies = [STELLOQUY_TOUR_PLACEHOLDER.body, STELLOQUY_TOUR_PLACEHOLDER.title]
for (const flags of flagCombos()) {
  if (!isIaTourActive(flags)) continue
  for (const step of buildTourSteps(flags)) {
    if (LEGACY_TOUR_STEPS.some((l) => l.id === step.id && l.body === step.body)) continue
    placeholderBodies.push(step.body, step.title, step.cta)
  }
}
for (const text of placeholderBodies) {
  assert.ok(!text.includes('&'), `Ampersand in tour copy: ${text}`)
  assert.ok(!text.includes('—'), `Em dash in tour copy: ${text}`)
}
console.log('✓ Copy guardrails\n')

console.log('Layout passes buildTourSteps to TourOverlay')
const layoutSource = readFileSync(join(root, 'app/(app)/layout.tsx'), 'utf8')
assert.ok(layoutSource.includes('buildTourSteps'))
assert.ok(layoutSource.includes('iaTourFlagsFromProcessEnv'))
assert.ok(layoutSource.includes('<TourOverlay steps={tourSteps}'))
console.log('✓ Layout wiring\n')

console.log('Sidebar uses primaryNavTourTarget for calendar')
const sidebarSource = readFileSync(join(root, 'components/almanac/AlmanacSidebar.tsx'), 'utf8')
assert.ok(sidebarSource.includes('primaryNavTourTarget'))
assert.ok(sidebarSource.includes('nav-calendar') || sidebarSource.includes('primaryNavTourTarget'))
console.log('✓ Sidebar data-tour helper\n')

console.log('All IA tour tests passed.')
