import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { recordFunnelEvent, resolveFunnelUserId } from "@/lib/analytics/recorder";
import {
  isPublicFunnelEventName,
  validateFunnelEvent,
} from "@/lib/analytics/funnel-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    Object.prototype.hasOwnProperty.call(body, "user_id")
  ) {
    return NextResponse.json({ error: "user_id is assigned by the server." }, { status: 400 });
  }

  const { userId: clerkUserId } = await auth();
  const userId = clerkUserId ? await resolveFunnelUserId(clerkUserId) : null;
  const validation = validateFunnelEvent(
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? { ...body, user_id: userId }
      : body,
    { allowUserId: true },
  );
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (!isPublicFunnelEventName(validation.event.event_name)) {
    return NextResponse.json(
      { error: "This event may only be recorded by a trusted server route." },
      { status: 403 },
    );
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
