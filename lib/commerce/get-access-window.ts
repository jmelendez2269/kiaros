import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  resolveUserAccess,
  loadOrderSubscriptionMap,
  type EntitlementAccessState,
  type ProductEntitlementRecord,
} from "@/lib/commerce/entitlements";
import type { AccessPlan } from "@/lib/commerce/config";

const MS_PER_DAY = 86_400_000;

export interface AccessWindow {
  /** ISO date (YYYY-MM-DD) the purchased window runs through. */
  endsAt: string;
  accessPlan: AccessPlan;
  state: EntitlementAccessState;
  /** Whole days from today to `endsAt`. Negative once the window has passed. */
  daysRemaining: number;
}

function daysUntil(endsAt: string): number {
  const end = new Date(`${endsAt}T00:00:00.000Z`).getTime();
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.round((end - today) / MS_PER_DAY);
}

/**
 * The window the user's purchase actually covers — "the year you bought".
 *
 * Prefers the furthest-out *active* entitlement so someone who renewed early
 * sees the new end date rather than the one about to lapse. Falls back to the
 * most recently-ended record so a lapsed user still gets told when it ran out
 * instead of seeing nothing at all. Returns null only when the user has never
 * held an entitlement.
 */
export async function getAccessWindow(supabaseUserId: string): Promise<AccessWindow | null> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("product_entitlements")
    .select(
      "id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan"
    )
    .eq("user_id", supabaseUserId)
    .neq("status", "revoked");

  // Load subscription info
  const orderIds = (data ?? [])
    .map(e => e.source_order_id)
    .filter((id): id is string => !!id);
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds);

  const access = resolveUserAccess(
    (data ?? []) as ProductEntitlementRecord[],
    undefined,
    undefined,
    subscriptionMap
  );
  // `resolveUserAccess` sorts both lists by ends_at descending.
  const chosen = access.activeEntitlements[0] ?? access.entitlements[0];
  if (!chosen) return null;

  return {
    endsAt: chosen.ends_at,
    accessPlan: chosen.accessPlan,
    state: chosen.accessState,
    daysRemaining: daysUntil(chosen.ends_at),
  };
}
