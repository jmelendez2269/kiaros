import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { listCards, createCard } from "@/lib/admin/cards";
import type { CreateCardPayload } from "@/types/admin";

export async function GET(req: NextRequest) {
  const user = await currentUser();

  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const import_id = searchParams.get("import_id") ?? undefined;

  const result = await listCards({
    status: (status as any) || undefined,
    category: (category as any) || undefined,
    import_id: import_id || undefined,
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

  const body: CreateCardPayload = await req.json();

  const result = await createCard(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
