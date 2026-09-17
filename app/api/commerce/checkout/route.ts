import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { validateCheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import { recordCheckoutStarted } from "@/lib/analytics/checkout-events";
import { getCommerceTier, parseAccessPlan, parseCommerceTierKey } from "@/lib/commerce/config";
import { createCheckoutSession, findRedeemableLoyaltyReward } from "@/lib/commerce/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in before starting checkout." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const tierKey = parseCommerceTierKey(payload?.tierKey);
  const accessPlan = parseAccessPlan(payload?.accessPlan) ?? "yearly";
  const checkoutContext = payload?.funnelContext === undefined
    ? null
    : validateCheckoutFunnelContext(payload.funnelContext);

  if (!tierKey) {
    return NextResponse.json({ error: "Choose a valid tier first." }, { status: 400 });
  }
  if (checkoutContext && !checkoutContext.success) {
    return NextResponse.json({ error: "Checkout attribution is invalid." }, { status: 400 });
  }

  const tier = getCommerceTier(tierKey);
  const supabase = createAdminSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("clerk_user_id", userId)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json(
      { error: "Your profile email isn't ready yet. Please try again in a moment." },
      { status: 409 }
    );
  }

  const loyaltyReward = await findRedeemableLoyaltyReward({
    userProfileId: profile.id,
    plannerYear: tier.plannerYear,
  });

  try {
    const checkoutAttemptId = randomUUID();
    const session = await createCheckoutSession({
      tier,
      accessPlan,
      clerkUserId: userId,
      customerEmail: profile.email,
      loyaltyReward,
      checkoutAttemptId,
      funnelContext: checkoutContext?.success ? checkoutContext.context : null,
    });

    try {
      await recordCheckoutStarted({ session, userId: profile.id });
    } catch {
      console.error("[checkout] Unable to record checkout start.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Checkout couldn't start right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
