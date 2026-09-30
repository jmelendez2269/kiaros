import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { guardDebugRoute } from "@/lib/debug/guard";

export async function GET() {
  const guardResponse = await guardDebugRoute();
  if (guardResponse) return guardResponse;

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
    .select("id, plan_year, version, status, error_message, generated_at, created_at")
    .eq("user_id", profile.id)
    .eq("plan_year", plan_year)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(blueprint || { message: "No blueprint found" });
}
