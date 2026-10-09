/**
 * Stripe subscription cancel metadata (portal cancel_at on API 2026-03-25).
 * Run with: npx tsx scripts/check-subscription-cancel-metadata.mts
 */

import assert from "node:assert/strict";
import {
  buildSubscriptionCancelMetadata,
  isSubscriptionScheduledToCancel,
} from "../lib/commerce/subscription-cancel-metadata.ts";

let assertions = 0;

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

console.log("Testing subscription cancel metadata...\n");

const periodEndOnly = buildSubscriptionCancelMetadata({
  cancel_at_period_end: true,
  cancel_at: null,
});
deepEqual(
  periodEndOnly,
  { cancel_at_period_end: true, cancel_at: null },
  "cancel_at_period_end true records scheduled cancel without cancel_at timestamp"
);
equal(
  isSubscriptionScheduledToCancel({ cancel_at_period_end: true, cancel_at: null }),
  true,
  "cancel_at_period_end true is scheduled to cancel"
);

const portalCancelAt = 1_700_000_000;
const cancelAtOnly = buildSubscriptionCancelMetadata({
  cancel_at_period_end: false,
  cancel_at: portalCancelAt,
});
deepEqual(
  cancelAtOnly,
  {
    cancel_at_period_end: true,
    cancel_at: new Date(portalCancelAt * 1000).toISOString(),
  },
  "cancel_at set with cancel_at_period_end false still records scheduled cancel"
);
equal(
  isSubscriptionScheduledToCancel({ cancel_at_period_end: false, cancel_at: portalCancelAt }),
  true,
  "cancel_at alone is scheduled to cancel"
);

const active = buildSubscriptionCancelMetadata({
  cancel_at_period_end: false,
  cancel_at: null,
});
deepEqual(
  active,
  { cancel_at_period_end: false, cancel_at: null },
  "both unset means not scheduled to cancel"
);
equal(
  isSubscriptionScheduledToCancel({ cancel_at_period_end: false, cancel_at: null }),
  false,
  "both unset is not scheduled to cancel"
);

const beforeResume = buildSubscriptionCancelMetadata({
  cancel_at_period_end: false,
  cancel_at: portalCancelAt,
});
equal(beforeResume.cancel_at_period_end, true, "portal cancel is recorded before resume");

const afterResume = buildSubscriptionCancelMetadata({
  cancel_at_period_end: false,
  cancel_at: null,
});
deepEqual(
  afterResume,
  { cancel_at_period_end: false, cancel_at: null },
  "resume clears cancel metadata flags"
);

console.log(`\nSubscription cancel metadata check passed (${assertions} assertions).`);
