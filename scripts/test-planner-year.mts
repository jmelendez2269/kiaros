#!/usr/bin/env node
/**
 * Test script for planner year calculation functions
 * Run with: node --experimental-strip-types scripts/test-planner-year.mts
 */

import { getCurrentPlannerYear, getNextPlannerYear, getPlannerYearWithOverride } from '../lib/commerce/planner-year.ts'

let failures = 0
let passes = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passes++
    console.log(`✓ ${name}`)
  } catch (error) {
    failures++
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message ?? `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    )
  }
}

// Test getCurrentPlannerYear
test('returns 2026 before Dec 1, 2026', () => {
  const nov30 = new Date('2026-11-30T23:59:00-05:00')
  assertEquals(getCurrentPlannerYear(nov30), 2026)
})

test('returns 2027 on Dec 1, 2026', () => {
  const dec1 = new Date('2026-12-01T00:00:00-05:00')
  assertEquals(getCurrentPlannerYear(dec1), 2027)
})

test('returns 2027 after Dec 1, 2026', () => {
  const dec15 = new Date('2026-12-15T12:00:00-05:00')
  assertEquals(getCurrentPlannerYear(dec15), 2027)
})

test('returns 2027 in late December 2026', () => {
  const dec31 = new Date('2026-12-31T23:59:00-05:00')
  assertEquals(getCurrentPlannerYear(dec31), 2027)
})

test('returns 2027 in January 2027', () => {
  const jan1 = new Date('2027-01-01T00:00:00-05:00')
  assertEquals(getCurrentPlannerYear(jan1), 2027)
})

test('handles timezone correctly - Nov 30 ET', () => {
  // Dec 1, 04:00 UTC = Nov 30, 23:00 ET (still Nov 30 in ET)
  const nov30ET = new Date('2026-12-01T04:00:00Z')
  assertEquals(getCurrentPlannerYear(nov30ET), 2026)
})

test('handles timezone correctly - Dec 1 ET', () => {
  // Dec 1, 05:00 UTC = Dec 1, 00:00 ET
  const dec1ET = new Date('2026-12-01T05:00:00Z')
  assertEquals(getCurrentPlannerYear(dec1ET), 2027)
})

// Test getNextPlannerYear
test('getNextPlannerYear returns current + 1', () => {
  const nov30 = new Date('2026-11-30T12:00:00-05:00')
  assertEquals(getNextPlannerYear(nov30), 2027)
})

test('getNextPlannerYear returns current + 1 after roll', () => {
  const dec1 = new Date('2026-12-01T00:00:00-05:00')
  assertEquals(getNextPlannerYear(dec1), 2028)
})

// Test getPlannerYearWithOverride
test('returns calculated year when no override', () => {
  delete process.env.PLANNER_YEAR_OVERRIDE
  const nov30 = new Date('2026-11-30T12:00:00-05:00')
  assertEquals(getPlannerYearWithOverride(nov30), 2026)
})

test('returns override value when set', () => {
  process.env.PLANNER_YEAR_OVERRIDE = '2025'
  const nov30 = new Date('2026-11-30T12:00:00-05:00')
  assertEquals(getPlannerYearWithOverride(nov30), 2025)
  delete process.env.PLANNER_YEAR_OVERRIDE
})

test('ignores invalid override', () => {
  process.env.PLANNER_YEAR_OVERRIDE = 'invalid'
  const nov30 = new Date('2026-11-30T12:00:00-05:00')
  assertEquals(getPlannerYearWithOverride(nov30), 2026)
  delete process.env.PLANNER_YEAR_OVERRIDE
})

test('getNextPlannerYear respects override', () => {
  process.env.PLANNER_YEAR_OVERRIDE = '2025'
  const nov30 = new Date('2026-11-30T12:00:00-05:00')
  assertEquals(getNextPlannerYear(nov30), 2026, 'next year should be override + 1')
  delete process.env.PLANNER_YEAR_OVERRIDE
})

console.log(`\n${passes} passed, ${failures} failed`)
process.exit(failures > 0 ? 1 : 0)
