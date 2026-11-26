import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { giftRedeemSchema } from "@/lib/commerce/gift";
import { redeemGift } from "@/lib/commerce/gift-server";

export const runtime = "nodejs";

/** Adds a gift to the signed-in member's account. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to add your gift." }, { status: 401 });
  }

  const parsed = giftRedeemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Enter your gift code." },
      { status: 400 },
    );
  }

  const result = await redeemGift({ clerkUserId: userId, rawCode: parsed.data.code });
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
