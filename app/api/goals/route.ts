import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

interface GoalCategory {
  name: string;
  description?: string;
  success?: string;
  icon_key?: string;
  color_key?: string;
  sort_order: number;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categories }: { categories: GoalCategory[] } = await req.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ error: "categories required" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Get the user's UUID from user_profiles
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (profileError || !profile) {
    console.error("[goals] Profile not found for clerk user:", userId, profileError);
    return NextResponse.json({ error: "Profile not found - ensure onboarding step 1 completed" }, { status: 404 });
  }

  // Delete existing categories then re-insert (clean replace)
  await admin.from("goal_categories").delete().eq("user_id", profile.id);

  const rows = categories.map((c) => ({ ...c, user_id: profile.id }));
  const { error } = await admin.from("goal_categories").insert(rows);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
