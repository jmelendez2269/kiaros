import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const user = await currentUser();
  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminSupabase();

  const { data: profiles, error } = await admin
    .from("user_profiles")
    .select("id, display_name, email, tradition, plan_year, onboarding_completed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ users: [] });
  }

  const userIds = profiles.map((p) => p.id);

  // Fetch latest blueprint per user in one query
  const { data: blueprints } = await admin
    .from("blueprints")
    .select("user_id, status, version, updated_at")
    .in("user_id", userIds)
    .order("version", { ascending: false });

  // Keep only the highest-version blueprint per user
  const latestByUser = new Map<string, { status: string; version: number; updated_at: string }>();
  for (const bp of blueprints ?? []) {
    if (!latestByUser.has(bp.user_id)) {
      latestByUser.set(bp.user_id, {
        status: bp.status,
        version: bp.version,
        updated_at: bp.updated_at,
      });
    }
  }

  const users = profiles.map((p) => ({
    id: p.id,
    displayName: p.display_name,
    email: p.email,
    tradition: p.tradition,
    planYear: p.plan_year,
    onboardingCompleted: !!p.onboarding_completed_at,
    blueprint: latestByUser.get(p.id) ?? null,
  }));

  return NextResponse.json({ users });
}
