import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const plan_year = new Date().getFullYear();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: blueprint } = await admin
    .from("blueprints")
    .select("*")
    .eq("user_id", profile.id)
    .eq("plan_year", plan_year)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(blueprint || { message: "No blueprint found" });
}
