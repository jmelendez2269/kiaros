"use client";

import { useRouter } from "next/navigation";
import type { FunnelMetrics, MetricsDateRange } from "@/lib/analytics/metrics";

interface MetricsViewProps {
  metrics: FunnelMetrics;
  dateRange: MetricsDateRange;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function MetricCard({
  title,
  definition,
  children,
}: {
  title: string;
  definition: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{definition}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function MetricsView({ metrics, dateRange }: MetricsViewProps) {
  const router = useRouter();

  const handleDateChange = (start: string, end: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    router.push(url.pathname + url.search);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funnel & Retention Metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Primary acquisition and retention metrics from first_party_funnel_events
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-sm text-muted-foreground">
              From
            </label>
            <input
              type="date"
              id="start-date"
              value={dateRange.start}
              onChange={(e) => handleDateChange(e.target.value, dateRange.end)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm text-muted-foreground">
              To
            </label>
            <input
              type="date"
              id="end-date"
              value={dateRange.end}
              onChange={(e) => handleDateChange(dateRange.start, e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Metric 1: Revenue per pricing visitor */}
        <MetricCard
          title="1. Revenue per Pricing Visitor"
          definition="14-day net first-payment revenue divided by unique pricing page visitors in the 14 days ending on the selected end date."
        >
          <DataRow
            label="Total revenue"
            value={formatCurrency(metrics.revenuePerPricingVisitor.totalRevenueCents)}
          />
          <DataRow
            label="Unique pricing visitors (14d)"
            value={metrics.revenuePerPricingVisitor.uniquePricingVisitors}
          />
          <div className="mt-3 border-t border-border pt-3">
            <DataRow
              label="Revenue per visitor"
              value={formatCurrency(metrics.revenuePerPricingVisitor.revenuePerVisitorCents)}
            />
          </div>
        </MetricCard>

        {/* Metric 2: Conversion rates */}
        <MetricCard
          title="2. Conversion Rates"
          definition="Pricing-to-checkout: pricing_viewed → checkout_started (same session). Checkout-to-paid: checkout_started → checkout_completed (same Stripe session)."
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Pricing → Checkout</div>
              <DataRow
                label="Pricing viewers"
                value={metrics.conversionRates.pricingToCheckout.pricingViewers}
              />
              <DataRow
                label="Started checkout"
                value={metrics.conversionRates.pricingToCheckout.checkoutStarts}
              />
              <DataRow
                label="Conversion rate"
                value={formatPercent(metrics.conversionRates.pricingToCheckout.conversionRate)}
              />
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground">Checkout → Paid</div>
              <DataRow
                label="Checkout starts"
                value={metrics.conversionRates.checkoutToPaid.checkoutStarts}
              />
              <DataRow
                label="Completed"
                value={metrics.conversionRates.checkoutToPaid.checkoutCompletions}
              />
              <DataRow
                label="Conversion rate"
                value={formatPercent(metrics.conversionRates.checkoutToPaid.conversionRate)}
              />
            </div>
          </div>
        </MetricCard>

        {/* Metric 3: Preview conversion */}
        <MetricCard
          title="3. Preview-to-Paid vs Paid-First"
          definition="Preview-to-paid: users who viewed the personalized week reading before completing checkout. Paid-first: users who paid without preview events."
        >
          {metrics.previewConversion.available ? (
            <>
              <DataRow label="Preview viewers" value={metrics.previewConversion.previewViewers!} />
              <DataRow label="Preview → paid" value={metrics.previewConversion.previewConverted!} />
              <DataRow
                label="Preview conversion rate"
                value={formatPercent(metrics.previewConversion.previewConversionRate!)}
              />
              <div className="mt-3 border-t border-border pt-3">
                <DataRow label="Paid-first (no preview)" value={metrics.previewConversion.paidFirstCount!} />
                <DataRow label="Total paid" value={metrics.previewConversion.totalPaid!} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              N/A: {metrics.previewConversion.reason}
            </div>
          )}
        </MetricCard>

        {/* Metric 4: Blueprint readiness */}
        <MetricCard
          title="4. Blueprint Readiness"
          definition="Blueprint-ready rate: blueprint_ready events divided by checkout_completed events. Median time: median completion_duration_ms from blueprint_ready metadata."
        >
          <DataRow label="Checkout completions" value={metrics.blueprintReadiness.checkoutCompletions} />
          <DataRow label="Blueprint ready" value={metrics.blueprintReadiness.blueprintReadyCount} />
          <DataRow label="Ready rate" value={formatPercent(metrics.blueprintReadiness.readyRate)} />
          <div className="mt-3 border-t border-border pt-3">
            <DataRow
              label="Median time to ready"
              value={metrics.blueprintReadiness.medianTimeFormatted}
            />
          </div>
        </MetricCard>

        {/* Metric 5: Day-7 return */}
        <MetricCard
          title="5. Day-7 Return"
          definition="day_7_return events divided by checkout_completed events from 7+ days before the range end date. Measures early engagement."
        >
          <DataRow label="Eligible users (paid 7+ days ago)" value={metrics.day7Return.eligibleUsers} />
          <DataRow label="Returned on day 7" value={metrics.day7Return.returnedUsers} />
          <div className="mt-3 border-t border-border pt-3">
            <DataRow label="Return rate" value={formatPercent(metrics.day7Return.returnRate)} />
          </div>
        </MetricCard>

        {/* Metric 6: Retention */}
        <MetricCard
          title="6. Cancellation & Retention"
          definition="Cancellation before second invoice: subscription_canceled events where metadata.invoice_number = 1. Second-invoice retention: second_invoice_paid events divided by first invoices."
        >
          <DataRow label="First invoices" value={metrics.retention.firstInvoices} />
          <DataRow label="Canceled before 2nd invoice" value={metrics.retention.canceledBeforeSecond} />
          <DataRow label="Second invoice paid" value={metrics.retention.secondInvoicePaid} />
          <div className="mt-3 border-t border-border pt-3">
            <DataRow label="Cancellation rate" value={formatPercent(metrics.retention.cancellationRate)} />
            <DataRow label="Retention rate" value={formatPercent(metrics.retention.retentionRate)} />
          </div>
        </MetricCard>

        {/* Metric 7: Sampler conversion */}
        <MetricCard
          title="7. Sampler-to-Subscription"
          definition="paid_upgrade_completed events (where metadata.is_upgrade = true) divided by sampler_purchased events. Measures sampler conversion to full subscription."
        >
          {metrics.samplerConversion.available ? (
            <>
              <DataRow label="Sampler purchases" value={metrics.samplerConversion.samplerPurchases!} />
              <DataRow label="Upgraded to subscription" value={metrics.samplerConversion.samplerUpgrades!} />
              <div className="mt-3 border-t border-border pt-3">
                <DataRow
                  label="Conversion rate"
                  value={formatPercent(metrics.samplerConversion.conversionRate!)}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              N/A: {metrics.samplerConversion.reason}
            </div>
          )}
        </MetricCard>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Metric Definitions</h3>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <strong className="text-foreground">Data source:</strong>{" "}
            <span className="text-muted-foreground">
              All metrics are calculated from the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                first_party_funnel_events
              </code>{" "}
              table. Date ranges are inclusive and use UTC time.
            </span>
          </div>
          <div>
            <strong className="text-foreground">Attribution:</strong>{" "}
            <span className="text-muted-foreground">
              Anonymous visitors are tracked via anonymous_id until they authenticate, at which point
              events are linked via user_id. Session-based conversions use session_id; checkout-to-paid
              conversions use stripe_checkout_session_id.
            </span>
          </div>
          <div>
            <strong className="text-foreground">Privacy:</strong>{" "}
            <span className="text-muted-foreground">
              This table never stores journal text, birth data, Stelloquy prompts, or Blueprint content.
              Only counts, rates, and high-level product/timing metadata are recorded.
            </span>
          </div>
          <div>
            <strong className="text-foreground">Reproducibility:</strong>{" "}
            <span className="text-muted-foreground">
              All calculations use standard SQL aggregations on the funnel events table. The calculation
              logic is available in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                lib/analytics/metrics.ts
              </code>
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
