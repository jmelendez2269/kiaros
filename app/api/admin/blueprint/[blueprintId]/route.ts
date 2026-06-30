import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ blueprintId: string }> }
) {
  const user = await currentUser();
  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { blueprintId } = await params;
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("blueprints")
    .select("status, error_message")
    .eq("id", blueprintId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
  }

  return NextResponse.json({ status: data.status, error: data.error_message ?? null });
}
