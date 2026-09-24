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
  features: string[];
  checkoutHeadline: string;
  listingMatchers: string[];
  plannerYear: number;
}

export const LOYALTY_REWARD_AMOUNT_OFF_CENTS = 1800;

/**
 * Config switch for one-time and Etsy annual entitlements.
 * When false (default): they stay locked to their purchased plan year.
 * When true: they follow the same windowed access rule as subscribers.
 * 
 * Can be overridden by env var ONE_TIME_ANNUAL_ROLLS_FORWARD=true
 */
export function getOneTimeAnnualRollsForward(): boolean {
  return process.env.ONE_TIME_ANNUAL_ROLLS_FORWARD === 'true';
}

const COMMERCE_TIERS_BASE: Omit<CommerceTier, 'plannerYear'>[] = [
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

export function getCommerceTier(key: CommerceTierKey, now?: Date): CommerceTier {
  const base = COMMERCE_TIERS_BASE.find((candidate) => candidate.key === key);

  if (!base) {
    throw new Error(`Unknown commerce tier: ${key}`);
  }

  // Add plannerYear computed at request time
  return {
    ...base,
    plannerYear: getPlannerYearWithOverride(now),
  };
}

/**
 * Get all commerce tiers with planner year computed at request time
 */
export function getAllCommerceTiers(now?: Date): CommerceTier[] {
  return COMMERCE_TIERS_BASE.map(base => ({
    ...base,
    plannerYear: getPlannerYearWithOverride(now),
  }));
}

/**
 * Export as COMMERCE_TIERS for backwards compatibility.
 * 
 * IMPORTANT: plannerYear is REMOVED from this constant's shape to prevent misuse.
 * The module-level constant would freeze plannerYear at load time, which breaks
 * Dec 1 rollover logic. Use getCommerceTier(key, now) or getAllCommerceTiers(now)
 * when you need plannerYear.
 */
export const COMMERCE_TIERS: Omit<CommerceTier, 'plannerYear'>[] = COMMERCE_TIERS_BASE;

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

export function buildTierMetadata(tier: CommerceTier, accessPlan: AccessPlan = "yearly", now?: Date) {
  return {
    product_tier: tier.key,
    planner_year: String(getPlannerYearWithOverride(now)),
    oracle_enabled: String(tier.oracleEnabled),
    access_plan: accessPlan,
  };
}
