import { after, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { runWeekPreviewGeneration } from "@/lib/ai/week-preview-generator";

export const maxDuration = 180;

function currentWeek() {
  const today = new Date();
  const day = today.getUTCDay();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
  };
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, profile_setup_completed_at, natal_chart")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!profile?.id || !profile.profile_setup_completed_at || !profile.natal_chart) {
    return NextResponse.json(
      { error: "Complete your profile before generating a personal week." },
      { status: 409 }
    );
  }

  const { data: existing } = await admin
    .from("week_previews")
    .select("id, status")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ previewId: existing.id, status: existing.status });
  }

  const { startDate, endDate } = currentWeek();
  const { data: preview, error } = await admin
    .from("week_previews")
    .insert({
      user_id: profile.id,
      start_date: startDate,
      end_date: endDate,
      status: "generating",
    })
    .select("id")
    .single();

  if (error || !preview) {
    return NextResponse.json({ error: "The preview could not be started." }, { status: 500 });
  }

  await admin.from("preview_access").upsert(
    {
      user_id: profile.id,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id" }
  );

  after(() => runWeekPreviewGeneration({ previewId: preview.id, userId: profile.id }));
  return NextResponse.json({ previewId: preview.id, status: "generating" });
}
