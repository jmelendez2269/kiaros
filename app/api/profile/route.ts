import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { deriveAstrologicalYearWord } from "@/lib/astrology/year-word";
import { computeNatalChart } from "@/lib/ephemeris";
import type { BirthData } from "@/lib/ephemeris";
import type { HouseSystem, NatalChart } from "@/types/blueprint";
import { computeHumanDesign } from "@/lib/human-design";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("display_name, theme, birth_date, birth_time, birth_time_unknown, birth_city, birth_tz, natal_chart, plan_year, word_of_year, year_vision, what_to_release, study_focus, tradition, house_system")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const astrologicalWord = deriveAstrologicalYearWord({
    birthDate: profile?.birth_date,
    natalChart: (profile?.natal_chart as NatalChart | null) ?? null,
    planYear: profile?.plan_year ?? new Date().getFullYear(),
  });

  return NextResponse.json({
    profile,
    astrological_word_of_year: astrologicalWord,
  });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminSupabase();

  // Ensure a profile row exists (webhook may not have fired in local dev).
  // Fetch email from Clerk so we can populate it on first insert.
  let email: string | undefined;
  try {
    const clerkUser = await (await clerkClient()).users.getUser(userId);
    email = clerkUser.emailAddresses?.[0]?.emailAddress;
  } catch (err) {
    console.error("[profile] Clerk user lookup failed:", err);
  }

  // Only include email in the upsert when we have it — undefined is dropped by
  // JSON serialisation so existing rows are updated safely without touching email,
  // but a missing-webhook first-insert will fail at the DB NOT NULL constraint
  // and return 500 to the client rather than silently saving nothing.
  const upsertPayload = email
    ? { clerk_user_id: userId, email, ...body }
    : { clerk_user_id: userId, ...body };

  const { error } = await admin
    .from("user_profiles")
    .upsert(upsertPayload, { onConflict: "clerk_user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Persist theme in a cookie so the root layout can apply it server-side.
  const response = NextResponse.json({ success: true });
  if (typeof body.theme === "string") {
    response.cookies.set("kiaros-theme", body.theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Recompute natal chart when birth data or house system changes.
  const birthFields = ["birth_date", "birth_lat", "birth_lng", "birth_time", "birth_tz", "birth_time_unknown"];
  const chartTriggerFields = [...birthFields, "house_system"];
  const touchesChart = chartTriggerFields.some((f) => f in body);

  if (touchesChart) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng, house_system")
      .eq("clerk_user_id", userId)
      .single();

    if (profile?.birth_date && profile?.birth_lat != null && profile?.birth_lng != null) {
      const birthData: BirthData = {
        date: profile.birth_date,
        time: profile.birth_time ?? null,
        timezone: profile.birth_tz ?? null,
        lat: profile.birth_lat,
        lng: profile.birth_lng,
        timeUnknown: profile.birth_time_unknown ?? false,
      };

      try {
        const houseSystem = (profile.house_system ?? "whole_sign") as HouseSystem;
        const natalChart = computeNatalChart(birthData, houseSystem);
        await admin
          .from("user_profiles")
          .update({ natal_chart: natalChart as unknown as Record<string, unknown> })
          .eq("clerk_user_id", userId);
      } catch (chartErr) {
        // Non-fatal: natal chart computation is best-effort at this stage.
        console.error("[profile] natal chart computation failed:", chartErr);
      }

      try {
        const humanDesign = computeHumanDesign(profile);
        if (humanDesign) {
          await admin
            .from("user_profiles")
            .update({ human_design: humanDesign as unknown as Record<string, unknown> })
            .eq("clerk_user_id", userId);
        }
      } catch (hdErr) {
        // Non-fatal: HD is supplementary to the natal chart. Surface in UI
        // as "not yet computed" rather than blocking profile save.
        console.error("[profile] human design computation failed:", hdErr);
      }
    }
  }

  return response;
}
