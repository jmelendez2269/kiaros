import Link from "next/link";

import { FieldNotesKitSubscribeForm } from "@/components/marketing/FieldNotesKitSubscribeForm";
import { StarField } from "@/components/almanac/StarField";
import { BRAND } from "@/lib/brand";
import type { FieldNotesUtmFieldKey } from "@/lib/marketing/field-notes-utm";

interface Props {
  joined: boolean;
  initialUtm?: Partial<Record<FieldNotesUtmFieldKey, string>>;
}

function FieldNotesMarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-almanac-line-hi bg-[rgba(10,12,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg text-almanac-copper-hi" aria-hidden>&#10022;</span>
          <span className="font-almanac-display text-lg tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>
        <nav className="flex items-center gap-4 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-dim sm:gap-6">
          <Link href="/stelloquy" className="transition-colors hover:text-almanac-ink">
            Stelloquy
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-almanac-ink">
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="hidden min-h-11 items-center sm:inline-flex transition-colors hover:text-almanac-ink"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function AlmanacMarketingFooter() {
  return (
    <footer className="border-t border-almanac-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span className="text-base text-almanac-copper-hi" aria-hidden>&#10022;</span>
          <span className="font-almanac-display text-sm tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
          <Link href="/field-notes" className="transition-colors hover:text-almanac-ink">
            Field Notes
          </Link>
          <Link href="/stelloquy" className="transition-colors hover:text-almanac-ink">
            Stelloquy
          </Link>
          <Link href="/contact" className="transition-colors hover:text-almanac-ink">
            Contact
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-almanac-ink">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-almanac-ink">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function FieldNotesPageContent({ joined, initialUtm }: Props) {
  return (
    <div className="min-h-screen bg-almanac-bg text-almanac-ink">
      <FieldNotesMarketingHeader />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <StarField count={72} seed={17} opacity={0.35} />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 45% at 20% 20%, rgba(112,75,210,0.18), transparent 65%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-2xl px-5 py-14 md:px-8 md:py-20">
          <h1 className="font-almanac-display text-4xl tracking-[0.06em] text-almanac-ink md:text-5xl">
            Field Notes, an email newsletter from Jack
          </h1>
          <p className="mt-6 text-base leading-7 text-almanac-ink-dim">
            Field Notes is Jack&apos;s email newsletter, written in his own words. Some issues are
            essays about timing, rest, and paying attention to the seasons of a life. Some are plain
            notes on building Kairos and the rest of Project Parallax in public.
          </p>
          <p className="mt-4 text-base leading-7 text-almanac-ink-dim">
            Each one lands in your inbox when it&apos;s written, with no schedule to keep up with.
            You can unsubscribe anytime.
          </p>

          {joined ? (
            <p
              className="mt-8 rounded-2xl border border-almanac-line-hi bg-[rgba(112,75,210,0.12)] px-5 py-4 text-sm leading-7 text-almanac-starlight"
              role="status"
            >
              Check your inbox to confirm, and Field Notes will arrive by email as they&apos;re
              written.
            </p>
          ) : null}

          {!joined ? (
            <div className="mt-8">
              <FieldNotesKitSubscribeForm
                layout="stacked"
                variant="almanac"
                initialUtm={initialUtm}
              />
            </div>
          ) : null}

          <p className="mt-6 text-sm leading-7 text-almanac-ink-dim">
            Want a look first?{" "}
            <a
              href="https://projectparallax.xyz/blog"
              className="text-almanac-copper-hi underline decoration-almanac-line-hi underline-offset-4 transition-colors hover:text-almanac-starlight"
            >
              Read a recent one
            </a>
            .
          </p>
        </div>
      </main>

      <AlmanacMarketingFooter />
    </div>
  );
}
