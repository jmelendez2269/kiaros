import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  captureCheckoutFunnelContext,
  validateCheckoutFunnelContext,
} from "../lib/analytics/checkout-context.ts";
import {
  buildCheckoutAnalyticsMetadata,
  buildCheckoutCanceledEvent,
  buildCheckoutCompletedEvent,
  buildCheckoutStartedEvent,
  checkoutContextFromMetadata,
} from "../lib/analytics/checkout-events-core.ts";
import {
  validateFunnelEvent,
  type FunnelEventRecord,
} from "../lib/analytics/funnel-events.ts";
import {
  recordFunnelEventWithAdapter,
  type FunnelEventDatabaseAdapter,
  type FunnelEventInsertResult,
} from "../lib/analytics/recorder-core.ts";

const ANONYMOUS_ID = "8bbf44e8-67ea-4bf4-9e09-c51b20e9f85a";
const SESSION_ID = "8569a6b6-fd67-4c45-8554-e781bd94b43b";
const USER_ID = "3b56d419-f8dc-41f8-93fc-210f18a2c00d";
const ENTITLEMENT_ID = "20aa92bf-68cf-4e4f-9f22-2b3bc6ffd754";
const ATTEMPT_ID = "f94fcf4d-0194-4789-9ad2-67e12fdbde83";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class InMemoryAdapter implements FunnelEventDatabaseAdapter {
  readonly events = new Map<string, FunnelEventRecord>();

  async insertEvent(event: FunnelEventRecord): Promise<FunnelEventInsertResult> {
    if (
      this.events.has(event.event_id) ||
      [...this.events.values()].some(
        (existing) =>
          existing.event_name === event.event_name &&
          existing.stripe_checkout_session_id !== null &&
          existing.stripe_checkout_session_id === event.stripe_checkout_session_id,
      )
    ) {
      return "duplicate";
    }
    this.events.set(event.event_id, structuredClone(event));
    return "inserted";
  }

  async linkAnonymousEvents(anonymousId: string, userId: string): Promise<number> {
    let linked = 0;
    for (const [eventId, event] of this.events) {
      if (event.anonymous_id === anonymousId && event.user_id === null) {
        this.events.set(eventId, { ...event, user_id: userId });
        linked += 1;
      }
    }
    return linked;
  }
}

const storage = new MemoryStorage();
const ids = [ANONYMOUS_ID, SESSION_ID];
const firstTouch = captureCheckoutFunnelContext({
  entryUrl:
    "https://kairosplanner.xyz/pricing?utm_source=Newsletter&utm_medium=Email&utm_campaign=August%20launch&experiment=pricing-path&variant=reading-first&birth_data=private",
  referrer: "https://example.com/private/path?journal=secret",
  storage,
  now: new Date("2026-08-12T18:00:00.000Z"),
  createId: () => ids.shift() ?? assert.fail("Unexpected id allocation"),
});
const afterAuthentication = captureCheckoutFunnelContext({
  entryUrl: "https://kairosplanner.xyz/pricing",
  referrer: "https://accounts.example/sign-up?private=yes",
  storage,
  now: new Date("2026-08-12T18:10:00.000Z"),
  createId: () => assert.fail("The active funnel session must be reused"),
});

assert.equal(afterAuthentication.anonymous_id, ANONYMOUS_ID);
assert.equal(afterAuthentication.session_id, SESSION_ID);
assert.equal(afterAuthentication.source, "newsletter");
assert.equal(afterAuthentication.experiment_variant, "reading-first");
assert.equal(afterAuthentication.referrer_host, "example.com");
assert.equal(JSON.stringify(afterAuthentication).includes("birth_data"), false);
assert.equal(JSON.stringify(afterAuthentication).includes("journal"), false);

const privateContext = validateCheckoutFunnelContext({
  ...afterAuthentication,
  journal_text: "must never cross the boundary",
});
assert.equal(privateContext.success, false);
const queryStringContext = validateCheckoutFunnelContext({
  ...afterAuthentication,
  entry_path: "/pricing?birth_date=private",
});
assert.equal(queryStringContext.success, false);

const analyticsMetadata = buildCheckoutAnalyticsMetadata(ATTEMPT_ID, afterAuthentication);
const checkoutMetadata = {
  product_tier: "planner_oracle",
  access_plan: "monthly",
  planner_year: "2027",
  oracle_enabled: "true",
  ...analyticsMetadata,
};
assert.deepEqual(checkoutContextFromMetadata(checkoutMetadata), afterAuthentication);
assert.equal(JSON.stringify(analyticsMetadata).includes("private"), false);
assert.deepEqual(
  Object.keys(analyticsMetadata).sort(),
  [
    "kiaros_anonymous_id",
    "kiaros_attempt_id",
    "kiaros_campaign",
    "kiaros_entry_path",
    "kiaros_experiment_key",
    "kiaros_experiment_variant",
    "kiaros_medium",
    "kiaros_referrer_host",
    "kiaros_session_id",
    "kiaros_source",
  ],
);

const session = {
  id: "cs_test_checkout_attribution",
  created: 1_786_558_400,
  amount_total: 2400,
  currency: "usd",
  subscription: "sub_checkout_attribution",
  metadata: checkoutMetadata,
};
const startedInput = buildCheckoutStartedEvent({ session, userId: USER_ID });
const completedInput = buildCheckoutCompletedEvent({
  session,
  userId: USER_ID,
  convertedEntitlementId: ENTITLEMENT_ID,
  occurredAt: "2026-08-12T18:20:00.000Z",
});
const replayedCompletionInput = buildCheckoutCompletedEvent({
  session,
  userId: USER_ID,
  convertedEntitlementId: ENTITLEMENT_ID,
  occurredAt: "2026-08-12T18:21:00.000Z",
});
assert.equal(completedInput.event_id, replayedCompletionInput.event_id);
assert.equal(completedInput.stripe_checkout_session_id, session.id);
assert.equal(completedInput.anonymous_id, ANONYMOUS_ID);
assert.equal(completedInput.source, "newsletter");
assert.equal(completedInput.experiment_variant, "reading-first");

const validatedStart = validateFunnelEvent(startedInput, { allowUserId: true });
if (!validatedStart.success) throw new Error(validatedStart.error);
assert.equal(validatedStart.success, true);

const adapter = new InMemoryAdapter();
const anonymousPricingView = {
  event_id: "pricing_viewed:anonymous",
  event_name: "pricing_viewed" as const,
  occurred_at: "2026-08-12T18:00:00.000Z",
  anonymous_id: ANONYMOUS_ID,
  session_id: SESSION_ID,
  source: "newsletter",
  experiment_key: "pricing-path",
  experiment_variant: "reading-first",
};
await recordFunnelEventWithAdapter(anonymousPricingView, adapter, { enabled: true });
const started = await recordFunnelEventWithAdapter(startedInput, adapter, { enabled: true });
assert.equal(started.status, "recorded");
assert.equal(started.linked_events, 1, "authentication must link earlier anonymous activity");
assert.equal(adapter.events.get("pricing_viewed:anonymous")?.source, "newsletter");
assert.equal(adapter.events.get("pricing_viewed:anonymous")?.user_id, USER_ID);
assert.equal(
  [...adapter.events.values()].filter((event) => event.event_name === "checkout_canceled").length,
  0,
  "an abandoned checkout has no explicit cancellation event",
);

const completed = await recordFunnelEventWithAdapter(completedInput, adapter, { enabled: true });
const replayedCompletion = await recordFunnelEventWithAdapter(
  replayedCompletionInput,
  adapter,
  { enabled: true },
);
assert.equal(completed.status, "recorded");
assert.equal(replayedCompletion.status, "duplicate");
assert.equal(
  [...adapter.events.values()].filter((event) => event.event_name === "checkout_completed").length,
  1,
  "webhook replay must not double-count a checkout",
);

const canceledInput = buildCheckoutCanceledEvent({
  attemptId: ATTEMPT_ID,
  started: validatedStart.event,
  occurredAt: "2026-08-12T18:15:00.000Z",
});
const canceled = await recordFunnelEventWithAdapter(canceledInput, adapter, { enabled: true });
const replayedCancel = await recordFunnelEventWithAdapter(canceledInput, adapter, { enabled: true });
assert.equal(canceled.status, "recorded");
assert.equal(replayedCancel.status, "duplicate");
assert.equal(canceledInput.event_name, "checkout_canceled");
assert.equal(canceledInput.metadata?.reason_code, "customer_return");
assert.equal(canceledInput.stripe_checkout_session_id, session.id);

const checkoutRoute = readFileSync("app/api/commerce/checkout/route.ts", "utf8");
const webhookRoute = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
const successPage = readFileSync("app/purchase/success/page.tsx", "utf8");
const canceledRoute = readFileSync("app/api/commerce/checkout/canceled/route.ts", "utf8");
const stripeSource = readFileSync("lib/commerce/stripe.ts", "utf8");

assert.ok(
  checkoutRoute.indexOf("const session = await createCheckoutSession") <
    checkoutRoute.indexOf("await recordCheckoutStarted"),
  "checkout start must be recorded only after Stripe creates the session",
);
assert.ok(
  webhookRoute.indexOf("event = stripe.webhooks.constructEvent") <
    webhookRoute.indexOf("await recordVerifiedCheckoutCompleted"),
  "completion must be emitted only after Stripe signature verification",
);
assert.equal(
  successPage.includes("recordVerifiedCheckoutCompleted"),
  false,
  "the browser success page must never claim a trusted conversion",
);
assert.match(canceledRoute, /recordCheckoutCanceled/);
assert.match(canceledRoute, /await auth\(\)/);
assert.match(stripeSource, /cancel_url:[^\n]+attempt_id=/);
assert.equal(
  [checkoutRoute, webhookRoute, canceledRoute, stripeSource].join("\n").includes("journal_text"),
  false,
);

console.log("Checkout attribution checks passed.");
