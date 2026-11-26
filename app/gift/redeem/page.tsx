import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { GiftRedeemPanel } from "@/components/commerce/GiftRedeemPanel";
import { BRAND } from "@/lib/brand";
import { normalizeGiftCode } from "@/lib/commerce/gift";
import { loadGiftPreview } from "@/lib/commerce/gift-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Open your gift | ${BRAND.product}`,
  robots: { index: false, follow: false },
};

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GiftRedeemPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const codeParam = Array.isArray(params.code) ? params.code[0] : params.code;
  const { userId } = await auth();

  const code = normalizeGiftCode(codeParam);
  const gift = code ? await loadGiftPreview(code) : null;

  let notice: string | null = null;
  if (codeParam && !gift) {
    notice = "We couldn't find a gift with that code. Please check it and try again.";
  } else if (gift && (gift.status === "refunded" || gift.status === "voided")) {
    notice = "This gift is no longer active. If that looks wrong, please contact us.";
  }

  // A redeemed gift still shows its button to a signed-in member: the API
  // answers the member who redeemed it with their dates, and tells anyone
  // else it's taken.
  const redeemable = !!gift && (gift.status === "paid" || (gift.status === "redeemed" && !!userId));
  const alreadyOpened = gift?.status === "redeemed" && !userId;

  const heading = gift
    ? gift.recipientName
      ? `${gift.recipientName}, someone gave you a year.`
      : "Someone gave you a year."
    : "Open your gift.";

  return (
    <div className="page-wrapper">
      <div className="container py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="shell-panel-hero p-8 md:p-10">
            <p className="shell-kicker mb-4">A gift for you</p>
            <h1 className="shell-hero-title max-w-2xl">{heading}</h1>

            {gift ? (
              <p className="shell-prose-lead mt-4 max-w-2xl">
                {gift.purchaserName ? `${gift.purchaserName} gave you` : "This is"} a year of {gift.tierName}: a
                planner built from your own natal chart and the real sky of the year ahead, with weeks to push and
                weeks to rest.
              </p>
            ) : (
              <p className="shell-prose-lead mt-4 max-w-2xl">
                Enter the code from your gift card or message.
              </p>
            )}

            {gift?.giftMessage ? (
              <blockquote className="mt-6 max-w-2xl whitespace-pre-line rounded-[1.1rem] border border-leather-300/35 bg-leather-300/10 px-5 py-4 font-serif text-lg italic leading-8 text-bone">
                {gift.giftMessage}
                {gift.purchaserName ? (
                  <footer className="mt-2 text-sm not-italic text-leather-200">{gift.purchaserName}</footer>
                ) : null}
              </blockquote>
            ) : null}

            {notice ? (
              <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                {notice}
              </p>
            ) : null}
            {alreadyOpened ? (
              <p className="mt-6 rounded-2xl border border-border/80 bg-stone-950/50 px-4 py-3 text-sm text-bone-muted">
                This gift has already been opened. If it was you, sign in to see it on your account.
              </p>
            ) : null}

            <div className="mt-8">
              <GiftRedeemPanel code={gift ? gift.code : null} isSignedIn={!!userId} redeemable={redeemable} />
            </div>
          </section>

          <aside className="grid content-start gap-5">
            <section className="shell-panel p-6">
              <p className="shell-eyebrow">What happens next</p>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-bone-muted">
                <li>
                  <span className="font-semibold text-bone">1. Add the gift.</span> Your year starts the day you add it.
                </li>
                <li>
                  <span className="font-semibold text-bone">2. Tell it about you.</span> Your birth date, time and
                  place, and your goals in your own words.
                </li>
                <li>
                  <span className="font-semibold text-bone">3. Your Blueprint is built.</span> 52 weeks, 12 months and
                  4 quarters, shaped by your chart.
                </li>
              </ol>
            </section>
            <section className="shell-panel p-6">
              <p className="shell-eyebrow">Good to know</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-bone-muted">
                <li>It&apos;s already paid for. No card needed, and it never renews or charges you.</li>
                <li>You don&apos;t have to take the stars literally. It&apos;s a structure for reflection, not a forecast.</li>
              </ul>
            </section>
            <p className="px-1 text-sm leading-6 text-bone-muted">
              Want to give one too?{" "}
              <Link href="/gift" className="text-bone underline underline-offset-4 hover:text-leather-300">
                Give a year
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
