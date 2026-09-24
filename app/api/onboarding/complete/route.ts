import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  resolveUserAccess,
  loadOrderSubscriptionMap,
  extractStripeOrderIds,
  type ProductEntitlementRecord,
} from "@/lib/commerce/entitlements";

type CompleteOnboardingBody = {
  stage?: "chart_foundation";
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CompleteOnboardingBody;
  const admin = createAdminSupabase();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile setup could not be completed." }, { status: 500 });
  }

  const { data: entitlements } = await admin
    .from("product_entitlements")
    .select(
      "id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan"
    )
    .eq("user_id", profile.id)
    .neq("status", "revoked");

  // Load subscription info for Stripe entitlements
  const orderIds = extractStripeOrderIds(entitlements ?? []);
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profile.id });

  const access = resolveUserAccess(
    (entitlements ?? []) as ProductEntitlementRecord[],
    undefined,
    undefined,
    subscriptionMap
  );

  // Paid customers continue into the intent/customization layers. Limited-reading
  // accounts stop after birth data so their artifact is genuinely chart-only.
  if (body.stage === "chart_foundation" && access.hasPlannerAccess) {
    return NextResponse.json({ destination: "/onboarding/tradition" });
  }

  const { error: completionError } = await admin
    .from("user_profiles")
    .update({ profile_setup_completed_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (completionError) {
    return NextResponse.json({ error: "Profile setup could not be completed." }, { status: 500 });
  }

  return NextResponse.json({
    destination: access.hasPlannerAccess
      ? "/onboarding/generating"
      : "/onboarding/generating-week",
  });
}
