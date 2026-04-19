import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

async function resetOnboarding() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await (await clerkClient()).users.updateUser(userId, {
      publicMetadata: { onboardingCompleted: false },
    });

    const admin = createAdminSupabase();
    await admin
      .from("user_profiles")
      .update({ onboarding_completed_at: null })
      .eq("clerk_user_id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reset-onboarding] Failed:", message);
    return NextResponse.json({ error: "Failed to reset onboarding" }, { status: 500 });
  }
}

export async function POST() {
  return resetOnboarding();
}

export async function GET() {
  return resetOnboarding();
}
