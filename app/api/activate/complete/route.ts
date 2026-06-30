import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { LOYALTY_REWARD_AMOUNT_OFF_CENTS, NEXT_PLANNER_YEAR } from "@/lib/commerce/config";
import { buildAnnualEntitlementRecord } from "@/lib/commerce/entitlements";
import { activationCompleteSchema } from "@/lib/commerce/activation";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in first to finish activation." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = activationCompleteSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: "Your Kiaros profile is not ready yet. Please try again in a moment." },
      { status: 409 }
    );
  }

  const { data: claim, error: claimError } = await supabase
    .from("activation_claims")
    .select("id, marketplace_order_id, status, expires_at, claimed_user_id, claim_email")
    .eq("claim_token", parsed.data.claimToken)
    .maybeSingle();

  if (claimError || !claim) {
    return NextResponse.json(
      { success: false, error: "That activation claim could not be found." },
      { status: 404 }
    );
  }

  if (claim.claimed_user_id && claim.claimed_user_id !== profile.id) {
    return NextResponse.json(
      { success: false, error: "This activation claim has already been used on another account." },
      { status: 409 }
    );
  }

  if (claim.expires_at && new Date(claim.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: "This activation claim has expired. Please verify your Etsy purchase again." },
      { status: 410 }
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("marketplace_orders")
    .select("id, planner_year, product_tier, oracle_enabled, purchased_at")
    .eq("id", claim.marketplace_order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { success: false, error: "The linked marketplace order could not be loaded." },
      { status: 404 }
    );
  }

  const entitlementPayload = buildAnnualEntitlementRecord({
    user_id: profile.id,
    source: "etsy",
    source_order_id: order.id,
    product_tier: order.product_tier,
    planner_year: order.planner_year,
    oracle_enabled: order.oracle_enabled,
    startAt: new Date(),
  });

  const { error: entitlementError } = await supabase
    .from("product_entitlements")
    .upsert(entitlementPayload, { onConflict: "source,source_order_id" });

  if (entitlementError) {
    return NextResponse.json(
      { success: false, error: "We couldn't create your planner access yet. Please try again." },
      { status: 500 }
    );
  }

  const timestamp = new Date().toISOString();

  const { error: claimUpdateError } = await supabase
    .from("activation_claims")
    .update({
      status: "activated",
      claimed_user_id: profile.id,
      claimed_clerk_user_id: userId,
      claimed_at: timestamp,
      consumed_at: timestamp,
    })
    .eq("id", claim.id);

  if (claimUpdateError) {
    return NextResponse.json(
      { success: false, error: "Your planner access was created, but claim finalization needs a retry." },
      { status: 500 }
    );
  }

  await supabase
    .from("marketplace_orders")
    .update({
      status: "activated",
      claimed_user_id: profile.id,
      claimed_at: timestamp,
    })
    .eq("id", order.id);

  await supabase
    .from("loyalty_rewards")
    .upsert(
      {
        user_id: profile.id,
        entitlement_id: null,
        delivery_email: profile.email ?? claim.claim_email,
        status: "pending",
        reward_year: NEXT_PLANNER_YEAR,
        amount_off_cents: LOYALTY_REWARD_AMOUNT_OFF_CENTS,
        currency: "usd",
        metadata: {
          source: "etsy",
          marketplace_order_id: order.id,
        },
      },
      { onConflict: "user_id,reward_year" }
    );

  return NextResponse.json({
    success: true,
    entitlement: {
      plannerYear: order.planner_year,
      productTier: order.product_tier,
      oracleEnabled: order.oracle_enabled,
    },
  });
}
