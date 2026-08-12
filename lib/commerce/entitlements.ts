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
): UserAccessSnapshot {
  const resolved = entitlements
    .map((entitlement) => resolveEntitlement(entitlement, asOf))
    .sort((left, right) => right.ends_at.localeCompare(left.ends_at));

  const activeEntitlements = resolved.filter((entitlement) => entitlement.accessState === "active");
  const capabilities = resolveAccessCapabilities({
    asOf,
    authenticated: true,
    entitlements: entitlements.map((entitlement) => ({
      accessPlan: getAccessPlan(entitlement.access_plan),
      endsAt: entitlement.ends_at,
      oracleEnabled: entitlement.oracle_enabled,
      plannerYear: entitlement.planner_year,
      source: entitlement.source,
      startsAt: entitlement.starts_at,
      status: entitlement.status,
    })),
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
  const window = buildAnnualEntitlementWindow(input.startAt);

  return {
    ...input,
    starts_at: window.startsAt,
    ends_at: window.endsAt,
    access_plan: window.accessPlan,
    status: "active",
  };
}
