export type CommerceTierKey = "planner" | "planner_oracle";

export interface CommerceTier {
  key: CommerceTierKey;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
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
    tagline: "The complete annual planner system, without recurring fees.",
    description:
      "A one-time purchase for the full Kiaros planning system, built to meet you in your current season and carry the rest of the year with you.",
    directPriceCents: 9600,
    etsyPriceCents: 11200,
    oracleEnabled: false,
    plannerYear: CURRENT_PLANNER_YEAR,
    features: [
      "Full Kiaros planner access for the current planner year",
      "Onboarding that adapts to where you are now in the year",
      "Blueprint, calendar, journal, tracker, and curriculum workspace",
      "Future loyalty reward reserved for next year's planner",
    ],
    checkoutHeadline: "Start with the core Kiaros planner",
    listingMatchers: ["planner", "core", "annual"],
  },
  {
    key: "planner_oracle",
    name: "Kiaros Planner + Oracle",
    shortName: "Planner + Oracle",
    tagline: "The planner plus the premium reflective layer for deeper guidance.",
    description:
      "Everything in the Planner tier, plus Oracle access for higher-touch prompting and guidance when you want more interpretation inside the system.",
    directPriceCents: 14400,
    etsyPriceCents: 16200,
    oracleEnabled: true,
    plannerYear: CURRENT_PLANNER_YEAR,
    features: [
      "Everything in Kiaros Planner",
      "Oracle access included for the current planner year",
      "Higher-touch guidance layer for reflection and planning moments",
      "Future loyalty reward reserved for next year's planner",
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

export function buildTierMetadata(tier: CommerceTier) {
  return {
    product_tier: tier.key,
    planner_year: String(tier.plannerYear),
    oracle_enabled: String(tier.oracleEnabled),
  };
}
