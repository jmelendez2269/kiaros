import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!profile?.id) return NextResponse.json({ status: "missing" }, { status: 404 });

  const { data: preview } = await admin
    .from("week_previews")
    .select("status, error_message")
    .eq("user_id", profile.id)
    .maybeSingle();

  return NextResponse.json(
    preview
      ? { status: preview.status, error: preview.error_message }
      : { status: "missing", error: null }
  );
}
