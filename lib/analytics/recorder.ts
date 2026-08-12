import "server-only";

import { isFunnelEventsEnabled } from "@/lib/feature-flags";

import type { FunnelEventInput } from "./funnel-events";
import { recordFunnelEventWithAdapter, type FunnelEventRecordResult } from "./recorder-core";
import { SupabaseFunnelEventAdapter } from "./supabase-adapter";

export async function recordFunnelEvent(
  input: FunnelEventInput | unknown,
): Promise<FunnelEventRecordResult> {
  return recordFunnelEventWithAdapter(input, new SupabaseFunnelEventAdapter(), {
    enabled: isFunnelEventsEnabled(),
  });
}

export async function resolveFunnelUserId(clerkUserId: string): Promise<string | null> {
  if (!isFunnelEventsEnabled()) return null;
  return new SupabaseFunnelEventAdapter().findUserProfileId(clerkUserId);
}
