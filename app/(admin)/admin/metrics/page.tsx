import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculateFunnelMetrics } from "@/lib/analytics/metrics";
import { MetricsView } from "@/components/admin/MetricsView";

/**
 * Admin funnel and retention metrics dashboard.
 * 
 * Displays the seven primary metrics defined in the Access, Memory, and Commerce roadmap:
 * 
 * 1. 14-day net first-payment revenue per unique pricing visitor
 * 2. Pricing-to-checkout and checkout-to-paid conversion
 * 3. Preview-to-paid conversion vs paid-first conversion
 * 4. Blueprint-ready rate and median time to ready
 * 5. Day-7 return
 * 6. Cancellation before second invoice + second-invoice retention
 * 7. Sampler-to-subscription conversion
 * 
 * All metrics are calculated from the first_party_funnel_events table.
 * Date ranges are selectable via the UI.
 */
export default async function MetricsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  
  // Default to last 30 days
  const endDate = params.end ?? new Date().toISOString().split('T')[0];
  const startDate = params.start ?? (() => {
    const date = new Date(endDate);
    date.setUTCDate(date.getUTCDate() - 30);
    return date.toISOString().split('T')[0];
  })();

  const supabase = createAdminSupabase();
  const metrics = await calculateFunnelMetrics(supabase, {
    start: startDate,
    end: endDate,
  });

  return (
    <MetricsView
      metrics={metrics}
      dateRange={{ start: startDate, end: endDate }}
    />
  );
}
