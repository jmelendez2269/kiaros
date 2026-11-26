import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { validateCheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import { giftCheckoutSchema } from "@/lib/commerce/gift";
import { createGiftCheckoutSession } from "@/lib/commerce/gift-server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Starts a gift checkout. Public: the buyer doesn't need a Kairos account. */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = giftCheckoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Please check the gift details." },
      { status: 400 },
    );
  }

  const checkoutContext =
    payload?.funnelContext === undefined ? null : validateCheckoutFunnelContext(payload.funnelContext);
  if (checkoutContext && !checkoutContext.success) {
    console.warn("[gift-checkout] Invalid attribution, continuing without:", checkoutContext.error);
  }

  // If a member is buying, prefill their email in Stripe. Anyone else types it there.
  let customerEmail: string | null = null;
  const { userId } = await auth();
  if (userId) {
    const { data: profile } = await createAdminSupabase()
      .from("user_profiles")
      .select("email")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    customerEmail = profile?.email ?? null;
  }

  try {
    const session = await createGiftCheckoutSession({
      input: parsed.data,
      checkoutAttemptId: randomUUID(),
      customerEmail,
      funnelContext: checkoutContext?.success ? checkoutContext.context : null,
    });
    if (!session.url) throw new Error("Stripe didn't return a checkout link.");
    return NextResponse.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error("[gift-checkout] Failed to start checkout:", error);
    return NextResponse.json(
      { success: false, error: "Checkout couldn't start right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
