import {
  resolveAccessCapabilities,
  type CapabilityEntitlement,
} from "../commerce/capabilities.ts";

export interface RetentionEntitlement {
  access_plan: string | null;
  ends_at: string;
  oracle_enabled: boolean;
  planner_year: number;
  source: string | null;
  starts_at: string;
  status: string;
  user_id: string;
}

function toCapabilityEntitlement(entitlement: RetentionEntitlement): CapabilityEntitlement {
  return {
    accessPlan: entitlement.access_plan === "monthly" ? "monthly" : "yearly",
    endsAt: entitlement.ends_at,
    oracleEnabled: entitlement.oracle_enabled,
    plannerYear: entitlement.planner_year,
    source: entitlement.source,
    startsAt: entitlement.starts_at,
    status: entitlement.status,
  };
}

export function groupRetentionEntitlementsByUser(
  entitlements: readonly RetentionEntitlement[],
): Map<string, RetentionEntitlement[]> {
  const byUser = new Map<string, RetentionEntitlement[]>();

  for (const entitlement of entitlements) {
    const existing = byUser.get(entitlement.user_id);
    if (existing) existing.push(entitlement);
    else byUser.set(entitlement.user_id, [entitlement]);
  }

  return byUser;
}

export function isRetentionEmailEligible(
  entitlements: readonly RetentionEntitlement[],
  asOf: Date | string = new Date(),
): boolean {
  return resolveAccessCapabilities({
    asOf,
    authenticated: true,
    entitlements: entitlements.map(toCapabilityEntitlement),
  }).canUsePlanner;
}
