import { NextResponse } from "next/server";
import { z } from "zod";

import { CURRENT_PLANNER_YEAR } from "@/lib/commerce/config";
import { inferTierFromEtsySignals } from "@/lib/commerce/etsy-mapping";
import { upsertMarketplaceOrders } from "@/lib/commerce/marketplace-orders";

export const runtime = "nodejs";

const n8nIngestSchema = z.object({
  external_order_id: z.string().trim().min(1, "external_order_id is required."),
  purchaser_email: z.string().trim().email("purchaser_email must be a valid email."),
  purchaser_name: z.string().trim().optional().nullable(),
  listing_key: z.string().trim().optional().nullable(),
  listing_id: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  purchased_at: z.string().trim().optional().nullable(),
  planner_year: z.number().int().optional(),
  raw_source: z.record(z.string(), z.unknown()).optional(),
  source_message_id: z.string().trim().optional().nullable(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOrderId(orderId: string) {
  return orderId.trim().toUpperCase();
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function POST(request: Request) {
  const secret = process.env.N8N_INGEST_SECRET;
  const headerSecret = request.headers.get("x-kiaros-ingest-secret");

  if (!secret) {
    return NextResponse.json({ error: "N8N_INGEST_SECRET is not configured." }, { status: 500 });
  }

  if (!headerSecret || headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = n8nIngestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid n8n payload." },
      { status: 400 }
    );
  }

  const tier = inferTierFromEtsySignals({
    sku: parsed.data.sku,
    listingId: parsed.data.listing_id,
    listingText: parsed.data.listing_key,
  });

  try {
    const summary = await upsertMarketplaceOrders([
      {
        externalOrderId: normalizeOrderId(parsed.data.external_order_id),
        purchaserEmail: normalizeEmail(parsed.data.purchaser_email),
        purchaserName: parsed.data.purchaser_name ?? null,
        listingKey: parsed.data.listing_key ?? null,
        listingId: parsed.data.listing_id ?? null,
        sku: parsed.data.sku ?? null,
        productTier: tier.key,
        plannerYear: parsed.data.planner_year ?? tier.plannerYear ?? CURRENT_PLANNER_YEAR,
        oracleEnabled: tier.oracleEnabled,
        purchasedAt: normalizeDate(parsed.data.purchased_at),
        sourceMessageId: parsed.data.source_message_id ?? null,
        metadata: {
          ingest_source: "n8n",
          raw_source: parsed.data.raw_source ?? {},
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      summary,
      mappedTier: tier.key,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "n8n ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
