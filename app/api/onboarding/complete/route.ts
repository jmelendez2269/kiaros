import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  resolveUserAccess,
  type ProductEntitlementRecord,
} from "@/lib/commerce/entitlements";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .update({ profile_setup_completed_at: new Date().toISOString() })
    .eq("clerk_user_id", userId)
    .select("id")
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

  const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[]);
  return NextResponse.json({
    destination: access.hasPlannerAccess
      ? "/onboarding/generating"
      : "/onboarding/generating-week",
  });
}
