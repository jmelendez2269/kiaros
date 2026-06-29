import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = createAdminSupabase();

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("id, plan_year, onboarding_completed_at")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[status] Profile lookup failed:", profileError);
      return NextResponse.json({ status: "error" });
    }

    const plan_year = profile.plan_year ?? new Date().getFullYear();

    const { data: blueprint, error: blueprintError } = await admin
      .from("blueprints")
      .select("status, id, error_message")
      .eq("user_id", profile.id)
      .eq("plan_year", plan_year)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (blueprintError) {
      console.error("[status] Blueprint query failed:", blueprintError);
      return NextResponse.json({ status: "error" });
    }

    if (!blueprint) {
      console.warn("[status] No blueprint found for user:", profile.id, "year:", plan_year);
      return NextResponse.json({ status: "error", error: "Blueprint not found" });
    }

    // Recovery: if the generator set the blueprint to ready but failed to update
    // onboarding_completed_at, fix it here so the user isn't stuck in onboarding.
    if (blueprint.status === "ready" && !profile.onboarding_completed_at) {
      await admin
        .from("user_profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", profile.id);
    }

    return NextResponse.json({ status: blueprint.status, error: blueprint.error_message ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[status] Unexpected error:", message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
