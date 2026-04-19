import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { listMappings, createMapping } from "@/lib/admin/mapping";
import type { CreateMappingPayload } from "@/types/admin";

function isAdminSession(sessionClaims: unknown): boolean {
  return (
    (sessionClaims as { publicMetadata?: { isAdmin?: boolean } } | null)
      ?.publicMetadata?.isAdmin === true
  );
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const card_id = searchParams.get("card_id") ?? undefined;
  const planner_layer = searchParams.get("planner_layer") ?? undefined;

  const result = await listMappings({
    card_id: card_id || undefined,
    planner_layer: (planner_layer as any) || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: CreateMappingPayload = await req.json();

  const result = await createMapping(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
