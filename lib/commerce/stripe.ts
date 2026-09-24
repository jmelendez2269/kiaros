import "server-only";

import Stripe from "stripe";

import { buildCheckoutAnalyticsMetadata } from "@/lib/analytics/checkout-events-core";
import type { CheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import {
  AccessPlan,
  buildTierMetadata,
  CommerceTier,
  formatUsd,
  getCommerceTier,
  getTierPriceCents,
  isCommerceTierKey,
  LOYALTY_REWARD_AMOUNT_OFF_CENTS,
  parseAccessPlan,
  parseCommerceTierKey,
  parseProductKind,
  type ProductKind,
} from "@/lib/commerce/config";
import { getNextPlannerYear } from "@/lib/commerce/planner-year";
import { buildAnnualEntitlementRecord, toISODate } from "@/lib/commerce/entitlements";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";
import { sendMetaPurchaseEvent } from "@/lib/analytics/meta-capi";

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
        name: accessPlan === "monthly" ? `${tier.name} Monthly` : `${tier.name} Annual`,
        description: tier.description,
        metadata,
      },
      recurring:
        accessPlan === "monthly"
          ? {
              interval: "month" as const,
            }
          : {
              interval: "year" as const,
            },
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
    name: `${BRAND.product} loyalty reward`,
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
/**
 * Pure function: determines if a loyalty reward matches the checkout tier year.
 * Returns true when reward_year equals the tier's planner year.
 */
export function loyaltyRewardMatches(rewardYear: number, tierPlannerYear: number): boolean {
  return rewardYear === tierPlannerYear;
}

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
  checkoutAttemptId: string;
  funnelContext?: CheckoutFunnelContext | null;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const accessPlan = params.accessPlan ?? "yearly";
  const metadata = {
    ...buildTierMetadata(params.tier, accessPlan),
    ...buildCheckoutAnalyticsMetadata(params.checkoutAttemptId, params.funnelContext ?? null),
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
    cancel_url: `${appUrl}/pricing?canceled=1&attempt_id=${encodeURIComponent(params.checkoutAttemptId)}`,
    line_items: [buildLineItem(params.tier, accessPlan)],
    metadata,
  };

  // COPY: voice-approved 2026-09-24
  const customTextForAnnual = `Your subscription renews each year on your purchase date at the same price, ${formatUsd(params.tier.annualPriceCents)} a year. You can cancel anytime. Full access continues through the year you've paid for. If you cancel, you keep read-only access to everything you've created, but you can't add anything new.`;

  return stripe.checkout.sessions.create({
    ...commonParams,
    mode: "subscription",
    subscription_data: {
      description:
        accessPlan === "monthly"
          ? `${params.tier.name} monthly access`
          : `${params.tier.name} annual access`,
      metadata,
    },
    ...(accessPlan === "yearly"
      ? {
          custom_text: {
            submit: {
              message: customTextForAnnual,
            },
          },
        }
      : {}),
  });
}

export async function createSamplerCheckoutSession(params: {
  clerkUserId: string;
  customerEmail: string;
  checkoutAttemptId: string;
  funnelContext?: CheckoutFunnelContext | null;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const metadata = {
    product_tier: "stelloquy_sampler",
    credits_granted: "3",
    ...buildCheckoutAnalyticsMetadata(params.checkoutAttemptId, params.funnelContext ?? null),
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    billing_address_collection: "auto" as const,
    client_reference_id: params.clerkUserId,
    customer_email: params.customerEmail,
    customer_creation: "always",
    success_url: `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1&attempt_id=${encodeURIComponent(params.checkoutAttemptId)}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: {
            name: "Stelloquy Sampler",
            description: "Three Stelloquy conversations grounded in your natal chart and current sky",
            metadata,
          },
        },
      },
    ],
    payment_intent_data: {
      metadata,
    },
    metadata,
  });
}

async function fulfillSamplerCheckout(params: {
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

  const productKind = parseProductKind(session.metadata?.product_tier);
  if (productKind !== "stelloquy_sampler") {
    throw new Error("The checkout session is not for a Stelloquy Sampler.");
  }

  const clerkUserId = session.client_reference_id;
  if (!clerkUserId) {
    throw new Error("The checkout session is missing user metadata.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, onboarding_completed_at, profile_setup_completed_at")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Your ${BRAND.product} profile is not ready yet. Please try again.`);
  }

  const purchasedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const { data: existingPurchase } = await supabase
    .from("stelloquy_sampler_purchases")
    .select("id, stripe_checkout_session_id")
    .eq("user_id", profile.id)
    .in("status", ["active", "exhausted"])
    .maybeSingle();

  if (existingPurchase && existingPurchase.stripe_checkout_session_id !== session.id) {
    throw new Error("You have already purchased a Stelloquy Sampler. Only one sampler pack is available per account.");
  }

  const purchasePayload = {
    user_id: profile.id,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_customer_id: getStripeId(session.customer),
    credits_granted: 3,
    credits_remaining: 3,
    amount_cents: session.amount_total ?? 100,
    currency: session.currency ?? "usd",
    status: "active",
    purchased_at: purchasedAt,
    metadata: {
      checkout_session_id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    },
  };

  const { data: purchase, error: purchaseError } = await supabase
    .from("stelloquy_sampler_purchases")
    .upsert(purchasePayload, { onConflict: "stripe_checkout_session_id" })
    .select("id, credits_remaining")
    .single();

  if (purchaseError || !purchase) {
    throw new Error("We couldn't save your sampler purchase yet.");
  }

  return {
    email: profile.email,
    isRenewal: !!profile.onboarding_completed_at,
    profileSetupComplete: !!profile.profile_setup_completed_at,
    userProfileId: profile.id,
    purchaseId: purchase.id,
    creditsRemaining: purchase.credits_remaining,
  };
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
    .select("id, email, onboarding_completed_at, profile_setup_completed_at")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Your ${BRAND.product} profile is not ready yet. Please try again.`);
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

  const { data: entitlement, error: entitlementError } = await supabase
    .from("product_entitlements")
    .upsert(entitlementPayload, { onConflict: "source,source_order_id" })
    .select("id")
    .single();

  if (entitlementError || !entitlement) {
    throw new Error("We couldn't activate your planner access yet.");
  }

  await supabase
    .from("preview_access")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("user_id", profile.id);

  const { data: reward } = await supabase
    .from("loyalty_rewards")
    .upsert(
      {
        user_id: profile.id,
        entitlement_id: null,
        delivery_email: profile.email,
        status: "pending",
        reward_year: getNextPlannerYear(),
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
    profileSetupComplete: !!profile.profile_setup_completed_at,
    userProfileId: profile.id,
    orderId: order.id,
    entitlementId: entitlement.id,
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
  const accessPlan = parseAccessPlan(session.metadata?.access_plan) ?? "monthly";
  const subscription =
    typeof session.subscription === "object" && session.subscription
      ? session.subscription
      : await retrieveSubscription(subscriptionId);
  const subscriptionItem = getSubscriptionItem(subscription);
  if (!subscriptionItem) {
    throw new Error("The Stripe subscription is missing its billing item.");
  }

  // For annual subscriptions, use a 365-day window from purchase date, but take the max of that
  // and Stripe's current_period_end to handle leap years (prevents a paying subscriber from
  // briefly losing access the day before renewal on non-leap years).
  // For monthly subscriptions, use the Stripe subscription period dates.
  const purchasedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();
  const startsAt =
    accessPlan === "yearly"
      ? toISODate(purchasedAt)
      : toISODate(getUnixDate(subscriptionItem?.current_period_start ?? subscription.created));

  let endsAt: string;
  if (accessPlan === "yearly") {
    const window365 = buildAnnualEntitlementRecord({
      user_id: "",
      source: "stripe",
      product_tier: tier.key,
      planner_year: tier.plannerYear,
      oracle_enabled: tier.oracleEnabled,
      startAt: purchasedAt,
    }).ends_at;
    const stripePeriodEnd = toISODate(getUnixDate(subscriptionItem?.current_period_end));
    endsAt = window365 > stripePeriodEnd ? window365 : stripePeriodEnd;
  } else {
    endsAt = toISODate(getUnixDate(subscriptionItem?.current_period_end));
  }

  const entitlementStatus = getSubscriptionAccessStatus(subscription);

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, onboarding_completed_at, profile_setup_completed_at")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Your ${BRAND.product} profile is not ready yet. Please try again.`);
  }

  const orderPayload = {
    clerk_user_id: clerkUserId,
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
    stripe_customer_id: getStripeId(session.customer ?? subscription.customer),
    stripe_subscription_id: subscription.id,
    stripe_subscription_item_id: subscriptionItem?.id ?? null,
    stripe_price_id: subscriptionItem?.price.id ?? null,
    amount_subtotal_cents:
      session.amount_subtotal ??
      (accessPlan === "yearly" ? tier.annualPriceCents : tier.monthlyPriceCents),
    amount_total_cents:
      session.amount_total ??
      (accessPlan === "yearly" ? tier.annualPriceCents : tier.monthlyPriceCents),
    currency: session.currency ?? subscription.currency ?? "usd",
    status: entitlementStatus === "active" ? "paid" : "initiated",
    purchased_at: purchasedAt,
    metadata: {
      checkout_session_id: session.id,
      payment_status: session.payment_status,
      subscription_status: subscription.status,
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

  const { data: entitlement, error: entitlementError } = await supabase
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
        access_plan: accessPlan,
        status: entitlementStatus,
      },
      { onConflict: "source,source_order_id" }
    )
    .select("id")
    .single();

  if (entitlementError || !entitlement) {
    throw new Error("We couldn't activate your planner access yet.");
  }

  await supabase
    .from("preview_access")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("user_id", profile.id);

  // Loyalty rewards: new annual subscriptions (2026-09-24 onward) do not receive a separate $18 code;
  // the locked founding price is their reward. Legacy one-time annual (pre-2026-09-24) and Etsy buyers
  // still create rewards in fulfillOneTimeCheckout and Etsy activation.

  await redeemLoyaltyRewardFromSession(session);

  await supabase
    .from("direct_purchase_orders")
    .update({ status: entitlementStatus === "active" ? "activated" : "paid" })
    .eq("id", order.id);

  return {
    tier,
    email: profile.email,
    accessPlan,
    isRenewal: !!profile.onboarding_completed_at,
    profileSetupComplete: !!profile.profile_setup_completed_at,
    userProfileId: profile.id,
    orderId: order.id,
    entitlementId: entitlement.id,
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

  const productKind = parseProductKind(session.metadata?.product_tier);

  if (productKind === "stelloquy_sampler") {
    const result = await fulfillSamplerCheckout({ session, clerkUserId: params.clerkUserId });

    await sendMetaPurchaseEvent({
      eventId: `purchase_${session.id}`,
      email: result.email,
      valueCents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      eventSourceUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success`
        : undefined,
    });

    return {
      tier: null,
      email: result.email,
      accessPlan: null,
      isRenewal: result.isRenewal,
      profileSetupComplete: result.profileSetupComplete,
      userProfileId: result.userProfileId,
      orderId: null,
      entitlementId: null,
    };
  }

  const accessPlan = parseAccessPlan(session.metadata?.access_plan);
  const result =
    session.mode === "subscription" || accessPlan === "monthly"
      ? await fulfillSubscriptionCheckout({ session, clerkUserId: params.clerkUserId })
      : await fulfillOneTimeCheckout({ session, clerkUserId: params.clerkUserId });

  await sendMetaPurchaseEvent({
    eventId: `purchase_${session.id}`,
    email: result.email,
    valueCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    eventSourceUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success`
      : undefined,
  });

  return result;
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

  const { data: order } = await supabase
    .from("direct_purchase_orders")
    .select("id, metadata, access_plan")
    .eq("stripe_subscription_id", subscription.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    return { synced: false, reason: "order_not_found" as const };
  }

  const accessPlan = parseAccessPlan(order.access_plan) ?? "monthly";

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

  // Fetch current entitlement to check for non-Stripe-controlled states like "revoked"
  const { data: currentEntitlement } = await supabase
    .from("product_entitlements")
    .select("status")
    .eq("source", "stripe")
    .eq("source_order_id", order.id)
    .single();

  // Never overwrite "revoked" or other admin-applied terminal states
  const shouldUpdateStatus = currentEntitlement?.status !== "revoked";

  // For monthly subscriptions, update ends_at to the subscription period end.
  // For annual subscriptions, ends_at is managed separately in syncInvoiceSubscription on renewal.
  if (accessPlan === "monthly") {
    const endsAt = toISODate(getUnixDate(subscriptionItem?.current_period_end));
    await supabase
      .from("product_entitlements")
      .update({
        ...(shouldUpdateStatus ? { status } : {}),
        ends_at: endsAt,
      })
      .eq("source", "stripe")
      .eq("source_order_id", order.id);
  } else {
    // For annual subscriptions: only set active if the subscription has been paid at least once.
    // Statuses like "incomplete" or "incomplete_expired" (failed payment, no retry) should not grant a free year.
    // Only force "active" for: active, past_due, canceled (after a paid period), trialing.
    // For incomplete/incomplete_expired, use the derived status from getSubscriptionAccessStatus.
    const hasBeenPaid =
      subscription.status === "active" ||
      subscription.status === "past_due" ||
      subscription.status === "canceled" ||
      subscription.status === "trialing";

    if (shouldUpdateStatus) {
      await supabase
        .from("product_entitlements")
        .update({
          status: hasBeenPaid ? "active" : status,
        })
        .eq("source", "stripe")
        .eq("source_order_id", order.id);
    }
  }

  return { synced: true, reason: null };
}

export async function syncInvoiceSubscription(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    return { synced: false, reason: "subscription_not_found" as const };
  }

  const subscription = await retrieveSubscription(subscriptionId);

  // For annual subscriptions, when a renewal invoice is successfully paid, extend the entitlement.
  // This must be idempotent: processing the same invoice twice must not change the result.
  if (invoice.status === "paid" && invoice.billing_reason === "subscription_cycle") {
    const supabase = createAdminSupabase();
    const { data: order } = await supabase
      .from("direct_purchase_orders")
      .select("id, access_plan, metadata")
      .eq("stripe_subscription_id", subscription.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (order) {
      const accessPlan = parseAccessPlan(order.access_plan) ?? "monthly";

      if (accessPlan === "yearly") {
        // Check if we've already processed this invoice (idempotency)
        const orderMetadata = typeof order.metadata === "object" && order.metadata ? order.metadata : {};
        const processedInvoices = Array.isArray(orderMetadata.processed_invoices)
          ? orderMetadata.processed_invoices
          : [];

        if (!processedInvoices.includes(invoice.id)) {
          const subscriptionItem = getSubscriptionItem(subscription);

          // Compute the new ends_at deterministically from the invoice period start + 365 days.
          // Take the max of that and the Stripe subscription's current_period_end to handle leap years.
          // This ensures a paying subscriber never briefly loses access the day before renewal.
          const periodStart = invoice.lines.data[0]?.period?.start
            ? new Date(invoice.lines.data[0].period.start * 1000)
            : new Date();
          const target365 = new Date(periodStart);
          target365.setUTCDate(target365.getUTCDate() + 365);

          const stripePeriodEnd = subscriptionItem?.current_period_end
            ? new Date(subscriptionItem.current_period_end * 1000)
            : target365;

          const newEndsAt = target365 > stripePeriodEnd ? target365 : stripePeriodEnd;

          // Fetch current ends_at to take the max (never reduce access window)
          const { data: entitlement } = await supabase
            .from("product_entitlements")
            .select("ends_at")
            .eq("source", "stripe")
            .eq("source_order_id", order.id)
            .single();

          if (entitlement) {
            const currentEndsAt = new Date(`${entitlement.ends_at}T00:00:00.000Z`);
            const finalEndsAt = newEndsAt > currentEndsAt ? newEndsAt : currentEndsAt;

            await supabase
              .from("product_entitlements")
              .update({
                ends_at: toISODate(finalEndsAt),
              })
              .eq("source", "stripe")
              .eq("source_order_id", order.id);

            // Mark this invoice as processed
            await supabase
              .from("direct_purchase_orders")
              .update({
                metadata: {
                  ...orderMetadata,
                  processed_invoices: [...processedInvoices, invoice.id],
                },
              })
              .eq("id", order.id);
          }
        }
      }
    }
  }

  return syncSubscriptionEntitlement(subscription);
}
