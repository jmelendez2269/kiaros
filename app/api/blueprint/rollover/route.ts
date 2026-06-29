import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { runBlueprintGeneration } from "@/lib/ai/blueprint-generator";
import { resolveUserAccess, type ProductEntitlementRecord } from "@/lib/commerce/entitlements";

// Same budget as the initial generate route — full AI generation runs in after().
export const maxDuration = 300;

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const currentYear = new Date().getFullYear();

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id, plan_year")
    .eq("clerk_user_id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify the user still has an active entitlement (monthly sub still paying).
  const { data: entitlements } = await admin
    .from("product_entitlements")
    .select("id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan")
    .eq("user_id", profile.id)
    .neq("status", "revoked");

  const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[]);
  if (!access.hasPlannerAccess) {
    return NextResponse.json({ error: "No active planner access." }, { status: 403 });
  }

  // Idempotent: if a blueprint for the current year already exists (generating or ready),
  // return it immediately so the polling page can pick up where it left off.
  const { data: existing } = await admin
    .from("blueprints")
    .select("id, status")
    .eq("user_id", profile.id)
    .eq("plan_year", currentYear)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ blueprintId: existing.id, alreadyExists: true });
  }

  // Advance the profile's plan_year so the status route and rest of the app
  // all read 2027 (or whatever currentYear is) going forward.
  await admin
    .from("user_profiles")
    .update({ plan_year: currentYear })
    .eq("id", profile.id);

  const { data: blueprint, error: insertError } = await admin
    .from("blueprints")
    .insert({ user_id: profile.id, plan_year: currentYear, version: 1, status: "generating" })
    .select("id")
    .single();

  if (insertError || !blueprint) {
    console.error("[rollover] Blueprint insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create blueprint record" }, { status: 500 });
  }

  after(() =>
    runBlueprintGeneration({
      blueprintId: blueprint.id,
      userId: profile.id,
      planYear: currentYear,
    })
  );

  return NextResponse.json({ blueprintId: blueprint.id });
}
