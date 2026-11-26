import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCommerceTier, parseCommerceTierKey } from "@/lib/commerce/config";
import { getStripeClient } from "@/lib/commerce/stripe";
import { loadSeason, loadSeasonRecords, type Season, type SeasonRecords } from "@/lib/season/load";
import { SwitchError, switchSubscriptionToYearly, type SwitchResult, type SwitchStripe } from "@/lib/season/switch-billing";
import { switchedEntitlementWindow } from "@/lib/season/turn-of-year";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Switch the member's monthly subscription to yearly, today. Charges the
 * yearly price less what they already paid this month, on the card Stripe
 * already holds. The member confirms the amount on the card before this is
 * called, and sends it back as `dueTodayCents` so a changed amount stops here.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { dueTodayCents?: unknown };

  const admin = createAdminSupabase();
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (profileError || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let season: Season;
  let records: SeasonRecords;
  try {
    [season, records] = await Promise.all([loadSeason(profile.id), loadSeasonRecords(profile.id)]);
  } catch {
    return NextResponse.json({ error: "Your membership couldn't be read just now. Please try again." }, { status: 503 });
  }

  const offer = season.switchOffer;
  const tierKey = offer ? parseCommerceTierKey(offer.productTier) : null;
  if (!offer || !tierKey) {
    return NextResponse.json({ error: "There's no monthly membership to switch." }, { status: 409 });
  }
  if (Number(body.dueTodayCents) !== offer.dueTodayCents) {
    return NextResponse.json(
      { error: "The amount has changed since you opened this page. Please reload and check it again.", dueTodayCents: offer.dueTodayCents },
      { status: 409 }
    );
  }

  const entitlement = records.entitlements.find((e) => e.id === offer.entitlementId);
  const order = entitlement?.source_order_id ? records.orders.get(entitlement.source_order_id) : undefined;
  if (!entitlement || !order?.stripe_subscription_id) {
    return NextResponse.json({ error: "There's no monthly membership to switch." }, { status: 409 });
  }

  const tier = getCommerceTier(tierKey);
  let result: SwitchResult;
  try {
    result = await switchSubscriptionToYearly({
      stripe: getStripeClient() as unknown as SwitchStripe,
      subscriptionId: order.stripe_subscription_id,
      offer,
      tierName: tier.name,
      today: season.today,
    });
  } catch (error) {
    if (error instanceof SwitchError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[switch-to-yearly] Stripe update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The switch didn't go through, and you're still on monthly. Please check your card and try again." },
      { status: 402 }
    );
  }

  // Record the switch so access reads as yearly from today. The Stripe webhook
  // that follows reads access_plan from this order, so update the order first.
  const window = switchedEntitlementWindow({ today: season.today, stripePeriodEnd: result.periodEnd });
  const orderMetadata = typeof order.metadata === "object" && order.metadata ? order.metadata : {};
  const { error: orderError } = await admin
    .from("direct_purchase_orders")
    .update({
      access_plan: "yearly",
      metadata: {
        ...orderMetadata,
        access_plan: "yearly",
        switched_from_monthly_on: season.today,
        switch_credit_cents: offer.creditCents,
      },
    })
    .eq("id", order.id);
  const { error: entitlementError } = await admin
    .from("product_entitlements")
    .update(window)
    .eq("id", entitlement.id);

  if (orderError || entitlementError) {
    console.error("[switch-to-yearly] Switched in Stripe but the record failed:", orderError?.message, entitlementError?.message);
    return NextResponse.json(
      { error: "Your switch went through, but your access is still updating. Refresh in a minute.", switched: true },
      { status: 500 }
    );
  }

  return NextResponse.json({ switched: true, alreadyYearly: result.alreadyYearly, endsOn: window.ends_at });
}
