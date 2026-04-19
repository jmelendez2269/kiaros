import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

async function resetOnboardingFull() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabase();
    const planYear = new Date().getFullYear();

    await (await clerkClient()).users.updateUser(userId, {
      publicMetadata: { onboardingCompleted: false },
    });

    const { data: profile } = await admin
      .from("user_profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (profile?.id) {
      await admin
        .from("blueprints")
        .delete()
        .eq("user_id", profile.id)
        .eq("plan_year", planYear);

      await admin
        .from("ephemeris_cache")
        .delete()
        .eq("user_id", profile.id)
        .eq("year", planYear);

      await admin
        .from("user_profiles")
        .update({ onboarding_completed_at: null })
        .eq("id", profile.id);
    }

    return NextResponse.json({ success: true, clearedPlanYear: planYear });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reset-onboarding-full] Failed:", message);
    return NextResponse.json({ error: "Failed to fully reset onboarding" }, { status: 500 });
  }
}

export async function GET() {
  return resetOnboardingFull();
}

export async function POST() {
  return resetOnboardingFull();
}
