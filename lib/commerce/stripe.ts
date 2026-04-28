import "server-only";

import Stripe from "stripe";

import {
  AccessPlan,
  buildTierMetadata,
  CommerceTier,
  getCommerceTier,
  LOYALTY_REWARD_AMOUNT_OFF_CENTS,
  NEXT_PLANNER_YEAR,
  parseCommerceTierKey,
} from "@/lib/commerce/config";
import { buildAnnualEntitlementRecord } from "@/lib/commerce/entitlements";
import { createAdminSupabase } from "@/lib/supabase/admin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3699";
}

export function getStripeClient() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function createCheckoutSession(params: {
  tier: CommerceTier;
  accessPlan?: AccessPlan;
  clerkUserId: string;
  customerEmail: string;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const accessPlan = params.accessPlan ?? "yearly";

  return stripe.checkout.sessions.create({
    mode: "payment",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: params.clerkUserId,
    customer_creation: "always",
    customer_email: params.customerEmail,
    success_url: `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: params.tier.directPriceCents,
          product_data: {
            name: params.tier.name,
            description: params.tier.description,
            metadata: buildTierMetadata(params.tier, accessPlan),
          },
        },
      },
    ],
    metadata: buildTierMetadata(params.tier, accessPlan),
    payment_intent_data: {
      metadata: buildTierMetadata(params.tier, accessPlan),
    },
  });
}

export async function finalizeCheckoutSession(params: {
  sessionId: string;
  clerkUserId: string;
}) {
  const stripe = getStripeClient();
  const supabase = createAdminSupabase();

  const session = await stripe.checkout.sessions.retrieve(params.sessionId);

  if (!session) {
    throw new Error("Checkout session not found.");
  }

  if (session.client_reference_id !== params.clerkUserId) {
    throw new Error("This checkout session does not belong to the signed-in user.");
  }

  if (session.mode !== "payment" || session.payment_status !== "paid") {
    throw new Error("This checkout session has not been paid yet.");
  }

  const tierKey = parseCommerceTierKey(session.metadata?.product_tier);
  if (!tierKey) {
    throw new Error("The checkout session is missing tier metadata.");
  }

  const tier = getCommerceTier(tierKey);
  const accessPlan = session.metadata?.access_plan === "monthly" ? "monthly" : "yearly";

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("clerk_user_id", params.clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error("Your Kiaros profile is not ready yet. Please try again.");
  }

  const purchasedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const orderPayload = {
    clerk_user_id: params.clerkUserId,
    user_id: profile.id,
    purchaser_email:
      session.customer_details?.email ?? session.customer_email ?? profile.email,
    product_tier: tier.key,
    planner_year: tier.plannerYear,
    oracle_enabled: tier.oracleEnabled,
    access_plan: accessPlan,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : null,
    amount_subtotal_cents: session.amount_subtotal ?? tier.directPriceCents,
    amount_total_cents: session.amount_total ?? tier.directPriceCents,
    currency: session.currency ?? "usd",
    status: "paid",
    purchased_at: purchasedAt,
    metadata: {
      checkout_session_id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      access_plan: accessPlan,
    },
  };

  const { data: order, error: orderError } = await supabase
    .from("direct_purchase_orders")
    .upsert(orderPayload, { onConflict: "stripe_checkout_session_id" })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error("We couldn't save your purchase record yet.");
  }

  const entitlementPayload = buildAnnualEntitlementRecord({
    user_id: profile.id,
    source: "stripe",
    source_order_id: order.id,
    product_tier: tier.key,
    planner_year: tier.plannerYear,
    oracle_enabled: tier.oracleEnabled,
    startAt: purchasedAt,
  });

  const { error: entitlementError } = await supabase
    .from("product_entitlements")
    .upsert(entitlementPayload, { onConflict: "source,source_order_id" });

  if (entitlementError) {
    throw new Error("We couldn't activate your planner access yet.");
  }

  await supabase
    .from("loyalty_rewards")
    .upsert(
      {
        user_id: profile.id,
        entitlement_id: null,
        delivery_email: profile.email,
        status: "pending",
        reward_year: NEXT_PLANNER_YEAR,
        amount_off_cents: LOYALTY_REWARD_AMOUNT_OFF_CENTS,
        currency: "usd",
        metadata: {
          source: "stripe",
          stripe_checkout_session_id: session.id,
        },
      },
      { onConflict: "user_id,reward_year" }
    );

  await supabase
    .from("direct_purchase_orders")
    .update({ status: "activated" })
    .eq("id", order.id);

  return {
    tier,
    email: profile.email,
  };
}
