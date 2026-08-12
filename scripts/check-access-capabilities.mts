import assert from "node:assert/strict";

import {
  getBlueprintYearCapability,
  getMonthlyBlueprintWindow,
  resolveAccessCapabilities,
  type CapabilityEntitlement,
  type ResolveAccessCapabilitiesInput,
} from "../lib/commerce/capabilities.ts";
import type { UserAccessSnapshot } from "../lib/commerce/entitlements.ts";

// Compile-time compatibility proof for existing callers that still consume the
// pre-capability snapshot fields while adoption proceeds in later ACCESS rows.
function legacySnapshotFields(snapshot: UserAccessSnapshot): readonly boolean[] {
  return [snapshot.hasPlannerAccess, snapshot.hasReadOnlyPlannerAccess, snapshot.hasOracleAccess];
}
void legacySnapshotFields;

const AS_OF = "2026-08-06";
let assertions = 0;

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function entitlement(overrides: Partial<CapabilityEntitlement> = {}): CapabilityEntitlement {
  return {
    accessPlan: "monthly",
    endsAt: "2026-12-31",
    oracleEnabled: false,
    plannerYear: 2026,
    source: "stripe",
    startsAt: "2026-01-01",
    status: "active",
    ...overrides,
  };
}

function capabilities(overrides: Partial<ResolveAccessCapabilitiesInput> = {}) {
  return resolveAccessCapabilities({
    asOf: AS_OF,
    authenticated: true,
    entitlements: [],
    ...overrides,
  });
}

const anonymous = capabilities({ authenticated: false });
equal(anonymous.accessState, "anonymous", "anonymous access state");
equal(anonymous.canReadBlueprint, false, "anonymous cannot read Blueprint");
equal(anonymous.canReadJournal, false, "anonymous cannot read journal");
equal(anonymous.canExportJournal, false, "anonymous cannot export journal");
equal(anonymous.canUseStelloquySampler, false, "anonymous cannot use account credits");

const signedIn = capabilities();
equal(signedIn.accessState, "signed_in", "signed-in no-purchase access state");
equal(signedIn.canUsePlanner, false, "signed-in no-purchase cannot use paid planner");
equal(signedIn.canReadJournal, true, "authenticated customer retains journal read");
equal(signedIn.canExportJournal, true, "authenticated customer retains journal export");
equal(signedIn.canWriteJournal, false, "no-purchase customer cannot write journal");

const sampler = capabilities({ samplerCredits: 3 });
equal(sampler.accessState, "sampler_only", "credit holder is sampler-only without a plan");
equal(sampler.canUseStelloquySampler, true, "positive purchased credits enable sampler");
equal(sampler.canUseStelloquySubscription, false, "sampler does not imply subscriber context");
equal(sampler.canUsePlanner, false, "sampler does not imply planner access");
equal(sampler.canReadBlueprint, false, "sampler does not imply Blueprint access");
equal(sampler.canReadFullBlueprint, false, "sampler never implies full Blueprint access");
equal(sampler.canGenerateMonthBrief, false, "sampler cannot generate month briefs");

const invalidSamplerBalance = capabilities({ samplerCredits: -2.5 });
equal(invalidSamplerBalance.samplerCredits, 0, "invalid sampler balance fails closed to zero");
equal(invalidSamplerBalance.canUseStelloquySampler, false, "invalid balance grants no sampler access");

const monthlyPlanner = capabilities({ entitlements: [entitlement()] });
equal(monthlyPlanner.accessState, "active_monthly", "active monthly Planner access state");
equal(monthlyPlanner.canUsePlanner, true, "active monthly can use planner");
equal(monthlyPlanner.canReadBlueprint, true, "active monthly can read projected Blueprint");
equal(monthlyPlanner.canReadFullBlueprint, false, "active monthly cannot read full Blueprint");
equal(monthlyPlanner.blueprintWindowStart, "2026-08-03", "monthly window starts ISO Monday");
equal(monthlyPlanner.blueprintWindowEnd, "2026-09-06", "monthly window ends fourth following Sunday");
equal(monthlyPlanner.canWriteJournal, true, "active monthly can write journal");
equal(monthlyPlanner.canGenerateMonthBrief, true, "active monthly can generate month brief");
equal(monthlyPlanner.canUseStelloquySubscription, false, "core monthly has no subscription Stelloquy");

const monthlyOracle = capabilities({
  entitlements: [entitlement({ oracleEnabled: true })],
});
equal(monthlyOracle.accessState, "active_monthly", "monthly Oracle remains monthly planner access");
equal(monthlyOracle.canUseStelloquySubscription, true, "monthly Oracle enables subscriber Stelloquy");

const annualPlanner = capabilities({
  entitlements: [entitlement({ accessPlan: "yearly" })],
});
equal(annualPlanner.accessState, "active_annual", "active annual Planner access state");
equal(annualPlanner.canReadFullBlueprint, true, "active annual reads full canonical Blueprint");
deepEqual(annualPlanner.blueprintFullAccessYears, [2026], "annual full access is year-scoped");
equal(annualPlanner.blueprintWindowStart, null, "annual access has no projection start");
equal(annualPlanner.canUseStelloquySubscription, false, "core annual has no subscription Stelloquy");

const annualOracle = capabilities({
  entitlements: [entitlement({ accessPlan: "yearly", oracleEnabled: true })],
});
equal(annualOracle.canUseStelloquySubscription, true, "annual Oracle enables subscriber Stelloquy");

const expiredMonthly = capabilities({
  entitlements: [entitlement({ endsAt: "2026-08-05" })],
});
equal(expiredMonthly.accessState, "expired", "expired monthly access state");
equal(expiredMonthly.canUsePlanner, false, "expired monthly cannot use paid planner");
equal(expiredMonthly.canReadBlueprint, false, "expired monthly gets no paid Blueprint");
equal(expiredMonthly.canReadJournal, true, "expired monthly retains journal read");
equal(expiredMonthly.canExportJournal, true, "expired monthly retains journal export");
equal(expiredMonthly.canWriteJournal, false, "expired monthly cannot write journal");

const expiredAnnual = capabilities({
  entitlements: [entitlement({ accessPlan: "yearly", endsAt: "2026-08-05", status: "expired" })],
});
equal(expiredAnnual.accessState, "read_only_annual", "expired annual becomes read-only");
equal(expiredAnnual.canUsePlanner, false, "read-only annual cannot use active planner mutations");
equal(expiredAnnual.canReadBlueprint, true, "read-only annual retains Blueprint read");
equal(expiredAnnual.canReadFullBlueprint, true, "read-only annual retains full canonical Blueprint");
equal(expiredAnnual.canGenerateMonthBrief, false, "read-only annual cannot generate month brief");

const legacyEtsy = capabilities({
  entitlements: [
    entitlement({
      accessPlan: "yearly",
      oracleEnabled: true,
      source: "etsy",
    }),
  ],
});
equal(legacyEtsy.accessState, "active_annual", "legacy Etsy keeps recorded yearly behavior");
equal(legacyEtsy.canReadFullBlueprint, true, "legacy Etsy yearly access remains full");
equal(legacyEtsy.canUseStelloquySubscription, true, "legacy Etsy keeps recorded Oracle entitlement");

const admin = capabilities({ isAdmin: true });
equal(admin.accessState, "admin", "admin access state is explicit");
equal(admin.canUsePlanner, true, "admin has planner access");
equal(admin.canReadFullBlueprint, true, "admin has full Blueprint access");
equal(admin.canWriteJournal, true, "admin has journal write");
equal(admin.canUseStelloquySubscription, true, "admin has Stelloquy subscription capability");
equal(admin.canUseStelloquySampler, true, "admin has explicit full access including sampler surface");
equal(getBlueprintYearCapability(admin, 2099).access, "full", "admin Blueprint access is not year-limited");

const anonymousAdminClaim = capabilities({ authenticated: false, isAdmin: true, samplerCredits: 3 });
equal(anonymousAdminClaim.accessState, "anonymous", "admin flag never authenticates a subject");
equal(anonymousAdminClaim.canReadFullBlueprint, false, "anonymous admin claim fails closed");

const revoked = capabilities({
  entitlements: [entitlement({ oracleEnabled: true, status: "revoked" })],
});
equal(revoked.accessState, "signed_in", "revoked records grant no paid access state");
equal(revoked.canUsePlanner, false, "revoked record grants no planner");
equal(revoked.canUseStelloquySubscription, false, "revoked Oracle record grants no Stelloquy");
equal(revoked.canReadBlueprint, false, "revoked record grants no Blueprint");

const mixedYears = capabilities({
  entitlements: [
    entitlement({
      accessPlan: "yearly",
      endsAt: "2025-12-31",
      plannerYear: 2025,
      startsAt: "2025-01-01",
      status: "expired",
    }),
    entitlement({ accessPlan: "monthly", plannerYear: 2026 }),
  ],
});
equal(mixedYears.accessState, "active_monthly", "active monthly outranks old read-only annual state");
equal(mixedYears.canReadFullBlueprint, false, "mixed role cannot use the unscoped full-Blueprint capability");
deepEqual(mixedYears.blueprintFullAccessYears, [2025], "old annual full read is scoped to its year");
deepEqual(mixedYears.blueprintWindowedAccessYears, [2026], "monthly projection is scoped to current year");
equal(getBlueprintYearCapability(mixedYears, 2025).access, "full", "old annual year remains full");
equal(getBlueprintYearCapability(mixedYears, 2026).access, "windowed", "monthly year remains projected");
equal(
  getBlueprintYearCapability(mixedYears, 2026).windowStart,
  "2026-08-03",
  "year-scoped monthly access carries the rolling start",
);
equal(getBlueprintYearCapability(mixedYears, 2027).access, "none", "unowned year remains inaccessible");

const mixedSameYear = capabilities({
  entitlements: [
    entitlement({ accessPlan: "monthly" }),
    entitlement({ accessPlan: "yearly", oracleEnabled: true }),
  ],
});
equal(mixedSameYear.accessState, "active_annual", "annual wins mixed active plan classification");
deepEqual(mixedSameYear.blueprintWindowedAccessYears, [], "full year removes redundant monthly projection");
equal(mixedSameYear.canUseStelloquySubscription, true, "any active Oracle entitlement enables subscription");

const revokedOracleWithCore = capabilities({
  entitlements: [entitlement(), entitlement({ oracleEnabled: true, status: "revoked" })],
});
equal(revokedOracleWithCore.canUsePlanner, true, "active core survives unrelated revoked record");
equal(revokedOracleWithCore.canUseStelloquySubscription, false, "revoked Oracle cannot elevate core plan");

const activeStartBoundary = capabilities({
  asOf: "2026-08-06",
  entitlements: [entitlement({ startsAt: "2026-08-06", endsAt: "2026-08-06" })],
});
equal(activeStartBoundary.canUsePlanner, true, "entitlement dates are inclusive");

const afterMonthlyBoundary = capabilities({
  asOf: "2026-08-07",
  entitlements: [entitlement({ startsAt: "2026-08-06", endsAt: "2026-08-06" })],
});
equal(afterMonthlyBoundary.canReadBlueprint, false, "monthly Blueprint closes the day after end");

const afterAnnualBoundary = capabilities({
  asOf: "2026-08-07",
  entitlements: [entitlement({ accessPlan: "yearly", startsAt: "2026-08-06", endsAt: "2026-08-06" })],
});
equal(afterAnnualBoundary.accessState, "read_only_annual", "annual becomes read-only after end");
equal(afterAnnualBoundary.canReadFullBlueprint, true, "annual artifact remains fully readable after end");

const statusExpiredInsideDates = capabilities({
  entitlements: [entitlement({ status: "expired" })],
});
equal(statusExpiredInsideDates.canUsePlanner, false, "non-active status fails closed inside date range");

const annualStatusExpiredInsideDates = capabilities({
  entitlements: [entitlement({ accessPlan: "yearly", status: "expired" })],
});
equal(
  annualStatusExpiredInsideDates.canReadFullBlueprint,
  false,
  "annual status marked expired does not become read-only before its end date",
);

deepEqual(
  getMonthlyBlueprintWindow("2026-08-09"),
  { start: "2026-08-03", end: "2026-09-06" },
  "Sunday stays in the same ISO window",
);
const inclusiveWindow = getMonthlyBlueprintWindow(AS_OF);
equal(
  Math.round(
    (new Date(`${inclusiveWindow.end}T00:00:00.000Z`).getTime() -
      new Date(`${inclusiveWindow.start}T00:00:00.000Z`).getTime()) /
      86_400_000,
  ) + 1,
  35,
  "monthly window contains exactly 35 inclusive days",
);
deepEqual(
  getMonthlyBlueprintWindow("2026-08-10"),
  { start: "2026-08-10", end: "2026-09-13" },
  "Monday advances the rolling ISO window",
);
deepEqual(
  getMonthlyBlueprintWindow("2026-12-31"),
  { start: "2026-12-28", end: "2027-01-31" },
  "monthly window crosses calendar years without truncation",
);

assert.throws(
  () => getMonthlyBlueprintWindow("2026-02-31"),
  RangeError,
  "invalid calendar dates must fail closed",
);
assertions += 1;

console.log(`Access capability checks passed (${assertions} assertions).`);
