import assert from "node:assert/strict";

import {
  parseFunnelAttribution,
  preserveFirstTouchAttribution,
  shouldRotateFunnelSession,
} from "../lib/analytics/attribution.ts";
import {
  FUNNEL_EVENT_NAMES,
  isPublicFunnelEventName,
  validateFunnelEvent,
  type FunnelEventRecord,
} from "../lib/analytics/funnel-events.ts";
import {
  recordFunnelEventWithAdapter,
  type FunnelEventDatabaseAdapter,
  type FunnelEventInsertResult,
} from "../lib/analytics/recorder-core.ts";

const ANONYMOUS_ID = "8bbf44e8-67ea-4bf4-9e09-c51b20e9f85a";
const USER_ID = "3b56d419-f8dc-41f8-93fc-210f18a2c00d";
const SESSION_ID = "8569a6b6-fd67-4c45-8554-e781bd94b43b";
const EVENT_ID = "cd77bf1b-51c4-41fb-948b-5d1f1bd36b69";

const validInput = {
  event_id: EVENT_ID,
  event_name: "pricing_viewed" as const,
  occurred_at: "2026-08-06T18:00:00.000Z",
  anonymous_id: ANONYMOUS_ID,
  session_id: SESSION_ID,
  source: " Newsletter ",
  medium: "Email",
  campaign: "August launch",
  referrer_host: "EXAMPLE.COM",
  entry_path: "/pricing",
  experiment_key: "pricing-path",
  experiment_variant: "paid-first",
  product_tier: "planner" as const,
  access_plan: "monthly" as const,
  metadata: { planner_year: 2027, entry_surface: "homepage" },
};

function validationError(input: unknown): string {
  const result = validateFunnelEvent(input);
  assert.equal(result.success, false);
  return result.success ? "" : result.error;
}

const allowed = validateFunnelEvent(validInput);
assert.equal(allowed.success, true);
if (allowed.success) {
  assert.equal(allowed.event.source, "newsletter");
  assert.equal(allowed.event.medium, "email");
  assert.equal(allowed.event.referrer_host, "example.com");
  assert.deepEqual(allowed.event.metadata, {
    amount_minor: undefined,
    currency: undefined,
    planner_year: 2027,
    completion_duration_ms: undefined,
    return_day: undefined,
    invoice_number: undefined,
    credit_balance: undefined,
    is_upgrade: undefined,
    entry_surface: "homepage",
    reason_code: undefined,
  });
}

assert.match(
  validationError({ ...validInput, event_name: "journal_saved" }),
  /allowlisted/,
);
assert.match(
  validationError({ ...validInput, entry_path: "/pricing?birth_date=private" }),
  /query string/,
);
assert.match(
  validationError({ ...validInput, referrer_host: "https://example.com/private?secret=yes" }),
  /hostname only/,
);
assert.match(
  validationError({ ...validInput, source: "https://tracker.example/private?secret=yes" }),
  /URL or query string/,
);
assert.match(
  validationError({ ...validInput, metadata: { journal_text: "private" } }),
  /Unexpected metadata key/,
);
assert.match(
  validationError({ ...validInput, metadata: { reason_code: { content: "private" } } }),
  /must be a string/,
);
assert.match(
  validationError({ ...validInput, blueprint_text: "private" }),
  /Unexpected event field/,
);
assert.match(
  validationError({ ...validInput, campaign: "x".repeat(121) }),
  /too long/,
);
assert.match(
  validationError({ ...validInput, user_id: USER_ID }),
  /assigned by the server/,
);

const stripeEventId = validateFunnelEvent({ ...validInput, event_id: "stripe:evt_123" });
assert.equal(stripeEventId.success, true, "server events may use a stable provider idempotency key");

const publicEventNames = FUNNEL_EVENT_NAMES.filter(isPublicFunnelEventName);
assert.deepEqual(publicEventNames, ["pricing_viewed", "tier_selected", "preview_viewed"]);
const trustedServerEventNames = FUNNEL_EVENT_NAMES.filter((eventName) => !isPublicFunnelEventName(eventName));
assert.deepEqual(trustedServerEventNames, [
  "preview_started",
  "preview_completed",
  "checkout_started",
  "checkout_canceled",
  "checkout_completed",
  "blueprint_ready",
  "day_7_return",
  "subscription_canceled",
  "second_invoice_paid",
  "sampler_purchased",
  "sampler_credit_used",
  "paid_upgrade_completed",
]);
for (const trustedEventName of [
  "checkout_completed",
  "blueprint_ready",
  "subscription_canceled",
  "second_invoice_paid",
  "sampler_purchased",
  "sampler_credit_used",
  "paid_upgrade_completed",
] as const) {
  assert.equal(
    isPublicFunnelEventName(trustedEventName),
    false,
    `${trustedEventName} must be rejected at the public boundary`,
  );
}

const { anonymous_id: _anonymousId, ...authenticatedOnlyInput } = validInput;
const authenticatedOnly = validateFunnelEvent(
  { ...authenticatedOnlyInput, user_id: USER_ID },
  { allowUserId: true },
);
assert.equal(authenticatedOnly.success, true, "server-assigned authenticated identity may stand alone");

const parsedAttribution = parseFunnelAttribution(
  "https://kairosplanner.xyz/pricing?utm_source=Newsletter&utm_medium=Email&utm_campaign=August%20launch&private=birth-data&experiment=pricing-path&variant=reading-first",
  "https://example.com/private/path?secret=yes",
);
assert.deepEqual(parsedAttribution, {
  source: "newsletter",
  medium: "email",
  campaign: "August launch",
  referrer_host: "example.com",
  entry_path: "/pricing",
  experiment_key: "pricing-path",
  experiment_variant: "reading-first",
});
assert.equal(JSON.stringify(parsedAttribution).includes("birth-data"), false);
assert.equal(JSON.stringify(parsedAttribution).includes("secret"), false);

const firstTouch = preserveFirstTouchAttribution(
  parsedAttribution,
  {
    source: "paid-social",
    medium: "cpc",
    campaign: "later",
    referrer_host: "social.example",
    entry_path: "/stelloquy",
    experiment_key: "pricing-path",
    experiment_variant: "paid-first",
  },
);
assert.equal(firstTouch.source, "newsletter");
assert.equal(firstTouch.experiment_variant, "reading-first");
assert.equal(shouldRotateFunnelSession("2026-08-06T17:45:00.000Z", new Date("2026-08-06T18:00:00.000Z")), false);
assert.equal(shouldRotateFunnelSession("2026-08-06T17:29:59.000Z", new Date("2026-08-06T18:00:00.000Z")), true);

class InMemoryAdapter implements FunnelEventDatabaseAdapter {
  readonly events = new Map<string, FunnelEventRecord>();

  async insertEvent(event: FunnelEventRecord): Promise<FunnelEventInsertResult> {
    if (this.events.has(event.event_id)) return "duplicate";
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

const disabledAdapter = new InMemoryAdapter();
const disabled = await recordFunnelEventWithAdapter(validInput, disabledAdapter, { enabled: false });
assert.equal(disabled.status, "disabled");
assert.equal(disabledAdapter.events.size, 0);

const adapter = new InMemoryAdapter();
const first = await recordFunnelEventWithAdapter(validInput, adapter, { enabled: true });
const replay = await recordFunnelEventWithAdapter(validInput, adapter, { enabled: true });
assert.equal(first.status, "recorded");
assert.equal(replay.status, "duplicate");
assert.equal(adapter.events.size, 1, "the same event_id must not double-count");

const linked = await recordFunnelEventWithAdapter(
  { ...validInput, user_id: USER_ID },
  adapter,
  { enabled: true },
);
assert.equal(linked.status, "duplicate");
assert.equal(linked.linked_events, 1);
assert.equal(adapter.events.get(EVENT_ID)?.user_id, USER_ID);
assert.equal(adapter.events.get(EVENT_ID)?.source, "newsletter", "identity linking must preserve acquisition");
assert.equal(adapter.events.get(EVENT_ID)?.experiment_variant, "paid-first");

console.log("Funnel event contract checks passed.");
