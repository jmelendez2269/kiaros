import type { Metadata } from "next";
import Link from "next/link";

import { FunnelAttributionCapture } from "@/components/analytics/FunnelAttributionCapture";
import { GiftCheckoutForm, type GiftTierOption } from "@/components/commerce/GiftCheckoutForm";
import { BRAND } from "@/lib/brand";
import { formatUsd, getAllCommerceTiers, parseCommerceTierKey } from "@/lib/commerce/config";
import { getSalesYearCopy, getSellingPlannerYear } from "@/lib/commerce/planner-year";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const year = getSellingPlannerYear();
  return {
    title: `Give someone their ${year} | ${BRAND.product}`,
    description: `Give a year of ${BRAND.product}: a personalized planner built from their natal chart and the real transits of ${year}. One payment, no renewal.`,
  };
}

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GiftPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const canceled = (Array.isArray(params.canceled) ? params.canceled[0] : params.canceled) === "1";
  const tierParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const year = getSellingPlannerYear();
  // Only October through December, while the year-turn hook is showing.
  const showYearTurnCoverage = getSalesYearCopy().hook !== null;

  const tiers: GiftTierOption[] = getAllCommerceTiers().map((tier) => ({
    key: tier.key,
    name: tier.oracleEnabled ? "Planner + Oracle" : "Planner",
    price: formatUsd(tier.annualPriceCents),
    summary: tier.oracleEnabled
      ? `A full year of the planner, plus ${BRAND.oracle}, a conversation that knows their chart.`
      : "A full year: their Blueprint, calendar, journal and check-ins.",
  }));

  return (
    <div className="page-wrapper">
      <FunnelAttributionCapture />
      <div className="container py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="shell-panel-hero p-8 md:p-10">
            <p className="shell-kicker mb-4">A gift</p>
            <h1 className="shell-hero-title max-w-2xl">Give someone their {year}.</h1>
            <p className="shell-prose-lead mt-4 max-w-2xl">
              A year of {BRAND.product}, built from their own natal chart and the real sky of the
              year ahead: weeks to push, weeks to rest, and a plan that knows the difference.
            </p>

            {canceled ? (
              <p className="mt-6 rounded-2xl border border-border/80 bg-stone-950/50 px-4 py-3 text-sm text-bone-muted">
                Checkout was canceled, and nothing was charged. Your choices are below if you&apos;d like to try again.
              </p>
            ) : null}

            <div className="mt-8">
              <GiftCheckoutForm tiers={tiers} defaultTier={parseCommerceTierKey(tierParam) ?? "planner"} />
            </div>
          </section>

          <aside className="grid content-start gap-5">
            <section className="shell-panel p-6">
              <p className="shell-eyebrow">How it works</p>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-bone-muted">
                <li>
                  <span className="font-semibold text-bone">1. You pay once.</span> No account needed.
                </li>
                <li>
                  <span className="font-semibold text-bone">2. You get a gift code and a link.</span> Send it,
                  print it or write it in a card, whenever you like. The code doesn&apos;t expire.
                </li>
                <li>
                  <span className="font-semibold text-bone">3. They open it.</span> They make an account,
                  enter their birth details and goals, and their year begins the day they redeem it.
                </li>
              </ol>
            </section>

            <section className="shell-panel p-6">
              <p className="shell-eyebrow">Good to know</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-bone-muted">
                <li>It&apos;s one year. It never renews or charges them.</li>
                {showYearTurnCoverage ? (
                  <li>
                    Their year starts the day they redeem it. If they open it before {year} begins, it
                    runs through the end of {year}, so their {year} Blueprint is part of the gift.
                  </li>
                ) : null}
                <li>If they already have a paid year running, the gift starts the day after that year ends.</li>
                <li>
                  Not sure they&apos;re into astrology? The planner reads the chart as a structure for
                  reflection, not a prediction.
                </li>
              </ul>
            </section>

            <p className="px-1 text-sm leading-6 text-bone-muted">
              Got a gift code?{" "}
              <Link href="/gift/redeem" className="text-bone underline underline-offset-4 hover:text-leather-300">
                Open your gift
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
