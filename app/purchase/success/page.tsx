import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { finalizeCheckoutSession } from "@/lib/commerce/stripe";
import { BRAND } from "@/lib/brand";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const params = (await searchParams) ?? {};
  const sessionParam = params.session_id;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;

  if (!sessionId) {
    return (
      <div className="page-wrapper">
        <div className="container py-12">
          <div className="shell-panel p-8">
            <p className="shell-kicker mb-3">Checkout</p>
            <h1 className="shell-section-title">We're missing the checkout session.</h1>
            <p className="mt-4 text-sm leading-7 text-bone-muted">
              Head back to pricing and start again if the redirect lost its session details.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
            >
              Return to pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  try {
    const result = await finalizeCheckoutSession({ sessionId, clerkUserId: userId });

    const bodyText = result.accessPlan === "monthly"
      ? `Checkout is complete, your monthly subscription is active, and your ${BRAND.product} access is linked to ${result.email}.`
      : `Checkout is complete, your annual entitlement is active, and your loyalty reward for next year has been reserved for ${result.email}.`;

    return (
      <div className="page-wrapper">
        <div className="container py-12 md:py-16">
          <div className="shell-panel-hero p-8 md:p-10">
            <p className="shell-kicker mb-4">Purchase Complete</p>
            <h1 className="shell-hero-title max-w-3xl">Your {result.tier.shortName} access is live.</h1>
            <p className="shell-prose-lead mt-4">{bodyText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {result.isRenewal ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                  >
                    Begin onboarding
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                  >
                    Go to dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Your payment went through, but activation needs a retry.";

    return (
      <div className="page-wrapper">
        <div className="container py-12">
          <div className="shell-panel p-8">
            <p className="shell-kicker mb-3">Checkout needs one more step</p>
            <h1 className="shell-section-title">We couldn't finish activation yet.</h1>
            <p className="mt-4 text-sm leading-7 text-bone-muted">{message}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/purchase/success?session_id=${encodeURIComponent(sessionId)}`}
                className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
              >
                Retry activation
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
              >
                Back to pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
