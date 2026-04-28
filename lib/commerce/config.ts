export type CommerceTierKey = "planner" | "planner_oracle";
export type AccessPlan = "monthly" | "yearly";

export interface CommerceTier {
  key: CommerceTierKey;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  directPriceCents: number;
  etsyPriceCents: number;
  oracleEnabled: boolean;
  plannerYear: number;
  features: string[];
  checkoutHeadline: string;
  listingMatchers: string[];
}

export const CURRENT_PLANNER_YEAR = 2026;
export const NEXT_PLANNER_YEAR = CURRENT_PLANNER_YEAR + 1;
export const LOYALTY_REWARD_AMOUNT_OFF_CENTS = 1800;

export const COMMERCE_TIERS: CommerceTier[] = [
  {
    key: "planner",
    name: "Kiaros Planner",
    shortName: "Planner",
    tagline: "The personalized planning system for people who want guidance without the full upfront leap.",
    description:
      "A personalized planning system built from your chart, your goals, and your real timing, with ongoing guidance as the year unfolds.",
    monthlyPriceCents: 1400,
    annualPriceCents: 14000,
    directPriceCents: 14000,
    etsyPriceCents: 15600,
    oracleEnabled: false,
    plannerYear: CURRENT_PLANNER_YEAR,
    features: [
      "Personalized blueprint, calendar, journal, tracker, and curriculum workspace",
      "Guidance that adapts to where you are now in the year",
      "Monthly access path for flexibility, annual path for best value",
      "Annual Etsy purchase remains available for marketplace buyers",
    ],
    checkoutHeadline: "Start with the core Kiaros planner",
    listingMatchers: ["planner", "core", "annual"],
  },
  {
    key: "planner_oracle",
    name: "Kiaros Planner + Oracle",
    shortName: "Planner + Oracle",
    tagline: "The planner plus the premium reflective layer for deeper, ongoing conversation.",
    description:
      "Everything in the Planner tier, plus Oracle access for higher-touch interpretation, reflection, and decision support throughout the year.",
    monthlyPriceCents: 2200,
    annualPriceCents: 22000,
    directPriceCents: 22000,
    etsyPriceCents: 24000,
    oracleEnabled: true,
    plannerYear: CURRENT_PLANNER_YEAR,
    features: [
      "Everything in Kiaros Planner",
      "Oracle guidance for reflection, interpretation, and decision support",
      "A premium layer designed for ongoing use across the year",
      "Monthly access path for flexibility, annual path for best value",
    ],
    checkoutHeadline: "Choose the full Kiaros planner with Oracle included",
    listingMatchers: ["oracle", "bundle", "premium", "full access"],
  },
];

export function getCommerceTier(key: CommerceTierKey) {
  const tier = COMMERCE_TIERS.find((candidate) => candidate.key === key);

  if (!tier) {
    throw new Error(`Unknown commerce tier: ${key}`);
  }

  return tier;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function parseCommerceTierKey(value: string | null | undefined): CommerceTierKey | null {
  if (!value) return null;

  return COMMERCE_TIERS.some((tier) => tier.key === value) ? (value as CommerceTierKey) : null;
}

export function inferTierFromListingText(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return getCommerceTier("planner");

  const plannerOracle = getCommerceTier("planner_oracle");
  if (plannerOracle.listingMatchers.some((matcher) => normalized.includes(matcher))) {
    return plannerOracle;
  }

  return getCommerceTier("planner");
}

export function buildTierMetadata(tier: CommerceTier, accessPlan: AccessPlan = "yearly") {
  return {
    product_tier: tier.key,
    planner_year: String(tier.plannerYear),
    oracle_enabled: String(tier.oracleEnabled),
    access_plan: accessPlan,
  };
}
