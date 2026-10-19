import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANALYTICS_EVENTS_RATE_LIMIT,
  checkAnalyticsEventsRateLimit,
} from "../lib/analytics/analytics-events-rate-limit.ts";
import {
  PUBLIC_ANALYTICS_EVENTS_MAX_BODY_BYTES,
  readPublicAnalyticsEventBody,
  validatePublicAnalyticsEventPayload,
} from "../lib/analytics/public-analytics-events.ts";
import { validateFunnelEvent } from "../lib/analytics/funnel-events.ts";
import { PUBLIC_ROUTE_PATTERNS } from "../lib/marketing/public-routes.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ANONYMOUS_ID = "8bbf44e8-67ea-4bf4-9e09-c51b20e9f85a";

function testPublicRoutePattern(): void {
  assert.ok(
    PUBLIC_ROUTE_PATTERNS.includes("/api/analytics/events"),
    "PUBLIC_ROUTE_PATTERNS must include /api/analytics/events",
  );
}

function testFieldNotesPageSource(): void {
  const pageSource = readFileSync(
    join(root, "components/marketing/FieldNotesPageContent.tsx"),
    "utf8",
  );
  assert.match(pageSource, /source="field_notes_page"/);

  const sourceLib = readFileSync(join(root, "lib/marketing/field-notes-source.ts"), "utf8");
  assert.match(sourceLib, /"field_notes_page"/);
}

async function testBodySizeLimit(): Promise<void> {
  const within = JSON.stringify({
    event_id: "field_notes_submit:test",
    event_name: "field_notes_submit",
    anonymous_id: ANONYMOUS_ID,
    source: "field_notes_page",
  });
  const withinRequest = new Request("https://kairos.test/api/analytics/events", {
    method: "POST",
    body: within,
    headers: { "Content-Type": "application/json" },
  });
  const withinRead = await readPublicAnalyticsEventBody(withinRequest);
  assert.equal(withinRead.success, true);

  const oversized = "x".repeat(PUBLIC_ANALYTICS_EVENTS_MAX_BODY_BYTES + 1);
  const largeRequest = new Request("https://kairos.test/api/analytics/events", {
    method: "POST",
    body: oversized,
    headers: { "Content-Type": "application/json", "content-length": String(oversized.length) },
  });
  const largeRead = await readPublicAnalyticsEventBody(largeRequest);
  assert.equal(largeRead.success, false);
  if (!largeRead.success) {
    assert.equal(largeRead.status, 413);
  }
}

function testDisallowedEventAndSource(): void {
  const trustedOnly = validatePublicAnalyticsEventPayload(
    {
      event_id: "checkout_completed:abc",
      event_name: "checkout_completed",
      anonymous_id: ANONYMOUS_ID,
    },
    { userId: null },
  );
  assert.equal(trustedOnly.success, false);
  if (!trustedOnly.success) {
    assert.match(trustedOnly.error, /allowlisted/);
  }

  const badSource = validatePublicAnalyticsEventPayload(
    {
      event_id: "field_notes_submit:bad",
      event_name: "field_notes_submit",
      anonymous_id: ANONYMOUS_ID,
      source: "not_a_real_surface",
    },
    { userId: null },
  );
  assert.equal(badSource.success, false);
  if (!badSource.success) {
    assert.match(badSource.error, /signup surface/);
  }

  const allowed = validatePublicAnalyticsEventPayload(
    {
      event_id: "field_notes_submit:ok",
      event_name: "field_notes_submit",
      anonymous_id: ANONYMOUS_ID,
      source: "field_notes_page",
    },
    { userId: null },
  );
  assert.equal(allowed.success, true);

  const fieldNotesViaValidator = validateFunnelEvent({
    event_id: "field_notes_submit:ok2",
    event_name: "field_notes_submit",
    anonymous_id: ANONYMOUS_ID,
    source: "field_notes_page",
  });
  assert.equal(fieldNotesViaValidator.success, true);

  const emailRejected = validatePublicAnalyticsEventPayload(
    {
      event_id: "field_notes_submit:email",
      event_name: "field_notes_submit",
      anonymous_id: ANONYMOUS_ID,
      source: "field_notes_page",
      email: "user@example.com",
    },
    { userId: null },
  );
  assert.equal(emailRejected.success, false);
  if (!emailRejected.success) {
    assert.match(emailRejected.error, /email/);
  }
}

function testRateLimit(): void {
  const ip = "203.0.113.10";
  const start = 1_700_000_000_000;
  for (let i = 0; i < ANALYTICS_EVENTS_RATE_LIMIT.maxRequestsPerWindow; i += 1) {
    const result = checkAnalyticsEventsRateLimit(ip, start + i);
    assert.equal(result.allowed, true);
  }
  const blocked = checkAnalyticsEventsRateLimit(ip, start + 100);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.ok(blocked.retryAfterSeconds >= 1);
  }
}

async function run(): Promise<void> {
  testPublicRoutePattern();
  testFieldNotesPageSource();
  testDisallowedEventAndSource();
  testRateLimit();
  await testBodySizeLimit();
  console.log("check-analytics-events-route: passed");
}

await run();
