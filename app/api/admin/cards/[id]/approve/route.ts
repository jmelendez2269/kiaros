import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { approveCard } from "@/lib/admin/cards";

function isAdminSession(sessionClaims: unknown): boolean {
  return (
    (sessionClaims as { publicMetadata?: { isAdmin?: boolean } } | null)
      ?.publicMetadata?.isAdmin === true
  );
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, sessionClaims } = auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await approveCard(params.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
