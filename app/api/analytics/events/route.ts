import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { checkAnalyticsEventsRateLimit } from "@/lib/analytics/analytics-events-rate-limit";
import {
  clientIpFromRequest,
  readPublicAnalyticsEventBody,
  validatePublicAnalyticsEventPayload,
} from "@/lib/analytics/public-analytics-events";
import { recordFunnelEvent, resolveFunnelUserId } from "@/lib/analytics/recorder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkAnalyticsEventsRateLimit(clientIpFromRequest(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const bodyRead = await readPublicAnalyticsEventBody(request);
  if (!bodyRead.success) {
    return NextResponse.json({ error: bodyRead.error }, { status: bodyRead.status });
  }

  const recordBody =
    typeof bodyRead.parsed === "object" &&
    bodyRead.parsed !== null &&
    !Array.isArray(bodyRead.parsed)
      ? (bodyRead.parsed as Record<string, unknown>)
      : null;
  const eventName =
    typeof recordBody?.event_name === "string" ? recordBody.event_name : null;
  const skipAuthenticatedIdentity = eventName === "field_notes_submit";

  const { userId: clerkUserId } = await auth();
  const userId =
    skipAuthenticatedIdentity || !clerkUserId ? null : await resolveFunnelUserId(clerkUserId);

  const validation = validatePublicAnalyticsEventPayload(bodyRead.parsed, { userId });
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const result = await recordFunnelEvent(validation.event);

  if (result.status === "rejected") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    { accepted: true, status: result.status },
    { status: result.status === "recorded" ? 201 : 202 },
  );
}
