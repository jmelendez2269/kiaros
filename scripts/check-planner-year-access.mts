#!/usr/bin/env node
/**
 * Test script for planner year calculation and windowed access
 * Run with: node --experimental-strip-types scripts/check-planner-year-access.mts
 */

import assert from 'node:assert/strict'
import {
  getCurrentPlannerYear,
  getNextPlannerYear,
  getPlannerYearWithOverride,
} from '../lib/commerce/planner-year.ts'
import {
  resolveAccessCapabilities,
  shouldRollOver,
  type CapabilityEntitlement,
  type ResolveAccessCapabilitiesInput,
} from '../lib/commerce/capabilities.ts'
import { getCommerceTier } from '../lib/commerce/config.ts'

// Pure loyalty matching function (matches implementation in stripe.ts)
function loyaltyRewardMatches(rewardYear: number, tierPlannerYear: number): boolean {
  return rewardYear === tierPlannerYear
}

let assertions = 0

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message)
  assertions += 1
}

function deepEqual<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message)
  assertions += 1
}

// Test getCurrentPlannerYear
console.log('Testing planner year calculation...')

equal(
  getCurrentPlannerYear(new Date('2026-11-30T23:59:00-05:00')),
  2026,
  'Returns 2026 before Dec 1, 2026'
)

equal(
  getCurrentPlannerYear(new Date('2026-12-01T00:00:00-05:00')),
  2027,
  'Returns 2027 on Dec 1, 2026'
)

equal(
  getCurrentPlannerYear(new Date('2026-12-15T12:00:00-05:00')),
  2027,
  'Returns 2027 after Dec 1, 2026'
)

equal(
  getCurrentPlannerYear(new Date('2027-01-01T00:00:00-05:00')),
  2027,
  'Returns 2027 in January 2027'
)

equal(
  getCurrentPlannerYear(new Date('2026-12-01T04:00:00Z')),
  2026,
  'Handles timezone - Nov 30 ET (Dec 1 UTC)'
)

equal(
  getCurrentPlannerYear(new Date('2026-12-01T05:00:00Z')),
  2027,
  'Handles timezone - Dec 1 ET'
)

// Test getNextPlannerYear
equal(
  getNextPlannerYear(new Date('2026-11-30T12:00:00-05:00')),
  2027,
  'getNextPlannerYear returns current + 1 before roll'
)

equal(
  getNextPlannerYear(new Date('2026-12-01T00:00:00-05:00')),
  2028,
  'getNextPlannerYear returns current + 1 after roll'
)

// Test override
process.env.PLANNER_YEAR_OVERRIDE = '2025'
equal(
  getPlannerYearWithOverride(new Date('2026-11-30T12:00:00-05:00')),
  2025,
  'getPlannerYearWithOverride respects override'
)
equal(
  getNextPlannerYear(new Date('2026-11-30T12:00:00-05:00')),
  2026,
  'getNextPlannerYear respects override'
)
delete process.env.PLANNER_YEAR_OVERRIDE

console.log('Testing windowed access...')

// Test: Access granted only after roll date
const annualSub: CapabilityEntitlement = {
  accessPlan: 'yearly',
  startsAt: '2026-01-15',
  endsAt: '2027-01-13',
  plannerYear: 2026,
  oracleEnabled: false,
  status: 'active',
  source: 'stripe',
  isSubscription: true,
}

// Before Dec 1, only 2026 accessible
let capsNov30 = resolveAccessCapabilities({
  asOf: '2026-11-30',
  authenticated: true,
  entitlements: [annualSub],
})
deepEqual(
  capsNov30.blueprintFullAccessYears,
  [2026],
  'Before Dec 1, subscription only has 2026 access'
)

// On Dec 1, both 2026 and 2027 accessible
let capsDec1 = resolveAccessCapabilities({
  asOf: '2026-12-01',
  authenticated: true,
  entitlements: [annualSub],
})
deepEqual(
  capsDec1.blueprintFullAccessYears,
  [2026, 2027],
  'On Dec 1, subscription gains 2027 access'
)

// Test: Monthly subscription
const monthly: CapabilityEntitlement = {
  accessPlan: 'monthly',
  startsAt: '2026-11-15',
  endsAt: '2026-12-15',
  plannerYear: 2026,
  oracleEnabled: false,
  status: 'active',
  source: 'stripe',
  isSubscription: true,
}

let capsMonthly = resolveAccessCapabilities({
  asOf: '2026-12-05',
  authenticated: true,
  entitlements: [monthly],
})
deepEqual(
  capsMonthly.blueprintWindowedAccessYears,
  [2026, 2027],
  'Monthly subscription gets both years when Dec 1 in window'
)

// Test: One-time purchase without switch
const oneTime: CapabilityEntitlement = {
  accessPlan: 'yearly',
  startsAt: '2026-11-15',
  endsAt: '2027-11-13',
  plannerYear: 2026,
  oracleEnabled: false,
  status: 'active',
  source: 'stripe',
  isSubscription: false,
}

let capsOneTime = resolveAccessCapabilities({
  asOf: '2026-12-05',
  authenticated: true,
  entitlements: [oneTime],
  oneTimeAnnualRollsForward: false,
})
deepEqual(
  capsOneTime.blueprintFullAccessYears,
  [2026],
  'One-time purchase stays locked to 2026 when switch is false'
)

// Test: One-time purchase WITH switch
let capsOneTimeRoll = resolveAccessCapabilities({
  asOf: '2026-12-05',
  authenticated: true,
  entitlements: [oneTime],
  oneTimeAnnualRollsForward: true,
})
deepEqual(
  capsOneTimeRoll.blueprintFullAccessYears,
  [2026, 2027],
  'One-time purchase rolls forward when switch is true'
)

// Test: Read-only after expiry
const expired: CapabilityEntitlement = {
  accessPlan: 'yearly',
  startsAt: '2026-01-15',
  endsAt: '2027-01-13',
  plannerYear: 2026,
  oracleEnabled: false,
  status: 'active',
  source: 'stripe',
  isSubscription: true,
}

let capsExpired = resolveAccessCapabilities({
  asOf: '2027-02-01',
  authenticated: true,
  entitlements: [expired],
})
deepEqual(
  capsExpired.blueprintFullAccessYears,
  [2026, 2027],
  'Read-only retains all years that were accessed'
)
equal(capsExpired.accessState, 'read_only_annual', 'Access state is read_only_annual')
equal(capsExpired.canReadBlueprint, true, 'Can still read blueprint')
equal(capsExpired.canWriteJournal, false, 'Cannot write journal')

console.log('Testing loyalty reward matching...')

// Test: Loyalty reward with reward_year 2027
// On Nov 30, 2026 ET: current planner year is 2026, tier.plannerYear is 2026
// Reward should NOT match
const nov30Date = new Date('2026-11-30T23:59:00-05:00')
const tierNov30 = getCommerceTier('planner', nov30Date)
equal(
  loyaltyRewardMatches(2027, tierNov30.plannerYear),
  false,
  'Reward with reward_year 2027 should NOT match on Nov 30 ET (tier year is 2026)'
)
equal(tierNov30.plannerYear, 2026, 'Tier planner year should be 2026 on Nov 30')

// On Dec 1, 2026 ET: current planner year is 2027, tier.plannerYear is 2027
// Reward should match
const dec1Date = new Date('2026-12-01T00:00:00-05:00')
const tierDec1 = getCommerceTier('planner', dec1Date)
equal(
  loyaltyRewardMatches(2027, tierDec1.plannerYear),
  true,
  'Reward with reward_year 2027 should match on Dec 1 ET (tier year is 2027)'
)
equal(tierDec1.plannerYear, 2027, 'Tier planner year should be 2027 on Dec 1')

console.log('\nTesting rollover trigger...')

// Test: shouldRollOver for annual subscription
// Nov 30: profile is 2026, current planner year is 2026, covered years include 2026 and 2027
// Should NOT roll (profile matches current planner year)
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026, 2027],
    asOf: '2026-11-30T23:59:00-05:00',
  }),
  false,
  'Annual sub should NOT roll on Nov 30 (current planner year is still 2026)'
)

// Dec 1: profile is 2026, current planner year is 2027, covered years include 2026 and 2027
// Should roll (profile < current planner year AND user has access to 2027)
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026, 2027],
    asOf: '2026-12-01T00:00:00-05:00',
  }),
  true,
  'Annual sub should roll on Dec 1 (planner year advanced to 2027)'
)

// Jan 2: profile already updated to 2027 after rollover
// Should NOT roll (profile matches current planner year)
equal(
  shouldRollOver({
    profilePlanYear: 2027,
    coveredYears: [2026, 2027],
    asOf: '2027-01-02T12:00:00-05:00',
  }),
  false,
  'Annual sub should NOT roll on Jan 2 (profile already updated to 2027)'
)

// Test: shouldRollOver for monthly subscription
// Nov 30: should not roll
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026, 2027],
    asOf: '2026-11-30T23:59:00-05:00',
  }),
  false,
  'Monthly sub should NOT roll on Nov 30'
)

// Dec 1: should roll
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026, 2027],
    asOf: '2026-12-01T00:00:00-05:00',
  }),
  true,
  'Monthly sub should roll on Dec 1'
)

// Jan 2: after profile updated
equal(
  shouldRollOver({
    profilePlanYear: 2027,
    coveredYears: [2026, 2027],
    asOf: '2027-01-02T12:00:00-05:00',
  }),
  false,
  'Monthly sub should NOT roll on Jan 2 after profile updated'
)

// Test: shouldRollOver for one-time purchase with switch OFF
// Dec 1: profile is 2026, current planner year is 2027, but covered years only include 2026
// Should NOT roll (user does not have access to 2027)
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026],
    asOf: '2026-12-01T00:00:00-05:00',
  }),
  false,
  'One-time purchase should NOT roll when they lack access to new year'
)

// Jan 1: still should not roll
equal(
  shouldRollOver({
    profilePlanYear: 2026,
    coveredYears: [2026],
    asOf: '2027-01-01T00:00:00-05:00',
  }),
  false,
  'One-time purchase should NOT roll on Jan 1 either'
)

console.log(`\n✅ All ${assertions} assertions passed`)
console.log('Planner year access tests complete')
