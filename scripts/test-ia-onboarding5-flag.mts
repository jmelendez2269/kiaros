/**
 * NEXT_PUBLIC_IA_ONBOARDING5 — route helpers and middleware redirect wiring.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  IA5_ONBOARDING_LEGACY_REDIRECTS,
  ONBOARDING_STEPS_IA5,
  defaultOnboardingTraditionPayload,
  ia5LegacyOnboardingRedirect,
  ia5OnboardingPathFromDestination,
  iaOnboarding5FlagEnabled,
  onboardingGeneratingHref,
} from '../lib/onboarding/ia-onboarding-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== NEXT_PUBLIC_IA_ONBOARDING5 tests ===\n')

console.log('Flag env parsing')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  assert.equal(iaOnboarding5FlagEnabled(sample), featureFlagEnabled(sample))
}
console.log('✓ Flag parsing\n')

console.log('IA5 onboarding steps')
assert.equal(ONBOARDING_STEPS_IA5.length, 5)
assert.equal(ONBOARDING_STEPS_IA5[2].path, '/onboarding/year-focus')
console.log('✓ Step list\n')

console.log('Tradition default')
const traditionDefault = defaultOnboardingTraditionPayload()
assert.equal(traditionDefault.tradition, 'evolutionary')
assert.equal(traditionDefault.house_system, 'porphyry')
console.log('✓ Tradition default\n')

console.log('Legacy redirect map')
assert.equal(ia5LegacyOnboardingRedirect('/onboarding/tradition', true), '/onboarding/goals')
assert.equal(ia5LegacyOnboardingRedirect('/onboarding/cycle', true), '/onboarding/year-focus')
assert.equal(ia5LegacyOnboardingRedirect('/onboarding/generating-week', true), '/onboarding/generating')
assert.equal(ia5LegacyOnboardingRedirect('/onboarding/tradition', false), null)
assert.equal(Object.keys(IA5_ONBOARDING_LEGACY_REDIRECTS).length, 4)
console.log('✓ Legacy redirects\n')

console.log('Generating href helper')
assert.equal(onboardingGeneratingHref(false, '/onboarding/generating-week'), '/onboarding/generating-week')
assert.equal(onboardingGeneratingHref(true, '/onboarding/generating-week'), '/onboarding/generating')
console.log('✓ Generating href\n')

console.log('IA5 path from complete destination')
assert.equal(ia5OnboardingPathFromDestination('/onboarding/generating-week'), 'free')
assert.equal(ia5OnboardingPathFromDestination('/onboarding/tradition'), 'paid')
assert.equal(ia5OnboardingPathFromDestination('/onboarding/generating'), 'paid')
console.log('✓ Path from destination\n')

console.log('middleware wiring')
const middlewareSource = readFileSync(join(root, 'middleware.ts'), 'utf8')
assert.ok(middlewareSource.includes('NEXT_PUBLIC_IA_ONBOARDING5'))
assert.ok(middlewareSource.includes('iaOnboarding5LegacyRedirect'))
assert.ok(middlewareSource.includes('ia5LegacyOnboardingRedirect'))
assert.ok(middlewareSource.includes('307'))
console.log('✓ Middleware\n')

console.log('feature-flags.ts exports isIaOnboarding5Enabled')
const flagsSource = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
assert.ok(flagsSource.includes('isIaOnboarding5Enabled'))
console.log('✓ feature-flags\n')

console.log('All NEXT_PUBLIC_IA_ONBOARDING5 tests passed.')
