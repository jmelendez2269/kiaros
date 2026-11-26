import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { recordCheckoutStarted } from "@/lib/analytics/checkout-events";
import { getCommerceTier, parseCommerceTierKey } from "@/lib/commerce/config";
import { createCheckoutSession } from "@/lib/commerce/stripe";
import { loadSeason } from "@/lib/season/load";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Early yearly renewal. Opens Stripe Checkout for a new yearly subscription
 * whose year starts the day after the member's current access ends. The
 * member pays in Checkout; nothing is charged here.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in before renewing." }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile, error: profileError } = await admin
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

  let season;
  try {
    season = await loadSeason(profile.id);
  } catch {
    return NextResponse.json({ error: "Your membership couldn't be read just now. Please try again." }, { status: 503 });
  }
  const offer = season.renewal;
  const tierKey = offer ? parseCommerceTierKey(offer.productTier) : null;
  if (!offer || !tierKey) {
    return NextResponse.json({ error: "There's nothing to renew right now." }, { status: 409 });
  }

  try {
    const checkoutAttemptId = randomUUID();
    const session = await createCheckoutSession({
      tier: getCommerceTier(tierKey),
      accessPlan: "yearly",
      clerkUserId: userId,
      customerEmail: profile.email,
      loyaltyReward: null,
      checkoutAttemptId,
      funnelContext: null,
      renewal: { startsOn: offer.newStartsOn, endsOn: offer.newEndsOn, plannerYear: offer.year },
    });
    try {
      await recordCheckoutStarted({ session, userId: profile.id });
    } catch {
      console.error("[renew] Unable to record checkout start.");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[renew] Checkout failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Checkout couldn't start right now. Please try again." }, { status: 500 });
  }
}
