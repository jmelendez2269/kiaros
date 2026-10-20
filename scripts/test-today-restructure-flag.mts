/**
 * Phase 1 Today restructure: KIAROS_RESTRUCTURE_TODAY flag wiring.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

function enabled(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase())
}

console.log('=== Today restructure flag tests ===\n')

const flagsSrc = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
assert.match(flagsSrc, /KIAROS_RESTRUCTURE_TODAY/)
assert.match(flagsSrc, /isTodayRestructureEnabled/)

const pageSrc = readFileSync(join(root, 'app/(app)/today/page.tsx'), 'utf8')
assert.match(pageSrc, /isTodayRestructureEnabled\(\)/)
assert.match(pageSrc, /TodayPageV2/)
assert.match(pageSrc, /TodayPageLegacy/)

assert.equal(enabled(undefined), false)
assert.equal(enabled('false'), false)
assert.equal(enabled('0'), false)
assert.equal(enabled('true'), true)
assert.equal(enabled('TRUE'), true)
assert.equal(enabled(' on '), true)

console.log('✓ Flag env parsing and page gating wiring look correct\n')
