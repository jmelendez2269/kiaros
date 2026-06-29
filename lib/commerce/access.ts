import "server-only";

import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { resolveUserAccess, type ProductEntitlementRecord } from "./entitlements";

/**
 * Call at the top of any write route that requires an active planner subscription.
 * Returns a 403 NextResponse if the user's entitlement has expired or doesn't exist,
 * null if they're allowed to proceed.
 *
 * Read routes (GET) do not need this — expired annual users keep read access to
 * their blueprint, journal history, and tracker logs.
 */
export async function requireActivePlannerAccess(clerkUserId: string): Promise<NextResponse | null> {
  const admin = createAdminSupabase();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: entitlements } = await admin
    .from("product_entitlements")
    .select("id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan")
    .eq("user_id", profile.id)
    .neq("status", "revoked");

  const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[]);

  if (!access.hasPlannerAccess) {
    return NextResponse.json(
      { error: "active_planner_required", message: "An active planner subscription is required to create new content." },
      { status: 403 }
    );
  }

  return null;
}
