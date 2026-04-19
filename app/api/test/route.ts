/**
 * GET /api/test - Quick RLS + Supabase connectivity check
 * This is a Phase 1 smoke test only. Remove before Phase 2.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("clerk_user_id")
      .limit(1);

    if (error) {
      return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, userId });
  } catch (err) {
    return NextResponse.json(
      { error: `Test failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
