import "server-only";

import { isFunnelEventsEnabled } from "@/lib/feature-flags";
import { createAdminSupabase } from "@/lib/supabase/admin";

import {
  buildCheckoutCanceledEvent,
  buildCheckoutCompletedEvent,
  buildCheckoutStartedEvent,
  checkoutAttemptEventId,
  isCheckoutAttemptId,
  type CheckoutSessionAnalyticsSource,
} from "./checkout-events-core";
import { recordFunnelEvent, resolveFunnelUserId } from "./recorder";

export async function recordCheckoutStarted(params: {
  session: CheckoutSessionAnalyticsSource;
  userId: string;
}) {
  return recordFunnelEvent(buildCheckoutStartedEvent(params));
}

export async function recordVerifiedCheckoutCompleted(params: {
  session: CheckoutSessionAnalyticsSource;
  userId: string;
  convertedEntitlementId: string;
  occurredAt?: string | Date;
}) {
  const result = await recordFunnelEvent(buildCheckoutCompletedEvent(params));
  if (result.status === "rejected") {
    throw new Error("Verified checkout completion analytics was rejected.");
  }
  return result;
}

export async function recordCheckoutCanceled(params: {
  attemptId: unknown;
  clerkUserId: string;
}) {
  if (!isFunnelEventsEnabled()) return { status: "disabled" as const };
  if (!isCheckoutAttemptId(params.attemptId)) return { status: "invalid" as const };

  const userId = await resolveFunnelUserId(params.clerkUserId);
  if (!userId) return { status: "not_found" as const };

  const supabase = createAdminSupabase();
  const { data: started, error } = await supabase
    .from("first_party_funnel_events")
    .select(
      "anonymous_id, user_id, session_id, source, medium, campaign, referrer_host, entry_path, experiment_key, experiment_variant, product_tier, access_plan, stripe_checkout_session_id, stripe_order_id, metadata",
    )
    .eq("event_id", checkoutAttemptEventId(params.attemptId, "started"))
    .eq("event_name", "checkout_started")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify checkout cancellation (${error.code ?? "unknown"}).`);
  if (!started) return { status: "not_found" as const };

  const result = await recordFunnelEvent(buildCheckoutCanceledEvent({
    attemptId: params.attemptId,
    started: {
      ...started,
      product_tier: started.product_tier as "planner" | "planner_oracle" | null,
      access_plan: started.access_plan as "monthly" | "yearly" | null,
      metadata:
        typeof started.metadata === "object" && started.metadata && !Array.isArray(started.metadata)
          ? started.metadata
          : {},
    },
  }));
  return { status: result.status };
}
