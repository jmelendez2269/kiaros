import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

import type { FunnelEventDatabaseAdapter, FunnelEventInsertResult } from "./recorder-core";
import type { FunnelEventRecord } from "./funnel-events";

export interface FunnelEventIdentityAdapter {
  findUserProfileId(clerkUserId: string): Promise<string | null>;
}

export class SupabaseFunnelEventAdapter
  implements FunnelEventDatabaseAdapter, FunnelEventIdentityAdapter
{
  async insertEvent(event: FunnelEventRecord): Promise<FunnelEventInsertResult> {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("first_party_funnel_events").insert(event);

    if (!error) return "inserted";
    if (error.code === "23505") return "duplicate";
    throw new Error(`Unable to record funnel event (${error.code ?? "unknown"}).`);
  }

  async linkAnonymousEvents(anonymousId: string, userId: string): Promise<number> {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc("link_first_party_funnel_identity", {
      p_anonymous_id: anonymousId,
      p_user_id: userId,
    });

    if (error) throw new Error(`Unable to link funnel identity (${error.code ?? "unknown"}).`);
    return typeof data === "number" ? data : 0;
  }

  async findUserProfileId(clerkUserId: string): Promise<string | null> {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (error) throw new Error(`Unable to resolve funnel identity (${error.code ?? "unknown"}).`);
    return data?.id ?? null;
  }
}
