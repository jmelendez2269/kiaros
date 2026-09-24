import { BRAND } from "@/lib/brand";
import { getCurrentPlannerYear, getNextPlannerYear, getPlannerYearWithOverride } from "./planner-year";

export type CommerceTierKey = "planner" | "planner_oracle";
export type ProductKind = CommerceTierKey | "stelloquy_sampler";
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

/**
 * @deprecated Use getPlannerYearWithOverride() instead. This constant is frozen at build time.
 */
export const CURRENT_PLANNER_YEAR = getPlannerYearWithOverride();

/**
 * @deprecated Use getNextPlannerYear() instead. This constant is frozen at build time.
 */
export const NEXT_PLANNER_YEAR = getNextPlannerYear();

export const LOYALTY_REWARD_AMOUNT_OFF_CENTS = 1800;

/**
 * Config switch for one-time and Etsy annual entitlements.
 * When false (default): they stay locked to their purchased plan year.
 * When true: they follow the same windowed access rule as subscribers.
 * 
 * Can be overridden by env var ONE_TIME_ANNUAL_ROLLS_FORWARD=true
 */
export const ONE_TIME_ANNUAL_ROLLS_FORWARD = 
  process.env.ONE_TIME_ANNUAL_ROLLS_FORWARD === 'true' ? true : false;

export const COMMERCE_TIERS: CommerceTier[] = [
  {
    key: "planner",
    name: `${BRAND.product} Planner`,
    shortName: "Planner",
    tagline: "The personalized planning system for people who want guidance without the full upfront leap.",
    description:
      "A personalized planning system built from your chart, your goals, and your real timing, with ongoing guidance as the year unfolds.",
    monthlyPriceCents: 1400,
    annualPriceCents: 14000,
    directPriceCents: 14000,
    etsyPriceCents: 15600,
    oracleEnabled: false,
    plannerYear: getPlannerYearWithOverride(),
    features: [
      "Personalized blueprint, calendar, journal, and curriculum workspace",
      "Guidance that adapts to where you are now in the year",
      "Private journal entries with lunar and timing context saved to your planner",
      "Monthly access path for flexibility, annual path for best value",
      "Oracle memory and pattern intelligence are available in Planner + Oracle",
    ],
    checkoutHeadline: `Start with the core ${BRAND.product} planner`,
    listingMatchers: ["planner", "core", "annual"],
  },
  {
    key: "planner_oracle",
    name: `${BRAND.product} Planner + Oracle`,
    shortName: "Planner + Oracle",
    tagline: "The planner plus the premium reflective layer for deeper, ongoing conversation.",
    description:
      "Everything in the Planner tier, plus Oracle access with journal memory, astrological pattern recognition, and higher-touch decision support throughout the year.",
    monthlyPriceCents: 2200,
    annualPriceCents: 22000,
    directPriceCents: 22000,
    etsyPriceCents: 24000,
    oracleEnabled: true,
    plannerYear: getPlannerYearWithOverride(),
    features: [
      `Everything in ${BRAND.product} Planner`,
      "Oracle guidance grounded in your chart, goals, current transits, and selected journal entries",
      "Journal intelligence that tracks lunar phases, signs, retrogrades, and transit aspects per entry",
      "Pattern insights that can shape Oracle conversations and next year's calendar personalization",
      "Monthly access path for flexibility, annual path for best value",
    ],
    checkoutHeadline: `Choose the full ${BRAND.product} planner with Oracle included`,
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

export function parseProductKind(value: string | null | undefined): ProductKind | null {
  if (!value) return null;

  if (value === "stelloquy_sampler") return "stelloquy_sampler";
  return parseCommerceTierKey(value);
}

export function isCommerceTierKey(value: ProductKind): value is CommerceTierKey {
  return value === "planner" || value === "planner_oracle";
}

export function parseAccessPlan(value: string | null | undefined): AccessPlan | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

export function getTierPriceCents(tier: CommerceTier, accessPlan: AccessPlan) {
  return accessPlan === "monthly" ? tier.monthlyPriceCents : tier.annualPriceCents;
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
