import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { runBlueprintGeneration } from "@/lib/ai/blueprint-generator";
import { requireActivePlannerAccess } from "@/lib/commerce/access";
import { 
  resolveUserAccess, 
  loadOrderSubscriptionMap,
  extractStripeOrderIds,
  type ProductEntitlementRecord 
} from "@/lib/commerce/entitlements";
import { getPlannerYearWithOverride } from "@/lib/commerce/planner-year";

// Blueprint generation calls Claude with a large prompt — 5+ minutes is normal.
// after() runs within this window, so it must be large enough for the full AI call.
export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessError = await requireActivePlannerAccess(userId);
  if (accessError) return accessError;

  try {
    // Use admin client for all DB access in this route — avoids RLS/token
    // fragility on the critical generation path. userId comes from Clerk auth.
    const admin = createAdminSupabase();

    // Get user's Supabase UUID
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("id, plan_year")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[generate] Profile lookup failed:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Parse optional planYear from request body
    let requestedYear: number | undefined;
    try {
      const body = await request.json();
      if (body.planYear !== undefined) {
        // Validate that planYear is an integer
        const parsed = Number(body.planYear);
        if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 3000) {
          return NextResponse.json(
            { error: "planYear must be a valid year between 2000 and 3000" },
            { status: 400 }
          );
        }
        requestedYear = parsed;
      }
    } catch {
      // No body or invalid JSON - that's fine, we'll use defaults
    }

    // Use consistent asOf time for all capability checks
    const asOf = new Date();

    // Load user's entitlements to determine which years they can generate
    const { data: entitlements } = await admin
      .from("product_entitlements")
      .select("id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan")
      .eq("user_id", profile.id)
      .neq("status", "revoked");

    // Load subscription info for Stripe entitlements
    const orderIds = extractStripeOrderIds(entitlements ?? []);
    const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profile.id });

    const access = resolveUserAccess(
      (entitlements ?? []) as ProductEntitlementRecord[],
      asOf,
      undefined,
      subscriptionMap
    );
    const accessibleYears = [
      ...access.capabilities.blueprintFullAccessYears,
      ...access.capabilities.blueprintWindowedAccessYears,
    ];

    // Determine which year to generate
    let plan_year: number;
    const currentPlannerYear = getPlannerYearWithOverride(asOf);

    if (requestedYear) {
      // User explicitly requested a year - validate it
      if (!accessibleYears.includes(requestedYear)) {
        return NextResponse.json(
          { error: `You don't have access to generate a blueprint for ${requestedYear}` },
          { status: 403 }
        );
      }
      plan_year = requestedYear;
    } else if (accessibleYears.includes(currentPlannerYear)) {
      // Default to current planner year if accessible
      plan_year = currentPlannerYear;
    } else if (accessibleYears.length > 0) {
      // Fall back to the latest accessible year that is at or before current planner year
      const validYears = accessibleYears.filter(y => y <= currentPlannerYear);
      plan_year = validYears.length > 0 
        ? Math.max(...validYears)
        : Math.max(...accessibleYears);
    } else {
      // Shouldn't happen if requireActivePlannerAccess passed, but be safe
      plan_year = profile.plan_year ?? currentPlannerYear;
    }

    const { data: existing } = await admin
      .from("blueprints")
      .select("id, status")
      .eq("user_id", profile.id)
      .eq("plan_year", plan_year)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.status === "generating" || existing?.status === "ready") {
      return NextResponse.json({
        blueprintId: existing.id,
        status: existing.status,
        alreadyExists: true,
      });
    }

    // Compute next version number
    const { data: latest } = await admin
      .from("blueprints")
      .select("version")
      .eq("user_id", profile.id)
      .eq("plan_year", plan_year)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const version = (latest?.version ?? 0) + 1;

    // Insert blueprint row with status=generating
    const { data: blueprint, error: insertError } = await admin
      .from("blueprints")
      .insert({ user_id: profile.id, plan_year, version, status: "generating" })
      .select("id")
      .single();

    if (insertError || !blueprint) {
      console.error("[generate] Blueprint insert failed:", insertError);
      return NextResponse.json({ error: "Failed to create blueprint record" }, { status: 500 });
    }

    // onboarding_completed_at is set by runBlueprintGeneration on success,
    // not here — otherwise a failed generation locks the user out of /onboarding
    // while leaving them with no ready blueprint on /dashboard.

    // Run generation in the background after this response is sent.
    // after() is a Next.js 15 primitive that runs the callback post-response.
    after(() =>
      runBlueprintGeneration({
        blueprintId: blueprint.id,
        userId: profile.id,
        planYear: plan_year,
      })
    );

    return NextResponse.json({ blueprintId: blueprint.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] Unexpected error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
