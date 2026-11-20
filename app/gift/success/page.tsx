import type { Metadata } from "next";
import Link from "next/link";

import { GiftShareCard } from "@/components/commerce/GiftShareCard";
import { fulfillGiftCheckout, giftRedeemUrl } from "@/lib/commerce/gift-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your gift is ready | Kairos",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GiftSuccessPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const sessionParam = params.session_id;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return (
      <div className="page-wrapper">
        <div className="container py-12">
          <div className="shell-panel p-8">
            <p className="shell-kicker mb-3">Gift</p>
            <h1 className="shell-section-title">We&apos;re missing your checkout details.</h1>
            <p className="mt-4 text-sm leading-7 text-bone-muted">
              If you just paid, your gift code is also on its way to your email. If it doesn&apos;t arrive
              in a few minutes, reply to your Stripe receipt and we&apos;ll send it.
            </p>
            <Link
              href="/gift"
              className="mt-6 inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
            >
              Back to gifts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  try {
    const { gift, tier } = await fulfillGiftCheckout(sessionId);
    const forWhom = gift.recipient_name ? ` for ${gift.recipient_name}` : "";

    return (
      <div className="page-wrapper">
        <div className="container py-12 md:py-16">
          <div className="shell-panel-hero p-8 md:p-10">
            <p className="shell-kicker mb-4">Thank you</p>
            <h1 className="shell-hero-title max-w-3xl">Your gift{forWhom} is ready.</h1>
            <p className="shell-prose-lead mt-4 max-w-3xl">
              A year of {tier.name}. Give it whenever the moment is right. We&apos;ve also emailed the code to{" "}
              {gift.purchaser_email}.
            </p>

            <div className="mt-8 max-w-2xl">
              <GiftShareCard
                code={gift.code}
                redeemUrl={giftRedeemUrl(gift.code)}
                recipientName={gift.recipient_name}
              />
            </div>

            <div className="mt-8 grid max-w-2xl gap-2 text-sm leading-7 text-bone-muted">
              <p>
                When they open the link, they&apos;ll see your note, make an account and add the gift. Their
                year starts the day they redeem it.
              </p>
              <p>The code doesn&apos;t expire, and the year never renews or charges them.</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your payment went through, but the gift needs a moment.";
    return (
      <div className="page-wrapper">
        <div className="container py-12">
          <div className="shell-panel p-8">
            <p className="shell-kicker mb-3">Almost there</p>
            <h1 className="shell-section-title">We&apos;re still wrapping your gift.</h1>
            <p className="mt-4 text-sm leading-7 text-bone-muted">{message}</p>
            <p className="mt-2 text-sm leading-7 text-bone-muted">
              Your code will also arrive by email. Refreshing this page in a moment usually does it.
            </p>
            <Link
              href={`/gift/success?session_id=${encodeURIComponent(sessionId)}`}
              className="mt-6 inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
            >
              Try again
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
