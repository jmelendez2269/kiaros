import "server-only";

import Stripe from "stripe";

import {
  AccessPlan,
  buildTierMetadata,
  CommerceTier,
  getCommerceTier,
  getTierPriceCents,
  LOYALTY_REWARD_AMOUNT_OFF_CENTS,
  NEXT_PLANNER_YEAR,
  parseAccessPlan,
  parseCommerceTierKey,
} from "@/lib/commerce/config";
import { buildAnnualEntitlementRecord, toISODate } from "@/lib/commerce/entitlements";
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

function getUnixDate(value: number | null | undefined) {
  return value ? new Date(value * 1000) : new Date();
}

function getSubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0] ?? null;
}

function getStripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function getSubscriptionAccessStatus(subscription: Stripe.Subscription) {
  return subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
    ? "active"
    : "expired";
}

async function retrieveCheckoutSession(sessionId: string) {
  return getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
}

async function retrieveSubscription(subscriptionId: string) {
  return getStripeClient().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

function buildLineItem(tier: CommerceTier, accessPlan: AccessPlan) {
  const metadata = buildTierMetadata(tier, accessPlan);

  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: getTierPriceCents(tier, accessPlan),
      product_data: {
        name: accessPlan === "monthly" ? `${tier.name} Monthly` : tier.name,
        description: tier.description,
        metadata,
      },
      ...(accessPlan === "monthly"
        ? {
            recurring: {
              interval: "month" as const,
            },
          }
        : {}),
    },
  };
}

/**
 * Creates a Stripe coupon + a single-use promotion code for a pending
 * loyalty reward, then marks the reward row 'created' with the Stripe
 * ids. Safe to call more than once for the same reward (idempotent by
 * skipping rows that already have a promotion code).
 */
export async function createLoyaltyRewardCoupon(reward: {
  id: string;
  amount_off_cents: number | null;
  currency: string | null;
  stripe_customer_id: string | null;
}) {
  if (!reward.amount_off_cents) return null;

  const stripe = getStripeClient();
  const supabase = createAdminSupabase();

  const coupon = await stripe.coupons.create({
    amount_off: reward.amount_off_cents,
    currency: reward.currency ?? "usd",
    duration: "once",
    name: "Kiaros loyalty reward",
  });

  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    max_redemptions: 1,
    ...(reward.stripe_customer_id ? { customer: reward.stripe_customer_id } : {}),
  });

  await supabase
    .from("loyalty_rewards")
    .update({
      status: "created",
      stripe_coupon_id: coupon.id,
      stripe_promotion_code_id: promotionCode.id,
      promotion_code: promotionCode.code,
    })
    .eq("id", reward.id);

  return { couponId: coupon.id, promotionCodeId: promotionCode.id, code: promotionCode.code };
}

/**
 * Finds a still-redeemable loyalty reward for this user against the
 * tier's planner year, so checkout can apply it automatically.
 */
export async function findRedeemableLoyaltyReward(params: {
  userProfileId: string;
  plannerYear: number;
}) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("loyalty_rewards")
    .select("id, stripe_promotion_code_id")
    .eq("user_id", params.userProfileId)
    .eq("reward_year", params.plannerYear)
    .eq("status", "created")
    .not("stripe_promotion_code_id", "is", null)
    .maybeSingle();

  if (!data?.stripe_promotion_code_id) return null;
  return { rewardId: data.id as string, promotionCodeId: data.stripe_promotion_code_id as string };
}

/**
 * Marks a loyalty reward redeemed if this checkout session was created
 * with one attached (see createCheckoutSession's loyaltyReward param).
 */
async function redeemLoyaltyRewardFromSession(session: Stripe.Checkout.Session) {
  const rewardId = session.metadata?.loyalty_reward_id;
  if (!rewardId) return;

  const supabase = createAdminSupabase();
  await supabase
    .from("loyalty_rewards")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", rewardId)
    .eq("status", "created");
}

export async function createCheckoutSession(params: {
  tier: CommerceTier;
  accessPlan?: AccessPlan;
  clerkUserId: string;
  customerEmail: string;
  loyaltyReward?: { rewardId: string; promotionCodeId: string } | null;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const accessPlan = params.accessPlan ?? "yearly";
  const metadata = {
    ...buildTierMetadata(params.tier, accessPlan),
    ...(params.loyaltyReward ? { loyalty_reward_id: params.loyaltyReward.rewardId } : {}),
  };
  const commonParams = {
    ...(params.loyaltyReward
      ? { discounts: [{ promotion_code: params.loyaltyReward.promotionCodeId }] }
      : { allow_promotion_codes: true }),
    billing_address_collection: "auto" as const,
    client_reference_id: params.clerkUserId,
    customer_email: params.customerEmail,
    success_url: `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    line_items: [buildLineItem(params.tier, accessPlan)],
    metadata,
  };

  if (accessPlan === "monthly") {
    return stripe.checkout.sessions.create({
      ...commonParams,
      mode: "subscription",
      subscription_data: {
        description: `${params.tier.name} monthly access`,
        metadata,
      },
    });
  }

  return stripe.checkout.sessions.create({
    ...commonParams,
    mode: "payment",
    customer_creation: "always",
    payment_intent_data: {
      metadata,
    },
  });
}

async function fulfillOneTimeCheckout(params: {
  session: Stripe.Checkout.Session;
  clerkUserId?: string;
}) {
  const supabase = createAdminSupabase();
  const { session } = params;

  if (params.clerkUserId && session.client_reference_id !== params.clerkUserId) {
    throw new Error("This checkout session does not belong to the signed-in user.");
  }

  if (session.payment_status !== "paid") {
    throw new Error("This checkout session has not been paid yet.");
  }

  const tierKey = parseCommerceTierKey(session.metadata?.product_tier);
  if (!tierKey) {
    throw new Error("The checkout session is missing tier metadata.");
  }

  const tier = getCommerceTier(tierKey);
  const clerkUserId = session.client_reference_id;
  if (!clerkUserId) {
    throw new Error("The checkout session is missing user metadata.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, onboarding_completed_at")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error("Your Kiaros profile is not ready yet. Please try again.");
  }

  const purchasedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const orderPayload = {
    clerk_user_id: clerkUserId,
    user_id: profile.id,
    purchaser_email:
      session.customer_details?.email ?? session.customer_email ?? profile.email,
    product_tier: tier.key,
    planner_year: tier.plannerYear,
    oracle_enabled: tier.oracleEnabled,
    access_plan: "yearly" as const,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_customer_id: getStripeId(session.customer),
    amount_subtotal_cents: session.amount_subtotal ?? tier.annualPriceCents,
    amount_total_cents: session.amount_total ?? tier.annualPriceCents,
    currency: session.currency ?? "usd",
    status: "paid",
    purchased_at: purchasedAt,
    metadata: {
      checkout_session_id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      access_plan: "yearly",
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

  const { data: reward } = await supabase
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
        stripe_customer_id: getStripeId(session.customer),
        metadata: {
          source: "stripe",
          stripe_checkout_session_id: session.id,
        },
      },
      { onConflict: "user_id,reward_year" }
    )
    .select("id, amount_off_cents, currency, stripe_customer_id, stripe_promotion_code_id")
    .single();

  if (reward && !reward.stripe_promotion_code_id) {
    await createLoyaltyRewardCoupon(reward).catch((err) =>
      console.error("[stripe] Failed to create loyalty reward coupon:", err)
    );
  }

  await redeemLoyaltyRewardFromSession(session);

  await supabase
    .from("direct_purchase_orders")
    .update({ status: "activated" })
    .eq("id", order.id);

  return {
    tier,
    email: profile.email,
    accessPlan: "yearly" as const,
    isRenewal: !!profile.onboarding_completed_at,
  };
}

async function fulfillSubscriptionCheckout(params: {
  session: Stripe.Checkout.Session;
  clerkUserId?: string;
}) {
  const supabase = createAdminSupabase();
  const { session } = params;

  if (params.clerkUserId && session.client_reference_id !== params.clerkUserId) {
    throw new Error("This checkout session does not belong to the signed-in user.");
  }

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    throw new Error("This checkout session has not been paid yet.");
  }

  const tierKey = parseCommerceTierKey(session.metadata?.product_tier);
  if (!tierKey) {
    throw new Error("The checkout session is missing tier metadata.");
  }

  const clerkUserId = session.client_reference_id;
  if (!clerkUserId) {
    throw new Error("The checkout session is missing user metadata.");
  }

  const subscriptionId = getStripeId(session.subscription);
  if (!subscriptionId) {
    throw new Error("The checkout session is missing subscription metadata.");
  }

  const tier = getCommerceTier(tierKey);
  const subscription =
    typeof session.subscription === "object" && session.subscription
      ? session.subscription
      : await retrieveSubscription(subscriptionId);
  const subscriptionItem = getSubscriptionItem(subscription);
  if (!subscriptionItem) {
    throw new Error("The Stripe subscription is missing its billing item.");
  }

  const startsAt = toISODate(getUnixDate(subscriptionItem?.current_period_start ?? subscription.created));
  const endsAt = toISODate(getUnixDate(subscriptionItem?.current_period_end));
  const entitlementStatus = getSubscriptionAccessStatus(subscription);

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, onboarding_completed_at")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error("Your Kiaros profile is not ready yet. Please try again.");
  }

  const purchasedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const orderPayload = {
    clerk_user_id: clerkUserId,
    user_id: profile.id,
    purchaser_email:
      session.customer_details?.email ?? session.customer_email ?? profile.email,
    product_tier: tier.key,
    planner_year: tier.plannerYear,
    oracle_enabled: tier.oracleEnabled,
    access_plan: "monthly" as const,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_customer_id: getStripeId(session.customer ?? subscription.customer),
    stripe_subscription_id: subscription.id,
    stripe_subscription_item_id: subscriptionItem?.id ?? null,
    stripe_price_id: subscriptionItem?.price.id ?? null,
    amount_subtotal_cents: session.amount_subtotal ?? tier.monthlyPriceCents,
    amount_total_cents: session.amount_total ?? tier.monthlyPriceCents,
    currency: session.currency ?? subscription.currency ?? "usd",
    status: entitlementStatus === "active" ? "paid" : "initiated",
    purchased_at: purchasedAt,
    metadata: {
      checkout_session_id: session.id,
      payment_status: session.payment_status,
      subscription_status: subscription.status,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      access_plan: "monthly",
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

  const { error: entitlementError } = await supabase
    .from("product_entitlements")
    .upsert(
      {
        user_id: profile.id,
        source: "stripe",
        source_order_id: order.id,
        product_tier: tier.key,
        planner_year: tier.plannerYear,
        oracle_enabled: tier.oracleEnabled,
        starts_at: startsAt,
        ends_at: endsAt,
        access_plan: "monthly",
        status: entitlementStatus,
      },
      { onConflict: "source,source_order_id" }
    );

  if (entitlementError) {
    throw new Error("We couldn't activate your planner access yet.");
  }

  await redeemLoyaltyRewardFromSession(session);

  await supabase
    .from("direct_purchase_orders")
    .update({ status: entitlementStatus === "active" ? "activated" : "paid" })
    .eq("id", order.id);

  return {
    tier,
    email: profile.email,
    accessPlan: "monthly" as const,
    isRenewal: !!profile.onboarding_completed_at,
  };
}

export async function fulfillCheckoutSession(params: {
  sessionId: string;
  clerkUserId?: string;
}) {
  const session = await retrieveCheckoutSession(params.sessionId);

  if (!session) {
    throw new Error("Checkout session not found.");
  }

  const accessPlan = parseAccessPlan(session.metadata?.access_plan);
  if (session.mode === "subscription" || accessPlan === "monthly") {
    return fulfillSubscriptionCheckout({ session, clerkUserId: params.clerkUserId });
  }

  return fulfillOneTimeCheckout({ session, clerkUserId: params.clerkUserId });
}

export async function finalizeCheckoutSession(params: {
  sessionId: string;
  clerkUserId: string;
}) {
  return fulfillCheckoutSession(params);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  if (invoice.parent?.type === "subscription_details") {
    return getStripeId(invoice.parent.subscription_details?.subscription);
  }

  return getStripeId(
    (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
  );
}

export async function syncSubscriptionEntitlement(subscription: Stripe.Subscription) {
  const supabase = createAdminSupabase();
  const subscriptionItem = getSubscriptionItem(subscription);
  const subscriptionCustomerId = getStripeId(subscription.customer);
  const status = getSubscriptionAccessStatus(subscription);
  const endsAt = toISODate(getUnixDate(subscriptionItem?.current_period_end));

  const { data: order } = await supabase
    .from("direct_purchase_orders")
    .select("id, metadata")
    .eq("stripe_subscription_id", subscription.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    return { synced: false, reason: "order_not_found" as const };
  }

  await supabase
    .from("direct_purchase_orders")
    .update({
      status: status === "active" ? "activated" : "paid",
      stripe_customer_id: subscriptionCustomerId,
      stripe_subscription_item_id: subscriptionItem?.id ?? null,
      stripe_price_id: subscriptionItem?.price.id ?? null,
      metadata: {
        ...(typeof order.metadata === "object" && order.metadata ? order.metadata : {}),
        subscription_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    })
    .eq("id", order.id);

  await supabase
    .from("product_entitlements")
    .update({
      status,
      ends_at: endsAt,
    })
    .eq("source", "stripe")
    .eq("source_order_id", order.id);

  return { synced: true, reason: null };
}

export async function syncInvoiceSubscription(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    return { synced: false, reason: "subscription_not_found" as const };
  }

  const subscription = await retrieveSubscription(subscriptionId);
  return syncSubscriptionEntitlement(subscription);
}
