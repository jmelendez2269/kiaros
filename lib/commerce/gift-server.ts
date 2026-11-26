import "server-only";

import type Stripe from "stripe";
import { Resend } from "resend";

import { buildCheckoutAnalyticsMetadata } from "@/lib/analytics/checkout-events-core";
import type { CheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import { BRAND } from "@/lib/brand";
import { formatUsd, getCommerceTier, parseCommerceTierKey } from "@/lib/commerce/config";
import {
  buildGiftEntitlementWindow,
  generateGiftCode,
  GIFT_PURCHASE_KIND,
  normalizeGiftCode,
  type GiftCheckoutInput,
  type GiftPreview,
} from "@/lib/commerce/gift";
import { getPlannerYearWithOverride } from "@/lib/commerce/planner-year";
import { getStripeClient } from "@/lib/commerce/stripe";
import { giftPurchaseEmail } from "@/lib/email/gift-templates";
import { createAdminSupabase } from "@/lib/supabase/admin";

const FROM = "Kairos <hello@kairosplanner.xyz>";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3699";
}

export function giftRedeemUrl(code: string) {
  return `${getAppUrl()}/gift/redeem?code=${encodeURIComponent(code)}`;
}

function getStripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function isGiftCheckoutSession(session: Pick<Stripe.Checkout.Session, "metadata">) {
  return session.metadata?.purchase_kind === GIFT_PURCHASE_KIND;
}

// ─── Checkout ──────────────────────────────────────────────────────────────

/**
 * One-time payment for a year of Kairos as a gift. No account needed: the
 * buyer may not be a member, and Stripe collects their email. The names and
 * note ride along in session metadata and are copied into gift_purchases
 * when the payment lands.
 */
export async function createGiftCheckoutSession(params: {
  input: GiftCheckoutInput;
  checkoutAttemptId: string;
  customerEmail?: string | null;
  funnelContext?: CheckoutFunnelContext | null;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const tier = getCommerceTier(params.input.tierKey);

  const metadata: Record<string, string> = {
    ...buildCheckoutAnalyticsMetadata(params.checkoutAttemptId, params.funnelContext ?? null),
    purchase_kind: GIFT_PURCHASE_KIND,
    gift_tier: tier.key,
    gift_oracle_enabled: String(tier.oracleEnabled),
  };
  // Stripe caps each metadata value at 500 characters.
  if (params.input.purchaserName) metadata.gift_from = params.input.purchaserName;
  if (params.input.recipientName) metadata.gift_to = params.input.recipientName;
  if (params.input.giftMessage) {
    // Split the note across keys so a 600-character note survives the 500 cap.
    const note = params.input.giftMessage;
    metadata.gift_note_1 = note.slice(0, 450);
    if (note.length > 450) metadata.gift_note_2 = note.slice(450);
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    billing_address_collection: "auto",
    customer_creation: "always",
    ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
    allow_promotion_codes: true,
    success_url: `${appUrl}/gift/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/gift?canceled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: tier.annualPriceCents,
          product_data: {
            name: `A year of ${tier.name} (gift)`,
            description: `A gift of one full year of ${tier.name}. You'll get a gift code and a link to pass on. It doesn't renew.`,
            metadata: { purchase_kind: GIFT_PURCHASE_KIND, gift_tier: tier.key },
          },
        },
      },
    ],
    payment_intent_data: {
      description: `${tier.name} gift, one year`,
      metadata,
    },
    custom_text: {
      submit: {
        message: `A one-time payment of ${formatUsd(tier.annualPriceCents)} for one year of ${tier.name}. It doesn't renew. You'll get the gift code right after checkout and by email.`,
      },
    },
    metadata,
  });
}

// ─── Fulfillment ───────────────────────────────────────────────────────────

type GiftRow = {
  id: string;
  code: string;
  status: string;
  product_tier: string;
  oracle_enabled: boolean;
  purchaser_email: string;
  purchaser_name: string | null;
  recipient_name: string | null;
  gift_message: string | null;
  buyer_email_sent_at: string | null;
  redeemed_user_id: string | null;
};

const GIFT_COLUMNS =
  "id, code, status, product_tier, oracle_enabled, purchaser_email, purchaser_name, recipient_name, gift_message, buyer_email_sent_at, redeemed_user_id";

function readGiftNote(metadata: Stripe.Metadata | null) {
  const note = `${metadata?.gift_note_1 ?? ""}${metadata?.gift_note_2 ?? ""}`.trim();
  return note || null;
}

/**
 * Records a paid gift and emails the buyer their code. Safe to call more
 * than once for the same session (webhook and success page both call it):
 * the code is minted once and the email is sent once.
 */
export async function fulfillGiftCheckout(sessionOrId: string | Stripe.Checkout.Session) {
  const session =
    typeof sessionOrId === "string"
      ? await getStripeClient().checkout.sessions.retrieve(sessionOrId)
      : sessionOrId;

  if (!isGiftCheckoutSession(session)) {
    throw new Error("This checkout session is not a gift.");
  }
  if (session.payment_status !== "paid") {
    throw new Error("This gift hasn't been paid for yet.");
  }

  const tierKey = parseCommerceTierKey(session.metadata?.gift_tier);
  if (!tierKey) {
    throw new Error("The gift checkout is missing its plan.");
  }
  const tier = getCommerceTier(tierKey);

  const supabase = createAdminSupabase();
  let gift = await loadGiftBySession(session.id);

  if (!gift) {
    const purchaserEmail = session.customer_details?.email ?? session.customer_email;
    if (!purchaserEmail) {
      throw new Error("The gift checkout is missing the buyer's email.");
    }

    // A code collision is astronomically unlikely, but retry rather than fail a paid order.
    for (let attempt = 0; attempt < 3 && !gift; attempt++) {
      const { data, error } = await supabase
        .from("gift_purchases")
        .insert({
          code: generateGiftCode(),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: getStripeId(session.payment_intent as string | { id: string } | null),
          stripe_customer_id: getStripeId(session.customer as string | { id: string } | null),
          purchaser_email: purchaserEmail.trim().toLowerCase(),
          purchaser_name: session.metadata?.gift_from ?? null,
          recipient_name: session.metadata?.gift_to ?? null,
          gift_message: readGiftNote(session.metadata),
          product_tier: tier.key,
          oracle_enabled: tier.oracleEnabled,
          amount_total_cents: session.amount_total ?? tier.annualPriceCents,
          currency: session.currency ?? "usd",
          status: "paid",
          purchased_at: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
          metadata: { checkout_session_id: session.id },
        })
        .select(GIFT_COLUMNS)
        .single();

      if (data) {
        gift = data as GiftRow;
        break;
      }
      // 23505 = unique violation: either the webhook and the success page raced
      // on the session id (load the winner), or the code collided (try again).
      if (error?.code === "23505") {
        gift = await loadGiftBySession(session.id);
        continue;
      }
      throw new Error("We couldn't save your gift yet. Please refresh in a moment.");
    }
  }

  if (!gift) {
    throw new Error("We couldn't save your gift yet. Please refresh in a moment.");
  }

  if (!gift.buyer_email_sent_at) {
    await sendGiftBuyerEmail(gift).catch((error) =>
      console.error("[gift] Buyer email failed (code still shown on the success page):", error),
    );
  }

  return { gift, tier };
}

async function loadGiftBySession(sessionId: string): Promise<GiftRow | null> {
  const { data } = await createAdminSupabase()
    .from("gift_purchases")
    .select(GIFT_COLUMNS)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return (data as GiftRow | null) ?? null;
}

async function sendGiftBuyerEmail(gift: GiftRow) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[gift] RESEND_API_KEY is not set; skipping the buyer email.");
    return;
  }

  const supabase = createAdminSupabase();
  // Claim the send first so two concurrent fulfillments don't both email.
  const { data: claimed } = await supabase
    .from("gift_purchases")
    .update({ buyer_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", gift.id)
    .is("buyer_email_sent_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  const tierKey = parseCommerceTierKey(gift.product_tier) ?? "planner";
  const content = giftPurchaseEmail({
    code: gift.code,
    redeemUrl: giftRedeemUrl(gift.code),
    tierName: getCommerceTier(tierKey).name,
    recipientName: gift.recipient_name,
    purchaserName: gift.purchaser_name,
  });

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM,
    to: gift.purchaser_email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (error) {
    // Release the claim so a later retry (success page refresh) can send it.
    await supabase.from("gift_purchases").update({ buyer_email_sent_at: null }).eq("id", gift.id);
    throw new Error(error.message);
  }
}

// ─── Lookup ────────────────────────────────────────────────────────────────

export async function loadGiftPreview(rawCode: string | null | undefined): Promise<GiftPreview | null> {
  const code = normalizeGiftCode(rawCode);
  if (!code) return null;

  const { data } = await createAdminSupabase()
    .from("gift_purchases")
    .select(GIFT_COLUMNS)
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;

  const gift = data as GiftRow;
  const tierKey = parseCommerceTierKey(gift.product_tier) ?? "planner";
  return {
    code: gift.code,
    status: gift.status as GiftPreview["status"],
    tierKey,
    tierName: getCommerceTier(tierKey).name,
    oracleEnabled: gift.oracle_enabled,
    purchaserName: gift.purchaser_name,
    recipientName: gift.recipient_name,
    giftMessage: gift.gift_message,
  };
}

// ─── Redemption ────────────────────────────────────────────────────────────

export type RedeemGiftResult =
  | {
      success: true;
      data: {
        tierName: string;
        oracleEnabled: boolean;
        startsAt: string;
        endsAt: string;
        startsLater: boolean;
        isReturningMember: boolean;
        profileSetupComplete: boolean;
      };
    }
  | { success: false; error: string; status: number };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dayAfter(isoDate: string) {
  const next = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * Puts a gift on the signed-in member's account.
 *
 * The gift year starts today. If the member already has a paid year running
 * (not monthly), the gift starts the day after that year ends, so it adds a
 * year instead of overlapping one.
 */
export async function redeemGift(params: { clerkUserId: string; rawCode: string }): Promise<RedeemGiftResult> {
  const code = normalizeGiftCode(params.rawCode);
  if (!code) {
    return { success: false, error: "That doesn't look like a gift code. It should look like KAIROS-XXXX-XXXX-XXXX.", status: 400 };
  }

  const supabase = createAdminSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, onboarding_completed_at, profile_setup_completed_at")
    .eq("clerk_user_id", params.clerkUserId)
    .maybeSingle();
  if (!profile) {
    return { success: false, error: `Your ${BRAND.product} account is still being set up. Please try again in a moment.`, status: 409 };
  }

  const { data: giftData } = await supabase
    .from("gift_purchases")
    .select(GIFT_COLUMNS)
    .eq("code", code)
    .maybeSingle();
  const gift = giftData as GiftRow | null;
  if (!gift) {
    return { success: false, error: "We couldn't find a gift with that code. Please check it and try again.", status: 404 };
  }
  if (gift.status === "refunded" || gift.status === "voided") {
    return { success: false, error: "This gift is no longer active. If that looks wrong, please contact us.", status: 409 };
  }

  const tierKey = parseCommerceTierKey(gift.product_tier) ?? "planner";
  const tier = getCommerceTier(tierKey);

  if (gift.status === "redeemed") {
    if (gift.redeemed_user_id !== profile.id) {
      return { success: false, error: "This gift has already been redeemed on another account.", status: 409 };
    }
    // Same member redeeming twice (double click, refresh): answer with what they have.
    const { data: existing } = await supabase
      .from("product_entitlements")
      .select("starts_at, ends_at")
      .eq("source", "gift")
      .eq("source_order_id", gift.id)
      .maybeSingle();
    if (existing) {
      return {
        success: true,
        data: {
          tierName: tier.name,
          oracleEnabled: gift.oracle_enabled,
          startsAt: existing.starts_at,
          endsAt: existing.ends_at,
          startsLater: existing.starts_at > todayISO(),
          isReturningMember: !!profile.onboarding_completed_at,
          profileSetupComplete: !!profile.profile_setup_completed_at,
        },
      };
    }
    // Redeemed but the entitlement is missing (an earlier attempt failed halfway): fall through and grant it.
  }

  // Start after any paid year already running, so the gift adds time.
  const today = todayISO();
  const { data: running } = await supabase
    .from("product_entitlements")
    .select("ends_at, access_plan, source, source_order_id")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .eq("access_plan", "yearly")
    .gte("ends_at", today)
    .order("ends_at", { ascending: false });
  const latestRunningEnd = (running ?? []).find(
    (row) => !(row.source === "gift" && row.source_order_id === gift.id),
  )?.ends_at;
  const startDate = latestRunningEnd ? dayAfter(latestRunningEnd) : today;
  const window = buildGiftEntitlementWindow(startDate);

  // Claim the gift atomically: only one account can move it from paid to redeemed.
  if (gift.status === "paid") {
    const { data: claimed } = await supabase
      .from("gift_purchases")
      .update({
        status: "redeemed",
        redeemed_user_id: profile.id,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", gift.id)
      .eq("status", "paid")
      .select("id")
      .maybeSingle();
    if (!claimed) {
      return { success: false, error: "This gift was just redeemed. If that wasn't you, please contact us.", status: 409 };
    }
  }

  const { error: entitlementError } = await supabase.from("product_entitlements").upsert(
    {
      user_id: profile.id,
      source: "gift",
      source_order_id: gift.id,
      product_tier: tier.key,
      planner_year: getPlannerYearWithOverride(new Date(`${window.startsAt}T12:00:00Z`)),
      oracle_enabled: gift.oracle_enabled,
      access_plan: "yearly",
      starts_at: window.startsAt,
      ends_at: window.endsAt,
      status: "active",
    },
    { onConflict: "source,source_order_id" },
  );

  if (entitlementError) {
    console.error("[gift] Entitlement grant failed; releasing the gift:", entitlementError.message);
    await supabase
      .from("gift_purchases")
      .update({ status: "paid", redeemed_user_id: null, redeemed_at: null, updated_at: new Date().toISOString() })
      .eq("id", gift.id)
      .eq("redeemed_user_id", profile.id);
    return { success: false, error: "We couldn't add your gift yet. Please try again in a moment.", status: 500 };
  }

  await supabase
    .from("preview_access")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("user_id", profile.id);

  return {
    success: true,
    data: {
      tierName: tier.name,
      oracleEnabled: gift.oracle_enabled,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      startsLater: window.startsAt > today,
      isReturningMember: !!profile.onboarding_completed_at,
      profileSetupComplete: !!profile.profile_setup_completed_at,
    },
  };
}
