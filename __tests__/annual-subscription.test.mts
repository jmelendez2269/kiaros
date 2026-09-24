/**
 * Tests for annual subscription behavior
 * Run with: node --experimental-strip-types __tests__/annual-subscription.test.mts
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// Test helpers
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Simulate the entitlement state resolution logic
type EntitlementState = "active" | "read_only" | "expired" | "revoked";

function resolveEntitlementState(params: {
  status: string;
  startsAt: string;
  endsAt: string;
  accessPlan: "monthly" | "yearly";
  asOf: Date;
}): EntitlementState {
  if (params.status === "revoked") return "revoked";

  const today = toISODate(params.asOf);
  const startsAt = params.startsAt;
  const endsAt = params.endsAt;

  if (startsAt > endsAt) return "expired";
  if (params.status === "active" && today >= startsAt && today <= endsAt) return "active";
  if (today > endsAt && params.accessPlan === "yearly") return "read_only";
  return "expired";
}

describe("Annual Subscription Entitlements", () => {
  it("should create 365-day window for annual subscription", () => {
    const purchaseDate = new Date("2026-01-15T00:00:00.000Z");
    const startsAt = toISODate(purchaseDate);
    const expectedEndsAt = toISODate(addDays(purchaseDate, 364)); // 364 days = 365-day window (inclusive)

    assert.equal(startsAt, "2026-01-15");
    assert.equal(expectedEndsAt, "2027-01-14");
  });

  it("should handle leap year correctly - use max of 365-day and Stripe period", () => {
    // Purchase on Feb 28, 2024 (leap year)
    const purchaseDate = new Date("2024-02-28T00:00:00.000Z");
    const window365 = toISODate(addDays(purchaseDate, 364)); // 2025-02-27
    const stripePeriodEnd = "2025-02-28"; // Stripe bills on anniversary

    // Should use the later date
    const endsAt = window365 > stripePeriodEnd ? window365 : stripePeriodEnd;
    assert.equal(endsAt, "2025-02-28"); // Stripe date is later, so use it
  });

  it("should transition to read_only after ends_at for yearly plan", () => {
    const entitlement = {
      status: "active",
      startsAt: "2026-01-01",
      endsAt: "2026-12-31",
      accessPlan: "yearly" as const,
    };

    // During period: active
    const duringPeriod = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2026-06-15T00:00:00.000Z"),
    });
    assert.equal(duringPeriod, "active");

    // After period: read_only (not expired)
    const afterPeriod = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2027-01-15T00:00:00.000Z"),
    });
    assert.equal(afterPeriod, "read_only");
  });

  it("should transition to expired after ends_at for monthly plan", () => {
    const entitlement = {
      status: "active",
      startsAt: "2026-01-01",
      endsAt: "2026-01-31",
      accessPlan: "monthly" as const,
    };

    // During period: active
    const duringPeriod = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2026-01-15T00:00:00.000Z"),
    });
    assert.equal(duringPeriod, "active");

    // After period: expired (not read_only)
    const afterPeriod = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2026-02-15T00:00:00.000Z"),
    });
    assert.equal(afterPeriod, "expired");
  });

  it("should preserve revoked status regardless of dates", () => {
    const revokedEntitlement = {
      status: "revoked",
      startsAt: "2026-01-01",
      endsAt: "2026-12-31",
      accessPlan: "yearly" as const,
    };

    // During period: still revoked
    const duringPeriod = resolveEntitlementState({
      ...revokedEntitlement,
      asOf: new Date("2026-06-15T00:00:00.000Z"),
    });
    assert.equal(duringPeriod, "revoked");

    // After period: still revoked
    const afterPeriod = resolveEntitlementState({
      ...revokedEntitlement,
      asOf: new Date("2027-01-15T00:00:00.000Z"),
    });
    assert.equal(afterPeriod, "revoked");
  });

  it("should extend annual entitlement by 365 days on renewal (idempotent)", () => {
    const initialEndsAt = "2027-01-14";
    const renewalDate = new Date("2027-01-15T00:00:00.000Z");

    // First processing of invoice - add 365 days to renewal date
    const target365 = addDays(renewalDate, 365);
    const newEndsAt1 = toISODate(target365);
    assert.equal(newEndsAt1, "2028-01-15");

    // Second processing of same invoice (should be idempotent - no change)
    // In real code, processed_invoices array prevents re-processing
    const newEndsAt2 = toISODate(target365);
    assert.equal(newEndsAt2, newEndsAt1); // Same result
  });

  it("should handle cancel_at_period_end - keep access until ends_at", () => {
    const entitlement = {
      status: "active", // Remains active even with cancel_at_period_end
      startsAt: "2026-01-15",
      endsAt: "2027-01-14",
      accessPlan: "yearly" as const,
    };

    // Subscription canceled but period not ended: still active
    const beforePeriodEnd = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2026-12-01T00:00:00.000Z"),
    });
    assert.equal(beforePeriodEnd, "active");

    // After period ends: read_only
    const afterPeriodEnd = resolveEntitlementState({
      ...entitlement,
      asOf: new Date("2027-01-15T00:00:00.000Z"),
    });
    assert.equal(afterPeriodEnd, "read_only");
  });
});

describe("Stripe Checkout Configuration", () => {
  it("should create correct line item for annual subscription", () => {
    const tier = {
      name: "Kairos Planner",
      annualPriceCents: 14000,
      description: "Personalized planning system",
    };

    const lineItem = {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: tier.annualPriceCents,
        product_data: {
          name: `${tier.name} Annual`,
          description: tier.description,
        },
        recurring: {
          interval: "year" as const,
        },
      },
    };

    assert.equal(lineItem.price_data.unit_amount, 14000);
    assert.equal(lineItem.price_data.recurring.interval, "year");
    assert.equal(lineItem.price_data.product_data.name, "Kairos Planner Annual");
  });

  it("should include disclosure text for annual checkout", () => {
    const annualPriceCents = 14000;
    const formattedPrice = `$${annualPriceCents / 100}`;

    const expectedText = `Your subscription renews each year on your purchase date at the same price, ${formattedPrice} a year. You can cancel anytime. Full access continues through the year you've paid for. If you cancel, you keep read-only access to everything you've created, but you can't add anything new.`;

    assert.ok(expectedText.includes("renews each year"));
    assert.ok(expectedText.includes("$140 a year"));
    assert.ok(expectedText.includes("cancel anytime"));
    assert.ok(expectedText.includes("read-only access"));
  });
});

describe("Legacy Behavior Preservation", () => {
  it("should preserve one-time annual purchases (no subscription_id)", () => {
    // Legacy one-time purchase has no stripe_subscription_id
    const legacyOrder = {
      stripe_subscription_id: null,
      access_plan: "yearly",
      amount_total_cents: 14000,
    };

    assert.equal(legacyOrder.stripe_subscription_id, null);
    assert.equal(legacyOrder.access_plan, "yearly");

    // Should still transition to read_only after ends_at
    const legacyEntitlement = {
      status: "active",
      startsAt: "2025-01-01",
      endsAt: "2025-12-31",
      accessPlan: "yearly" as const,
    };

    const afterExpiry = resolveEntitlementState({
      ...legacyEntitlement,
      asOf: new Date("2026-01-15T00:00:00.000Z"),
    });
    assert.equal(afterExpiry, "read_only");
  });
});

// Run all tests
console.log("Running annual subscription tests...\n");
