import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = await createServerSupabase();
    const plan_year = new Date().getFullYear();

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[status] Profile lookup failed:", profileError);
      return NextResponse.json({ status: "error" });
    }

    const { data: blueprint, error: blueprintError } = await supabase
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

    return NextResponse.json({ status: blueprint.status, error: blueprint.error_message ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[status] Unexpected error:", message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
