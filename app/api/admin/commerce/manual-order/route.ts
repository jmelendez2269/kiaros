import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CURRENT_PLANNER_YEAR } from "@/lib/commerce/config";
import { upsertMarketplaceOrders } from "@/lib/commerce/marketplace-orders";

export const runtime = "nodejs";

const schema = z.object({
  orderNumber: z.string().trim().min(1, "Order number is required."),
  email: z.string().trim().email("A valid email is required."),
  name: z.string().trim().nullable().optional(),
  tier: z.enum(["planner", "planner_oracle"]),
  purchasedAt: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { orderNumber, email, name, tier, purchasedAt } = parsed.data;

  const normalizedOrderId = orderNumber.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  let purchasedAtISO: string | null = null;
  if (purchasedAt) {
    const d = new Date(purchasedAt);
    purchasedAtISO = isNaN(d.getTime()) ? null : d.toISOString();
  }

  try {
    await upsertMarketplaceOrders([
      {
        externalOrderId: normalizedOrderId,
        purchaserEmail: normalizedEmail,
        purchaserName: name ?? null,
        listingKey: null,
        productTier: tier,
        plannerYear: CURRENT_PLANNER_YEAR,
        oracleEnabled: tier === "planner_oracle",
        purchasedAt: purchasedAtISO,
        accessPlan: "yearly",
        metadata: { ingest_source: "admin_manual" },
      },
    ]);

    return NextResponse.json({ success: true, orderId: normalizedOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add order.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
