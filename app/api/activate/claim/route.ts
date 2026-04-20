import { NextResponse } from "next/server";

import {
  activationClaimSchema,
  buildClaimExpiryDate,
  normalizeMarketplaceEmail,
  normalizeOrderNumber,
} from "@/lib/commerce/activation";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = activationClaimSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const orderNumber = normalizeOrderNumber(parsed.data.orderNumber);
  const email = normalizeMarketplaceEmail(parsed.data.email);
  const supabase = createServerSupabase();

  const { data: order, error: orderError } = await supabase
    .from("marketplace_orders")
    .select("id, external_order_id, purchaser_email, status, product_tier, planner_year, oracle_enabled, claimed_user_id")
    .eq("source", "etsy")
    .eq("external_order_id", orderNumber)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { success: false, error: "Activation is not ready yet. Please try again after setup is complete." },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { success: false, error: "We couldn't find an Etsy purchase that matches that order number." },
      { status: 404 }
    );
  }

  if (normalizeMarketplaceEmail(order.purchaser_email) !== email) {
    return NextResponse.json(
      { success: false, error: "That email does not match the Etsy purchase on file for this order." },
      { status: 403 }
    );
  }

  if (order.status === "refunded" || order.status === "voided") {
    return NextResponse.json(
      { success: false, error: "This order is no longer eligible for activation. Please contact support if this looks wrong." },
      { status: 409 }
    );
  }

  if (order.status === "activated" && order.claimed_user_id) {
    return NextResponse.json(
      { success: false, error: "This Etsy purchase has already been activated on a Kiaros account." },
      { status: 409 }
    );
  }

  const { data: claim, error: claimError } = await supabase
    .from("activation_claims")
    .insert({
      marketplace_order_id: order.id,
      claim_email: email,
      status: "verified",
      verified_at: new Date().toISOString(),
      expires_at: buildClaimExpiryDate(),
    })
    .select("claim_token")
    .single();

  if (claimError || !claim) {
    return NextResponse.json(
      { success: false, error: "We couldn't prepare your activation claim yet. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    claimToken: claim.claim_token,
    signUpUrl: "/sign-up",
    signInUrl: "/sign-in",
    entitlementPreview: {
      plannerYear: order.planner_year,
      productTier: order.product_tier,
      oracleEnabled: order.oracle_enabled,
    },
  });
}
