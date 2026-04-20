import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

export interface MarketplaceOrderUpsertInput {
  externalOrderId: string;
  purchaserEmail: string;
  purchaserName: string | null;
  listingKey: string | null;
  listingId?: string | null;
  sku?: string | null;
  productTier: "planner" | "planner_oracle";
  plannerYear: number;
  oracleEnabled: boolean;
  purchasedAt: string | null;
  sourceMessageId?: string | null;
  metadata: Record<string, unknown>;
}

export async function upsertMarketplaceOrders(records: MarketplaceOrderUpsertInput[]) {
  const supabase = createAdminSupabase();

  const { data: existingOrders, error: existingError } = await supabase
    .from("marketplace_orders")
    .select("external_order_id, status")
    .eq("source", "etsy")
    .in(
      "external_order_id",
      records.map((record) => record.externalOrderId)
    );

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingOrderMap = new Map(
    (existingOrders ?? []).map((record) => [record.external_order_id, record.status])
  );

  const upsertPayload = records.map((record) => ({
    source: "etsy",
    external_order_id: record.externalOrderId,
    purchaser_email: record.purchaserEmail,
    purchaser_name: record.purchaserName,
    listing_key: record.listingKey,
    etsy_listing_id: record.listingId ?? null,
    etsy_sku: record.sku ?? null,
    source_message_id: record.sourceMessageId ?? null,
    product_tier: record.productTier,
    planner_year: record.plannerYear,
    oracle_enabled: record.oracleEnabled,
    status: existingOrderMap.get(record.externalOrderId) ?? "imported",
    purchased_at: record.purchasedAt,
    metadata: record.metadata,
  }));

  const { error: upsertError } = await supabase
    .from("marketplace_orders")
    .upsert(upsertPayload, { onConflict: "source,external_order_id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const updated = records.filter((record) => existingOrderMap.has(record.externalOrderId)).length;

  return {
    totalRows: records.length,
    imported: records.length - updated,
    updated,
  };
}
