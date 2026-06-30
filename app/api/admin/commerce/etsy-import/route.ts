import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { parseEtsyOrdersCsv, validateEtsyCsvInput } from "@/lib/commerce/etsy";
import { upsertMarketplaceOrders } from "@/lib/commerce/marketplace-orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = validateEtsyCsvInput(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid Etsy CSV payload." },
      { status: 400 }
    );
  }

  try {
    const records = parseEtsyOrdersCsv(parsed.data.csvText);
    const summary = await upsertMarketplaceOrders(
      records.map((record) => ({
        externalOrderId: record.externalOrderId,
        purchaserEmail: record.purchaserEmail,
        purchaserName: record.purchaserName,
        listingKey: record.listingKey,
        listingId: record.listingId,
        sku: record.sku,
        productTier: record.productTier,
        plannerYear: record.plannerYear,
        oracleEnabled: record.oracleEnabled,
        purchasedAt: record.purchasedAt,
        metadata: record.metadata,
      }))
    );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
