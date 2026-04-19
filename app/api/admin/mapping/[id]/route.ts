import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getMapping, updateMapping, deleteMapping } from "@/lib/admin/mapping";
import type { UpdateMappingPayload } from "@/types/admin";

function isAdminSession(sessionClaims: unknown): boolean {
  return (
    (sessionClaims as { publicMetadata?: { isAdmin?: boolean } } | null)
      ?.publicMetadata?.isAdmin === true
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getMapping(params.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: UpdateMappingPayload = await req.json();

  const result = await updateMapping(params.id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await deleteMapping(params.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
