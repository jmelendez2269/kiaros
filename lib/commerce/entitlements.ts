import "server-only";

import type { AccessPlan } from "@/lib/commerce/config";
import type { Tables } from "@/types/database";
import {
  resolveAccessCapabilities,
  resolveCapabilityEntitlementState,
  type AccessCapabilities,
} from "./capabilities";

export type ProductEntitlementRow = Tables<"product_entitlements">;
export type ProductEntitlementRecord = ProductEntitlementRow & { access_plan?: string | null };
export type EntitlementAccessState = "active" | "read_only" | "expired" | "revoked";

export interface AnnualEntitlementRecord {
  access_plan: AccessPlan;
  ends_at: string;
  oracle_enabled: boolean;
  planner_year: number;
  product_tier: string;
  source: string;
  source_order_id?: string | null;
  starts_at: string;
  status: "active";
  user_id: string;
}

export interface ResolvedEntitlement extends ProductEntitlementRow {
  accessPlan: AccessPlan;
  accessState: EntitlementAccessState;
}

export interface UserAccessSnapshot {
  entitlements: ResolvedEntitlement[];
  activeEntitlements: ResolvedEntitlement[];
  capabilities: AccessCapabilities;
  hasPlannerAccess: boolean;
  hasReadOnlyPlannerAccess: boolean;
  hasOracleAccess: boolean;
}

const ACCESS_PLANS = new Set<AccessPlan>(["monthly", "yearly"]);

export function toISODate(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function addDaysISO(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return toISODate(next);
}

export function getAccessPlan(value: string | null | undefined): AccessPlan {
  return value && ACCESS_PLANS.has(value as AccessPlan) ? (value as AccessPlan) : "yearly";
}

export function buildAnnualEntitlementWindow(startAt: Date | string = new Date()) {
  const startsAt = toISODate(startAt);

  return {
    startsAt,
    endsAt: addDaysISO(startsAt, 364),
    accessPlan: "yearly" as const,
  };
}

export function resolveEntitlementAccessState(
  entitlement: Pick<ProductEntitlementRow, "status" | "starts_at" | "ends_at"> & {
    access_plan?: string | null;
  },
  asOf: Date | string = new Date()
): EntitlementAccessState {
  const accessPlan = getAccessPlan(entitlement.access_plan);
  return resolveCapabilityEntitlementState(
    {
      accessPlan,
      endsAt: entitlement.ends_at,
      startsAt: entitlement.starts_at,
      status: entitlement.status,
    },
    asOf,
  );
}

export function resolveEntitlement(
  entitlement: ProductEntitlementRecord,
  asOf: Date | string = new Date(),
): ResolvedEntitlement {
  const accessPlan = getAccessPlan(entitlement.access_plan);

  return {
    ...entitlement,
    accessPlan,
    accessState: resolveEntitlementAccessState(
      {
        status: entitlement.status,
        starts_at: entitlement.starts_at,
        ends_at: entitlement.ends_at,
        access_plan: accessPlan,
      },
      asOf,
    ),
  };
}

export function resolveUserAccess(
  entitlements: ProductEntitlementRecord[],
  asOf: Date | string = new Date(),
  samplerCredits?: number,
  orderSubscriptionMap?: Map<string, boolean>,
): UserAccessSnapshot {
  const resolved = entitlements
    .map((entitlement) => resolveEntitlement(entitlement, asOf))
    .sort((left, right) => right.ends_at.localeCompare(left.ends_at));

  const activeEntitlements = resolved.filter((entitlement) => entitlement.accessState === "active");
  const capabilities = resolveAccessCapabilities({
    asOf,
    authenticated: true,
    entitlements: entitlements.map((entitlement) => {
      // Check if this entitlement is linked to a subscription
      const isSubscription = entitlement.source_order_id && orderSubscriptionMap
        ? orderSubscriptionMap.get(entitlement.source_order_id) ?? false
        : false;
      
      return {
        accessPlan: getAccessPlan(entitlement.access_plan),
        endsAt: entitlement.ends_at,
        oracleEnabled: entitlement.oracle_enabled,
        plannerYear: entitlement.planner_year,
        source: entitlement.source,
        startsAt: entitlement.starts_at,
        status: entitlement.status,
        isSubscription,
      };
    }),
    samplerCredits,
  });

  return {
    entitlements: resolved,
    activeEntitlements,
    capabilities,
    hasPlannerAccess: capabilities.canUsePlanner,
    hasReadOnlyPlannerAccess: capabilities.accessState === "read_only_annual",
    hasOracleAccess: capabilities.canUseStelloquySubscription,
  };
}

export function buildAnnualEntitlementRecord(
  input: Omit<AnnualEntitlementRecord, "starts_at" | "ends_at" | "access_plan" | "status"> & {
    startAt?: Date | string;
  }
): AnnualEntitlementRecord {
  // `startAt` only feeds the window calculation below; it must not survive
  // into the returned row. The object spread previously carried it straight
  // through into a product_entitlements upsert, which PostgREST rejected
  // ("Could not find the 'startAt' column") — silently failing every real
  // annual Stripe purchase's entitlement grant after a successful charge.
  const { startAt, ...rest } = input;
  const window = buildAnnualEntitlementWindow(startAt);

  return {
    ...rest,
    starts_at: window.startsAt,
    ends_at: window.endsAt,
    access_plan: window.accessPlan,
    status: "active",
  };
}

export async function loadSamplerCredits(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase
    .from("stelloquy_sampler_purchases")
    .select("credits_remaining")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return data?.credits_remaining ?? 0;
}

/**
 * Load a map of order IDs to whether they have a subscription.
 * Used to determine if yearly entitlements are subscriptions or one-time purchases.
 */
export async function loadOrderSubscriptionMap(
  supabase: any,
  orderIds: string[]
): Promise<Map<string, boolean>> {
  if (orderIds.length === 0) {
    return new Map();
  }

  const { data } = await supabase
    .from("direct_purchase_orders")
    .select("id, stripe_subscription_id")
    .in("id", orderIds);

  const map = new Map<string, boolean>();
  for (const order of data ?? []) {
    map.set(order.id, !!order.stripe_subscription_id);
  }
  return map;
}
