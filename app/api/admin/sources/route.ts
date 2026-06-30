import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { listSources, createSource } from "@/lib/admin/sources";
import type { CreateSourcePayload } from "@/types/admin";

export async function GET(req: NextRequest) {
  const user = await currentUser();

  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active");
  const source_type = searchParams.get("source_type") ?? undefined;

  const result = await listSources({
    active: active !== null ? active === "true" : undefined,
    source_type: (source_type as any) || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();

  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: CreateSourcePayload = await req.json();

  const result = await createSource(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
