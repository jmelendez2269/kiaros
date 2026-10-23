/**
 * Onboarding cycle fields — payload parity with /onboarding/cycle.
 */

import assert from 'node:assert/strict'
import {
  cycleStateToProfilePayload,
  cycleStateToStoragePayload,
  toggleCycleEnabled,
  type CycleFormState,
} from '../components/onboarding/OnboardingCycleFields.tsx'

const base: CycleFormState = {
  enabled: false,
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: '',
}

console.log('=== onboarding cycle fields ===\n')

console.log('toggleCycleEnabled')
assert.equal(toggleCycleEnabled(base).enabled, true)
assert.equal(toggleCycleEnabled({ ...base, enabled: true }).enabled, false)
console.log('✓ toggle\n')

console.log('cycleStateToProfilePayload matches legacy cycle page')
assert.deepEqual(cycleStateToProfilePayload(base), {
  cycle_enabled: false,
  avg_cycle_length: null,
  avg_period_length: null,
  last_period_start: null,
})
assert.deepEqual(
  cycleStateToProfilePayload({
    enabled: true,
    cycleLength: 30,
    periodLength: 6,
    lastPeriodStart: '2026-01-15',
  }),
  {
    cycle_enabled: true,
    avg_cycle_length: 30,
    avg_period_length: 6,
    last_period_start: '2026-01-15',
  },
)
assert.deepEqual(cycleStateToProfilePayload({ ...base, enabled: true }), {
  cycle_enabled: true,
  avg_cycle_length: 28,
  avg_period_length: 5,
  last_period_start: null,
})
assert.deepEqual(cycleStateToStoragePayload(base), cycleStateToProfilePayload(base))
console.log('✓ payload parity\n')

console.log('All onboarding cycle field tests passed.')
