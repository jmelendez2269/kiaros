import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isCheckoutAttemptId } from "@/lib/analytics/checkout-events-core";
import { recordCheckoutCanceled } from "@/lib/analytics/checkout-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to confirm checkout cancellation." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const attemptId =
    typeof body === "object" && body !== null && !Array.isArray(body) && "attemptId" in body
      ? body.attemptId
      : null;
  if (!isCheckoutAttemptId(attemptId)) {
    return NextResponse.json({ error: "Invalid checkout attempt." }, { status: 400 });
  }

  const result = await recordCheckoutCanceled({ attemptId, clerkUserId: userId });
  return NextResponse.json({ accepted: true, status: result.status }, { status: 202 });
}
