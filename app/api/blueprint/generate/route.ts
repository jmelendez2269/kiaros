import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { runBlueprintGeneration } from "@/lib/ai/blueprint-generator";

// Blueprint generation calls Claude with a large prompt — 5+ minutes is normal.
// after() runs within this window, so it must be large enough for the full AI call.
export const maxDuration = 300;

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const plan_year = profile.plan_year ?? new Date().getFullYear();

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
