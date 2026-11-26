import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";

import { runBlueprintGeneration } from "@/lib/ai/blueprint-generator";
import { loadSeason, type Season } from "@/lib/season/load";
import { nextBlueprintVersion } from "@/lib/season/turn-of-year";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isMockTodayDateAllowed, parseMockTodayDateParam } from "@/lib/today/mock-today-date";

// Full AI generation runs in after(), as in the generate and rollover routes.
export const maxDuration = 300;

/**
 * Write next year's Blueprint ahead of the turn of the year, or write it again
 * before the year begins. Each write is a new version (MAX + 1); the newest
 * ready version is the one shown. The profile's plan_year is left alone: it
 * moves on December 1 (see app/(app)/layout.tsx).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { year?: unknown; mockToday?: unknown };
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return NextResponse.json({ error: "Choose a year to write." }, { status: 400 });
  }
  const mockToday =
    isMockTodayDateAllowed() && typeof body.mockToday === "string" ? parseMockTodayDateParam(body.mockToday) : null;

  const admin = createAdminSupabase();
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const clerkUser = await currentUser().catch(() => null);
  const isAdmin = clerkUser?.publicMetadata?.isAdmin === true;

  let season: Season;
  try {
    season = await loadSeason(profile.id, { today: mockToday });
  } catch {
    return NextResponse.json({ error: "Your membership couldn't be read just now. Please try again." }, { status: 503 });
  }

  const allowed = season.year === year && (season.canWrite || isAdmin);
  if (!allowed) {
    return NextResponse.json(
      { error: `Your ${year} Blueprint isn't open to write yet.` },
      { status: 403 }
    );
  }

  // A write already under way is followed, not doubled. One stuck for longer than
  // the generation budget (maxDuration) has failed, so a new version may start.
  const startedAt = season.blueprint?.createdAt ? Date.parse(season.blueprint.createdAt) : NaN;
  const stillRunning = Number.isFinite(startedAt) && Date.now() - startedAt < 10 * 60 * 1000;
  if (season.blueprint?.status === "generating" && stillRunning) {
    return NextResponse.json({ blueprintId: season.blueprint.id, year, alreadyGenerating: true });
  }

  const version = nextBlueprintVersion(season.blueprint?.version);
  const { data: blueprint, error: insertError } = await admin
    .from("blueprints")
    .insert({ user_id: profile.id, plan_year: year, version, status: "generating" })
    .select("id")
    .single();

  if (insertError || !blueprint) {
    console.error("[write-ahead] Blueprint insert failed:", insertError?.code, insertError?.message);
    const status = insertError?.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: "Your Blueprint couldn't be started. Please try again." }, { status });
  }

  after(() =>
    runBlueprintGeneration({
      blueprintId: blueprint.id,
      userId: profile.id,
      planYear: year,
    })
  );

  return NextResponse.json({ blueprintId: blueprint.id, year, version });
}
