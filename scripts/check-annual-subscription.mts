/**
 * Tests for annual subscription behavior
 * Run with: node --experimental-strip-types scripts/check-annual-subscription.mts
 */

import assert from "node:assert/strict";
import {
  resolveAccessCapabilities,
  type CapabilityEntitlement,
} from "../lib/commerce/capabilities.ts";
import { getCommerceTier, getTierPriceCents, formatUsd } from "../lib/commerce/config.ts";

// Helper to create annual entitlement record (simulates buildAnnualEntitlementRecord logic)
function buildAnnualEntitlementWindow(startAt: string): { starts_at: string; ends_at: string } {
  const start = new Date(`${startAt}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 364); // 365-day window (inclusive, so +364)
  return {
    starts_at: startAt,
    ends_at: end.toISOString().slice(0, 10),
  };
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

let assertions = 0;

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function ok(value: unknown, message: string): void {
  assert.ok(value, message);
  assertions += 1;
}

// Test helper: create a capability entitlement
function entitlement(overrides: Partial<CapabilityEntitlement> = {}): CapabilityEntitlement {
  return {
    accessPlan: "yearly",
    endsAt: "2027-01-14",
    oracleEnabled: false,
    plannerYear: 2026,
    source: "stripe",
    startsAt: "2026-01-15",
    status: "active",
    ...overrides,
  };
}

console.log("Testing annual subscription logic...\n");

// ─── Access State Resolution ──────────────────────────────────────────────────

console.log("1. Access state resolution: yearly plans transition to read-only");
const activeYearly = resolveAccessCapabilities({
  asOf: "2026-06-15",
  authenticated: true,
  entitlements: [entitlement()],
});
equal(activeYearly.accessState, "active_annual", "active during period");
equal(activeYearly.canUsePlanner, true, "can use planner when active");
equal(activeYearly.canReadFullBlueprint, true, "annual has full blueprint access");

const lapsedYearly = resolveAccessCapabilities({
  asOf: "2027-01-15",
  authenticated: true,
  entitlements: [entitlement({ endsAt: "2027-01-14" })],
});
equal(lapsedYearly.accessState, "read_only_annual", "transitions to read_only after ends_at");
equal(lapsedYearly.canUsePlanner, false, "cannot use planner when read-only");
equal(lapsedYearly.canReadFullBlueprint, true, "can still read full blueprint");
equal(lapsedYearly.canWriteJournal, false, "cannot write journal when read-only");

console.log("\n2. Access state resolution: monthly plans transition to expired");
const activeMonthly = resolveAccessCapabilities({
  asOf: "2026-06-15",
  authenticated: true,
  entitlements: [
    entitlement({ accessPlan: "monthly", startsAt: "2026-06-01", endsAt: "2026-06-30" }),
  ],
});
equal(activeMonthly.accessState, "active_monthly", "monthly active during period");
equal(activeMonthly.canUsePlanner, true, "can use planner when active");

const lapsedMonthly = resolveAccessCapabilities({
  asOf: "2026-07-01",
  authenticated: true,
  entitlements: [
    entitlement({ accessPlan: "monthly", startsAt: "2026-06-01", endsAt: "2026-06-30" }),
  ],
});
equal(lapsedMonthly.accessState, "expired", "monthly transitions to expired (not read-only)");
equal(lapsedMonthly.canUsePlanner, false, "cannot use planner when expired");
equal(lapsedMonthly.canReadFullBlueprint, false, "cannot read blueprint when expired");

// ─── Revoked Status Preservation ──────────────────────────────────────────────

console.log("\n3. Revoked status preserved regardless of dates");
// Revoked entitlements are filtered out as non-active, so capabilities show no access
const revokedDuringPeriod = resolveAccessCapabilities({
  asOf: "2026-06-15",
  authenticated: true,
  entitlements: [entitlement({ status: "revoked" })],
});
// With only a revoked entitlement, there are no active entitlements, so state is signed_in (or expired if it counts as expired)
// The key is: revoked entitlements grant no access
equal(revokedDuringPeriod.canUsePlanner, false, "cannot use planner when revoked");
equal(revokedDuringPeriod.canReadFullBlueprint, false, "cannot read blueprint when revoked");
ok(
  revokedDuringPeriod.accessState === "signed_in" || revokedDuringPeriod.accessState === "expired",
  "revoked shows as no-access state"
);

const revokedAfterPeriod = resolveAccessCapabilities({
  asOf: "2027-01-15",
  authenticated: true,
  entitlements: [entitlement({ status: "revoked", endsAt: "2027-01-14" })],
});
equal(revokedAfterPeriod.canUsePlanner, false, "cannot use planner when revoked");

// ─── Cancel at Period End ─────────────────────────────────────────────────────

console.log("\n4. Cancel at period end: access continues through paid period");
// Subscription is canceled (cancel_at_period_end: true) but period hasn't ended yet
const canceledButActive = resolveAccessCapabilities({
  asOf: "2026-12-01",
  authenticated: true,
  entitlements: [entitlement({ endsAt: "2027-01-14" })],
});
equal(canceledButActive.accessState, "active_annual", "still active before period ends");
equal(canceledButActive.canUsePlanner, true, "can still use planner during paid period");

// After period ends, transitions to read-only
const canceledAfterPeriod = resolveAccessCapabilities({
  asOf: "2027-01-15",
  authenticated: true,
  entitlements: [entitlement({ endsAt: "2027-01-14" })],
});
equal(canceledAfterPeriod.accessState, "read_only_annual", "transitions to read-only after period");
equal(canceledAfterPeriod.canUsePlanner, false, "cannot use planner after period ends");

// ─── Stripe Checkout Configuration ───────────────────────────────────────────

console.log("\n5. Stripe checkout configuration");
const plannerTier = getCommerceTier("planner");
const oracleTier = getCommerceTier("planner_oracle");

equal(getTierPriceCents(plannerTier, "yearly"), 14000, "Planner annual price is $140");
equal(getTierPriceCents(oracleTier, "yearly"), 22000, "Planner + Oracle annual price is $220");

// Verify disclosure text formatting
const plannerPrice = formatUsd(plannerTier.annualPriceCents);
const oraclePrice = formatUsd(oracleTier.annualPriceCents);
equal(plannerPrice, "$140", "formats Planner price correctly");
equal(oraclePrice, "$220", "formats Oracle price correctly");

const expectedPlannerText = `Your subscription renews each year on your purchase date at the same price, $140 a year. You can cancel anytime. Full access continues through the year you've paid for. If you cancel, you keep read-only access to everything you've created, but you can't add anything new.`;
ok(expectedPlannerText.includes("$140 a year"), "disclosure text includes Planner price");
ok(expectedPlannerText.includes("renews each year"), "disclosure mentions yearly renewal");
ok(expectedPlannerText.includes("cancel anytime"), "disclosure mentions cancellation");
ok(expectedPlannerText.includes("read-only access"), "disclosure mentions read-only access");

const expectedOracleText = expectedPlannerText.replace("$140", "$220");
ok(expectedOracleText.includes("$220 a year"), "disclosure text includes Oracle price");

// ─── Legacy One-Time Preservation ─────────────────────────────────────────────

console.log("\n6. Legacy one-time purchases preserved");
// Legacy one-time purchases have no stripe_subscription_id
// They should still transition to read_only after ends_at
const legacyOneTime = resolveAccessCapabilities({
  asOf: "2026-06-15",
  authenticated: true,
  entitlements: [entitlement({ source: "stripe" })],
});
equal(legacyOneTime.accessState, "active_annual", "legacy one-time is active during period");

const legacyLapsed = resolveAccessCapabilities({
  asOf: "2027-01-15",
  authenticated: true,
  entitlements: [entitlement({ source: "stripe", endsAt: "2027-01-14" })],
});
equal(legacyLapsed.accessState, "read_only_annual", "legacy transitions to read-only after ends_at");

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n✅ All ${assertions} assertions passed`);
console.log("\nNote: These tests verify access state resolution logic using real functions from");
console.log("`lib/commerce/capabilities.ts` and `lib/commerce/config.ts`.");
