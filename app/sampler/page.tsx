import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";

import { SamplerCheckoutButton } from "@/components/commerce/SamplerCheckoutButton";
import { StelloquyOrb } from "@/components/oracle/StelloquyOrb";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Try Stelloquy for $1 | Kairos",
  description:
    "Get three Stelloquy conversations grounded in your natal chart and current sky for $1.",
};

export default async function SamplerPage() {
  const { userId } = await auth();

  return (
    <div className="page-wrapper">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-stone-950/70 backdrop-blur-md supports-[backdrop-filter]:bg-stone-950/55">
        <div className="container flex items-center justify-between gap-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl tracking-wide text-bone transition-colors hover:text-leather-200"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-leather-300 to-plum-300 shadow-[0_0_12px_2px_rgba(216,180,151,0.35)]"
            />
            Kairos
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {userId ? (
              <Link
                href="/today"
                className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center rounded-full border border-border/80 px-4 py-2 text-sm font-medium text-bone transition-colors hover:border-leather-400/50"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-4xl pb-14 pt-10">
        <div className="shell-panel px-7 py-10 md:px-10 md:py-12">
          <div className="flex flex-col items-center text-center">
            <StelloquyOrb size={80} state="speaking" ariaLabel="Stelloquy" />
            
            <p className="shell-kicker mb-4 mt-6">Stelloquy Sampler</p>
            <h1 className="shell-hero-title max-w-2xl">
              Try three conversations grounded in your chart for $1
            </h1>

            <p className="shell-prose-lead mt-5 max-w-2xl">
              Get a taste of {BRAND.oracle} — three Stelloquy conversations that begin with your
              natal chart and the current sky already assembled.
            </p>

            <div className="mt-8 grid w-full max-w-lg gap-4 rounded-[1.15rem] border border-border/80 bg-stone-950/50 p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-leather-300/20 text-sm font-semibold text-leather-300">
                  1
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-bone">Your natal chart</p>
                  <p className="mt-1 text-sm text-bone-muted">
                    Sun, Moon, Rising, and all ten planetary placements from your birth data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-leather-300/20 text-sm font-semibold text-leather-300">
                  2
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-bone">Current sky conditions</p>
                  <p className="mt-1 text-sm text-bone-muted">
                    Live transits, Moon phase and sign, and active retrogrades
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-leather-300/20 text-sm font-semibold text-leather-300">
                  3
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-bone">Three messages</p>
                  <p className="mt-1 text-sm text-bone-muted">
                    Ask questions, follow up, or try different interpretive lenses
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {userId ? (
                <SamplerCheckoutButton
                  label="Buy sampler — $1"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-leather-300 px-6 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                />
              ) : (
                <Link
                  href="/sign-up?redirect_url=/sampler"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-leather-300 px-6 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
                >
                  Create account to buy sampler
                </Link>
              )}
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/80 px-6 text-sm font-semibold text-bone transition-colors hover:border-leather-400/50"
              >
                See full planner plans
              </Link>
            </div>

            <div className="mt-8 rounded-xl border border-border/60 bg-stone-900/40 px-5 py-4 text-left">
              <p className="text-sm font-medium text-bone">What this sampler does not include</p>
              <ul className="mt-3 space-y-2 text-sm text-bone-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bone-muted/60" />
                  No access to your planner, calendar, journal, or blueprint
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bone-muted/60" />
                  No journal memory or goal context (chart and sky only)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bone-muted/60" />
                  One sampler per account — this is a trial, not a monthly product
                </li>
              </ul>
            </div>

            <p className="mt-6 text-sm text-bone-muted">
              Want the full planner with ongoing Stelloquy access?{" "}
              <Link href="/pricing" className="text-bone underline hover:text-leather-300">
                See Planner + Oracle
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
