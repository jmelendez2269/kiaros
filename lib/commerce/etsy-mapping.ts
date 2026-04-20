import "server-only";

import { CommerceTierKey, getCommerceTier } from "@/lib/commerce/config";

type EtsyTierMapping = {
  tierKey: CommerceTierKey;
  skuMatchers: string[];
  listingIds: string[];
};

function parseCsvEnv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const ETSY_TIER_MAPPINGS: EtsyTierMapping[] = [
  {
    tierKey: "planner",
    skuMatchers: parseCsvEnv(process.env.ETSY_SKU_PLANNER),
    listingIds: parseCsvEnv(process.env.ETSY_LISTING_ID_PLANNER),
  },
  {
    tierKey: "planner_oracle",
    skuMatchers: parseCsvEnv(process.env.ETSY_SKU_PLANNER_ORACLE),
    listingIds: parseCsvEnv(process.env.ETSY_LISTING_ID_PLANNER_ORACLE),
  },
];

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function inferTierFromEtsySignals(params: {
  sku?: string | null;
  listingId?: string | null;
  listingText?: string | null;
}) {
  const normalizedSku = normalize(params.sku);
  const normalizedListingId = normalize(params.listingId);
  const normalizedListingText = normalize(params.listingText);

  for (const mapping of ETSY_TIER_MAPPINGS) {
    if (mapping.listingIds.some((listingId) => normalize(listingId) === normalizedListingId)) {
      return getCommerceTier(mapping.tierKey);
    }

    if (mapping.skuMatchers.some((sku) => normalizedSku.includes(normalize(sku)))) {
      return getCommerceTier(mapping.tierKey);
    }
  }

  if (normalizedListingText.includes("oracle")) {
    return getCommerceTier("planner_oracle");
  }

  return getCommerceTier("planner");
}
