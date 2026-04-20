import Link from "next/link";

import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { COMMERCE_TIERS, CURRENT_PLANNER_YEAR, formatUsd } from "@/lib/commerce/config";

interface Props {
  isSignedIn: boolean;
  mode?: "home" | "pricing";
  showCanceledMessage?: boolean;
}

export function PublicPricingPage({
  isSignedIn,
  mode = "pricing",
  showCanceledMessage = false,
}: Props) {
  const isFullPage = mode === "pricing";

  return (
    <div className="page-wrapper">
      <div className="container py-10 md:py-14">
        <section className="shell-panel-hero px-7 py-10 md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="shell-kicker mb-4">Kiaros Commerce</p>
              <h1 className="shell-hero-title max-w-4xl">
                One-time planner access, with Oracle as the premium ladder.
              </h1>
              <p className="shell-prose-lead mt-5">
                Kiaros is sold as an owned planning system for {CURRENT_PLANNER_YEAR}, not a recurring
                subscription. Buy direct for the best price, or activate an Etsy purchase with the same
                planner access once your order is imported.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="#tiers"
                  className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                >
                  View the tier ladder
                </Link>
                <Link
                  href="/activate"
                  className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                >
                  Activate an Etsy purchase
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="shell-panel-soft p-5">
                <p className="shell-eyebrow">Direct</p>
                <p className="mt-2 text-lg font-semibold text-bone">Best price and fastest start</p>
                <p className="mt-3 text-sm leading-7 text-bone-muted">
                  Sign in, choose your tier, and we'll send you into Stripe Checkout with your
                  entitlement ready to activate when you return.
                </p>
              </div>
              <div className="shell-panel-soft p-5">
                <p className="shell-eyebrow">Etsy</p>
                <p className="mt-2 text-lg font-semibold text-bone">Marketplace-friendly handoff</p>
                <p className="mt-3 text-sm leading-7 text-bone-muted">
                  Etsy buyers still receive full Kiaros access. Once the order is imported, activation
                  happens at <span className="text-bone">kiaros.com/activate</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {showCanceledMessage ? (
          <div className="mt-6 rounded-[1.15rem] border border-border/80 bg-card/90 px-5 py-4 text-sm text-bone-muted">
            Your checkout was canceled before payment completed. Your tier is still here when you're
            ready.
          </div>
        ) : null}

        <section id="tiers" className="mt-8 grid gap-5 lg:grid-cols-2">
          {COMMERCE_TIERS.map((tier) => {
            const savings = tier.etsyPriceCents - tier.directPriceCents;

            return (
              <article key={tier.key} className="shell-panel p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="shell-kicker mb-3">{tier.shortName}</p>
                    <h2 className="shell-section-title">{tier.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-bone-muted">{tier.tagline}</p>
                  </div>
                  {tier.oracleEnabled ? <span className="shell-pill">Premium</span> : null}
                </div>

                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-bone">{formatUsd(tier.directPriceCents)}</p>
                    <p className="text-sm text-bone-muted">Direct purchase</p>
                  </div>
                  <div className="text-sm leading-6 text-bone-muted">
                    <p>Etsy: {formatUsd(tier.etsyPriceCents)}</p>
                    <p>Direct saves {formatUsd(savings)}</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-sm leading-7 text-bone-muted">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap gap-3">
                  {isSignedIn ? (
                    <CheckoutButton
                      tierKey={tier.key}
                      className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  ) : (
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                    >
                      Create account to buy direct
                    </Link>
                  )}
                  <Link
                    href="/activate"
                    className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                  >
                    Activate Etsy purchase
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {isFullPage ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="shell-panel p-6 md:p-7">
              <p className="shell-kicker mb-3">Why this ladder</p>
              <h2 className="shell-section-title">The planner is the core product. Oracle is the upgrade path.</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
                <p>
                  Kiaros is positioned as a one-time purchase because the planner itself is the product
                  promise. The direct ladder keeps that clear: one tier for the full planner, and one
                  higher tier for customers who want Oracle included from the start.
                </p>
                <p>
                  Etsy remains a legitimate purchase path, but the website is where the best price lives
                  and where long-term account activation happens.
                </p>
              </div>
            </article>

            <article className="shell-panel p-6 md:p-7">
              <p className="shell-kicker mb-3">Direct vs Etsy</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="shell-panel-inline px-5 py-4">
                  <p className="text-sm font-semibold text-bone">Buy direct if you want</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-bone-muted">
                    <li>The best available price</li>
                    <li>Immediate Stripe Checkout</li>
                    <li>Activation on return from checkout</li>
                  </ul>
                </div>
                <div className="shell-panel-inline px-5 py-4">
                  <p className="text-sm font-semibold text-bone">Choose Etsy if you want</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-bone-muted">
                    <li>Marketplace purchasing and gifting familiarity</li>
                    <li>A generic activation PDF after purchase</li>
                    <li>The same Kiaros entitlement once imported and activated</li>
                  </ul>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <section className="mt-8 shell-panel p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="shell-kicker mb-2">The ladder</p>
                <h2 className="shell-section-title">Direct keeps the planner primary and Oracle premium.</h2>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
              >
                See the full pricing breakdown
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
