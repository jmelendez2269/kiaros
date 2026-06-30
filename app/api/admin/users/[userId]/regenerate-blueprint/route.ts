import { currentUser } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { runBlueprintGeneration } from "@/lib/ai/blueprint-generator";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await currentUser();
  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const admin = createAdminSupabase();

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id, plan_year, display_name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const planYear = profile.plan_year ?? new Date().getFullYear();

  const { data: latest } = await admin
    .from("blueprints")
    .select("version")
    .eq("user_id", profile.id)
    .eq("plan_year", planYear)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;

  const { data: blueprint, error: insertError } = await admin
    .from("blueprints")
    .insert({ user_id: profile.id, plan_year: planYear, version, status: "generating" })
    .select("id")
    .single();

  if (insertError || !blueprint) {
    console.error("[admin/regenerate] Blueprint insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create blueprint record" }, { status: 500 });
  }

  console.log(`[admin/regenerate] Triggering v${version} for ${profile.display_name} (${profile.id}), blueprint ${blueprint.id}`);

  after(() =>
    runBlueprintGeneration({
      blueprintId: blueprint.id,
      userId: profile.id,
      planYear,
    })
  );

  return NextResponse.json({ blueprintId: blueprint.id, version });
}
