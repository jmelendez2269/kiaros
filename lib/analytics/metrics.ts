import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin funnel/retention metric calculations.
 * 
 * All calculations use the first_party_funnel_events table.
 * Date ranges are inclusive [start, end].
 */

export interface MetricsDateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface FunnelMetrics {
  /**
   * 1. 14-day net first-payment revenue per unique pricing visitor
   * 
   * Numerator: sum of amount_minor from checkout_completed events within the date range
   * Denominator: count of distinct anonymous_id + user_id from pricing_viewed events
   * in the 14 days ending on the range end date
   */
  revenuePerPricingVisitor: {
    totalRevenueCents: number;
    uniquePricingVisitors: number;
    revenuePerVisitorCents: number;
  };

  /**
   * 2. Pricing-to-checkout and checkout-to-paid conversion
   * 
   * Pricing-to-checkout: pricing_viewed → checkout_started (same session_id)
   * Checkout-to-paid: checkout_started → checkout_completed (same stripe_checkout_session_id)
   */
  conversionRates: {
    pricingToCheckout: {
      pricingViewers: number;
      checkoutStarts: number;
      conversionRate: number;
    };
    checkoutToPaid: {
      checkoutStarts: number;
      checkoutCompletions: number;
      conversionRate: number;
    };
  };

  /**
   * 3. Preview-to-paid vs paid-first conversion
   * 
   * Preview-to-paid: users who viewed preview before completing checkout
   * Paid-first: users who completed checkout without preview events
   * 
   * Note: May show N/A if preview events don't exist or are insufficient.
   */
  previewConversion: {
    available: boolean;
    reason?: string; // If not available, explains why (e.g., "No preview events in range")
    previewViewers?: number;
    previewConverted?: number;
    previewConversionRate?: number;
    paidFirstCount?: number;
    totalPaid?: number;
  };

  /**
   * 4. Blueprint-ready rate and median time to ready
   * 
   * Rate: blueprint_ready events / checkout_completed events
   * Median time: median of completion_duration_ms from blueprint_ready metadata
   */
  blueprintReadiness: {
    checkoutCompletions: number;
    blueprintReadyCount: number;
    readyRate: number;
    medianTimeMs: number | null;
    medianTimeFormatted: string;
  };

  /**
   * 5. Day-7 return
   * 
   * Count of day_7_return events within the range
   * Denominator: checkout_completed events from 7+ days before range end
   */
  day7Return: {
    eligibleUsers: number; // Paid 7+ days ago
    returnedUsers: number;
    returnRate: number;
  };

  /**
   * 6. Cancellation before second invoice + second-invoice retention
   * 
   * Cancellation: subscription_canceled events where metadata.invoice_number = 1
   * Second-invoice retention: second_invoice_paid events / eligible first invoices
   */
  retention: {
    firstInvoices: number;
    canceledBeforeSecond: number;
    secondInvoicePaid: number;
    cancellationRate: number;
    retentionRate: number;
  };

  /**
   * 7. Sampler-to-subscription conversion
   * 
   * Numerator: paid_upgrade_completed events where metadata.is_upgrade = true
   * Denominator: sampler_purchased events
   * 
   * Note: May show N/A if sampler events don't exist.
   */
  samplerConversion: {
    available: boolean;
    reason?: string;
    samplerPurchases?: number;
    samplerUpgrades?: number;
    conversionRate?: number;
  };
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate all funnel/retention metrics for the given date range.
 * 
 * Date range is inclusive. Times are in UTC.
 */
export async function calculateFunnelMetrics(
  supabase: SupabaseClient,
  dateRange: MetricsDateRange,
): Promise<FunnelMetrics> {
  const { start, end } = dateRange;

  // 1. Revenue per pricing visitor (14-day window)
  const fourteenDaysBeforeEnd = new Date(end);
  fourteenDaysBeforeEnd.setUTCDate(fourteenDaysBeforeEnd.getUTCDate() - 14);
  const pricingWindowStart = fourteenDaysBeforeEnd.toISOString().split('T')[0];

  const { data: revenueData } = await supabase
    .from("first_party_funnel_events")
    .select("metadata")
    .eq("event_name", "checkout_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const totalRevenueCents = (revenueData ?? []).reduce((sum, event) => {
    const amount = event.metadata?.amount_minor ?? 0;
    return sum + amount;
  }, 0);

  const { data: pricingViewers } = await supabase
    .from("first_party_funnel_events")
    .select("anonymous_id, user_id")
    .eq("event_name", "pricing_viewed")
    .gte("occurred_at", `${pricingWindowStart}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const uniquePricingVisitors = new Set(
    (pricingViewers ?? []).map(e => e.user_id || e.anonymous_id)
  ).size;

  const revenuePerVisitorCents = uniquePricingVisitors > 0
    ? totalRevenueCents / uniquePricingVisitors
    : 0;

  // 2. Conversion rates
  const { data: pricingEvents } = await supabase
    .from("first_party_funnel_events")
    .select("session_id")
    .eq("event_name", "pricing_viewed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`)
    .not("session_id", "is", null);

  const pricingSessions = new Set((pricingEvents ?? []).map(e => e.session_id));

  const { data: checkoutStartEvents } = await supabase
    .from("first_party_funnel_events")
    .select("session_id, stripe_checkout_session_id")
    .eq("event_name", "checkout_started")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const checkoutStartsFromPricing = (checkoutStartEvents ?? [])
    .filter(e => e.session_id && pricingSessions.has(e.session_id)).length;

  const checkoutSessionIds = new Set(
    (checkoutStartEvents ?? [])
      .filter(e => e.stripe_checkout_session_id)
      .map(e => e.stripe_checkout_session_id)
  );

  const { data: checkoutCompletions } = await supabase
    .from("first_party_funnel_events")
    .select("stripe_checkout_session_id")
    .eq("event_name", "checkout_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`)
    .not("stripe_checkout_session_id", "is", null);

  const completedCheckouts = (checkoutCompletions ?? [])
    .filter(e => checkoutSessionIds.has(e.stripe_checkout_session_id!)).length;

  // 3. Preview conversion
  const { data: previewEvents } = await supabase
    .from("first_party_funnel_events")
    .select("user_id, anonymous_id")
    .in("event_name", ["preview_started", "preview_completed", "preview_viewed"])
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const previewIdentities = new Set(
    (previewEvents ?? []).map(e => e.user_id || e.anonymous_id)
  );

  const { data: allCheckoutCompletions } = await supabase
    .from("first_party_funnel_events")
    .select("user_id, anonymous_id")
    .eq("event_name", "checkout_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const totalPaid = (allCheckoutCompletions ?? []).length;
  const previewConverted = (allCheckoutCompletions ?? [])
    .filter(e => {
      const identity = e.user_id || e.anonymous_id;
      return identity && previewIdentities.has(identity);
    }).length;

  const paidFirstCount = totalPaid - previewConverted;

  const previewConversion = previewEvents && previewEvents.length > 0
    ? {
        available: true,
        previewViewers: previewIdentities.size,
        previewConverted,
        previewConversionRate: previewIdentities.size > 0 ? previewConverted / previewIdentities.size : 0,
        paidFirstCount,
        totalPaid,
      }
    : {
        available: false,
        reason: "No preview events in date range",
      };

  // 4. Blueprint readiness
  const { data: blueprintReadyEvents } = await supabase
    .from("first_party_funnel_events")
    .select("metadata")
    .eq("event_name", "blueprint_ready")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const blueprintReadyCount = (blueprintReadyEvents ?? []).length;
  const completionTimes = (blueprintReadyEvents ?? [])
    .map(e => e.metadata?.completion_duration_ms)
    .filter((ms): ms is number => typeof ms === "number")
    .sort((a, b) => a - b);

  const medianTimeMs = completionTimes.length > 0
    ? completionTimes[Math.floor(completionTimes.length / 2)]
    : null;

  const readyRate = totalPaid > 0 ? blueprintReadyCount / totalPaid : 0;

  // 5. Day-7 return
  const sevenDaysBeforeEnd = new Date(end);
  sevenDaysBeforeEnd.setUTCDate(sevenDaysBeforeEnd.getUTCDate() - 7);
  const eligibleCutoff = sevenDaysBeforeEnd.toISOString().split('T')[0];

  const { data: eligibleCheckouts } = await supabase
    .from("first_party_funnel_events")
    .select("user_id, anonymous_id")
    .eq("event_name", "checkout_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${eligibleCutoff}T23:59:59Z`);

  const eligibleUsers = (eligibleCheckouts ?? []).length;

  const { data: returnEvents } = await supabase
    .from("first_party_funnel_events")
    .select("*")
    .eq("event_name", "day_7_return")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const returnedUsers = (returnEvents ?? []).length;
  const returnRate = eligibleUsers > 0 ? returnedUsers / eligibleUsers : 0;

  // 6. Retention
  const { data: firstInvoiceEvents } = await supabase
    .from("first_party_funnel_events")
    .select("user_id")
    .eq("event_name", "checkout_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`)
    .not("user_id", "is", null);

  const firstInvoices = (firstInvoiceEvents ?? []).length;

  const { data: cancellationEvents } = await supabase
    .from("first_party_funnel_events")
    .select("metadata")
    .eq("event_name", "subscription_canceled")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const canceledBeforeSecond = (cancellationEvents ?? [])
    .filter(e => e.metadata?.invoice_number === 1).length;

  const { data: secondInvoiceEvents } = await supabase
    .from("first_party_funnel_events")
    .select("*")
    .eq("event_name", "second_invoice_paid")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const secondInvoicePaid = (secondInvoiceEvents ?? []).length;

  const cancellationRate = firstInvoices > 0 ? canceledBeforeSecond / firstInvoices : 0;
  const retentionRate = firstInvoices > 0 ? secondInvoicePaid / firstInvoices : 0;

  // 7. Sampler conversion
  const { data: samplerPurchaseEvents } = await supabase
    .from("first_party_funnel_events")
    .select("*")
    .eq("event_name", "sampler_purchased")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const { data: samplerUpgradeEvents } = await supabase
    .from("first_party_funnel_events")
    .select("metadata")
    .eq("event_name", "paid_upgrade_completed")
    .gte("occurred_at", `${start}T00:00:00Z`)
    .lte("occurred_at", `${end}T23:59:59Z`);

  const samplerUpgrades = (samplerUpgradeEvents ?? [])
    .filter(e => e.metadata?.is_upgrade === true).length;

  const samplerPurchases = (samplerPurchaseEvents ?? []).length;

  const samplerConversion = samplerPurchases > 0
    ? {
        available: true,
        samplerPurchases,
        samplerUpgrades,
        conversionRate: samplerUpgrades / samplerPurchases,
      }
    : {
        available: false,
        reason: "No sampler purchases in date range",
      };

  return {
    revenuePerPricingVisitor: {
      totalRevenueCents,
      uniquePricingVisitors,
      revenuePerVisitorCents,
    },
    conversionRates: {
      pricingToCheckout: {
        pricingViewers: pricingSessions.size,
        checkoutStarts: checkoutStartsFromPricing,
        conversionRate: pricingSessions.size > 0 ? checkoutStartsFromPricing / pricingSessions.size : 0,
      },
      checkoutToPaid: {
        checkoutStarts: checkoutSessionIds.size,
        checkoutCompletions: completedCheckouts,
        conversionRate: checkoutSessionIds.size > 0 ? completedCheckouts / checkoutSessionIds.size : 0,
      },
    },
    previewConversion,
    blueprintReadiness: {
      checkoutCompletions: totalPaid,
      blueprintReadyCount,
      readyRate,
      medianTimeMs,
      medianTimeFormatted: formatDuration(medianTimeMs),
    },
    day7Return: {
      eligibleUsers,
      returnedUsers,
      returnRate,
    },
    retention: {
      firstInvoices,
      canceledBeforeSecond,
      secondInvoicePaid,
      cancellationRate,
      retentionRate,
    },
    samplerConversion,
  };
}
