import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  groupRetentionEntitlementsByUser,
  isRetentionEmailEligible,
  type RetentionEntitlement,
} from "../lib/email/retention-eligibility.ts";

const AS_OF = "2026-08-12";
let assertions = 0;

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function entitlement(overrides: Partial<RetentionEntitlement> = {}): RetentionEntitlement {
  return {
    access_plan: "monthly",
    ends_at: "2026-12-31",
    oracle_enabled: false,
    planner_year: 2026,
    source: "stripe",
    starts_at: "2026-01-01",
    status: "active",
    user_id: "user-active",
    ...overrides,
  };
}

equal(
  isRetentionEmailEligible([entitlement()], AS_OF),
  true,
  "active monthly Planner remains eligible",
);
equal(
  isRetentionEmailEligible([entitlement({ access_plan: "yearly" })], AS_OF),
  true,
  "active annual Planner remains eligible",
);
equal(
  isRetentionEmailEligible([entitlement({ ends_at: "2026-08-11" })], AS_OF),
  false,
  "expired monthly access is ineligible",
);
equal(
  isRetentionEmailEligible(
    [entitlement({ access_plan: "yearly", ends_at: "2026-08-11", status: "expired" })],
    AS_OF,
  ),
  false,
  "read-only annual access is ineligible for active-planner retention delivery",
);
equal(
  isRetentionEmailEligible([entitlement({ status: "revoked" })], AS_OF),
  false,
  "revoked access is ineligible",
);
equal(
  isRetentionEmailEligible([entitlement({ starts_at: "2026-08-13" })], AS_OF),
  false,
  "future access is ineligible before it starts",
);
equal(isRetentionEmailEligible([], AS_OF), false, "no entitlement fails closed");
equal(
  isRetentionEmailEligible(
    [
      entitlement({ ends_at: "2026-08-11", user_id: "user-mixed" }),
      entitlement({ access_plan: "yearly", user_id: "user-mixed" }),
    ],
    AS_OF,
  ),
  true,
  "one active entitlement keeps a mixed-history user eligible",
);

const grouped = groupRetentionEntitlementsByUser([
  entitlement({ user_id: "user-a" }),
  entitlement({ access_plan: "yearly", user_id: "user-a" }),
  entitlement({ user_id: "user-b" }),
]);
equal(grouped.get("user-a")?.length, 2, "batch grouping retains every user entitlement");
equal(grouped.get("user-b")?.length, 1, "batch grouping separates recipient entitlements");
equal(grouped.has("user-c"), false, "missing users receive no implicit access");

const senderSource = readFileSync(
  new URL("../lib/email/send-retention-emails.ts", import.meta.url),
  "utf8",
);
assert.match(
  senderSource,
  /\.from\(["']product_entitlements["']\)[\s\S]{0,500}\.in\(["']user_id["']/,
  "retention sender must batch-load candidate entitlements",
);
assert.match(
  senderSource,
  /isRetentionEmailEligible\([\s\S]{0,240}\)\)\s*continue/,
  "retention sender must skip ineligible profiles before delivery work",
);
const eligibilityIndex = senderSource.indexOf("isRetentionEmailEligible(");
const firstBlueprintLoadIndex = senderSource.indexOf("loadCurrentBlueprint(");
const firstSendIndex = senderSource.indexOf("resend.emails.send");
assert.ok(eligibilityIndex >= 0, "sender must call the eligibility boundary");
assert.ok(
  firstBlueprintLoadIndex > eligibilityIndex,
  "eligibility must be checked before Blueprint or transit delivery work",
);
assert.ok(firstSendIndex > eligibilityIndex, "eligibility must be checked before any email send");
assertions += 5;

console.log(`Retention email eligibility checks passed (${assertions} assertions).`);
