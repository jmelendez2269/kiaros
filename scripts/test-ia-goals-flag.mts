/**
 * NEXT_PUBLIC_IA_GOALS — route helpers and sidebar nav wiring (paths unchanged).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  goalsStudyCurriculumHref,
  goalsStudyLifeAreasHref,
  goalsStudyNavHref,
  iaGoalsFlagEnabled,
  isGoalsStudyPath,
  resolveGoalsStudySubKey,
} from '../lib/goals-study/ia-goals-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== NEXT_PUBLIC_IA_GOALS tests ===\n')

console.log('Flag env parsing (parity with CJS helper)')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  assert.equal(iaGoalsFlagEnabled(sample), featureFlagEnabled(sample))
}
console.log('✓ Flag parsing\n')

console.log('Route helpers (paths unchanged)')
assert.equal(goalsStudyLifeAreasHref(), '/areas')
assert.equal(goalsStudyCurriculumHref(), '/curriculum')
assert.equal(goalsStudyNavHref(), '/areas')
assert.equal(resolveGoalsStudySubKey('/areas'), 'life-areas')
assert.equal(resolveGoalsStudySubKey('/areas/career'), 'life-areas')
assert.equal(resolveGoalsStudySubKey('/curriculum'), 'curriculum')
assert.equal(resolveGoalsStudySubKey('/curriculum/setup'), 'curriculum')
assert.equal(resolveGoalsStudySubKey('/curriculum/abc/w/1/s/2'), 'curriculum')
assert.equal(resolveGoalsStudySubKey('/self'), null)
assert.equal(isGoalsStudyPath('/areas'), true)
assert.equal(isGoalsStudyPath('/journal'), false)
console.log('✓ Route helpers\n')

console.log('feature-flags.ts exports isIaGoalsEnabled')
const flagsSource = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
assert.ok(flagsSource.includes('NEXT_PUBLIC_IA_GOALS'))
assert.ok(flagsSource.includes('isIaGoalsEnabled'))
console.log('✓ Server flag export\n')

console.log('App layout passes goalsIaEnabled to sidebar')
const layoutSource = readFileSync(join(root, 'app/(app)/layout.tsx'), 'utf8')
assert.ok(layoutSource.includes('isIaGoalsEnabled()'))
assert.ok(layoutSource.includes('goalsIaEnabled'))
console.log('✓ Layout wiring\n')

console.log('Sidebar: Goals and study nav when flag on; Self loses areas/curriculum')
const sidebarSource = readFileSync(join(root, 'components/almanac/AlmanacSidebar.tsx'), 'utf8')
assert.ok(sidebarSource.includes('goalsIaEnabled'))
assert.ok(sidebarSource.includes("key: 'goalsStudy'"))
assert.ok(sidebarSource.includes('Goals and study'))
assert.ok(
  sidebarSource.includes("sub.href !== '/areas'") &&
    sidebarSource.includes("sub.href !== '/curriculum'"),
  'Self sub-nav must drop Life areas and Curriculum when IA goals is on',
)
assert.ok(sidebarSource.includes("key === 'goalsStudy'"))
assert.ok(sidebarSource.includes("glyph: '✦'"), 'Stelloquy card star glyph must stay')
assert.ok(
  !sidebarSource.match(/key: 'stelloquy'[\s\S]*?glyph: '✦'/g)?.some((block) => block.includes("key: 'goalsStudy'")),
  'only Stelloquy nav item may use the ✦ glyph',
)
console.log('✓ Sidebar IA goals nav\n')

console.log('No next.config redirects for areas/curriculum (paths kept)')
const nextConfigSource = readFileSync(join(root, 'next.config.js'), 'utf8')
assert.ok(!nextConfigSource.includes('NEXT_PUBLIC_IA_GOALS'))
assert.ok(!nextConfigSource.includes("source: '/areas'"))
console.log('✓ No path redirects\n')

console.log('All IA goals flag tests passed.')
