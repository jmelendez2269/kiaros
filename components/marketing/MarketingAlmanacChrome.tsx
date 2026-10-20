import type { ReactNode } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";
import { BRAND } from "@/lib/brand";

export function MarketingAlmanacHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-almanac-line-hi bg-[rgba(10,12,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size="header" />
          <span className="font-almanac-display text-lg tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>
        <nav className="flex items-center gap-4 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-dim sm:gap-6">
          <Link href="/guides" className="transition-colors hover:text-almanac-ink">
            Guides
          </Link>
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

export function MarketingAlmanacFooter() {
  return (
    <footer className="border-t border-almanac-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <BrandMark size="footer" />
          <span className="font-almanac-display text-sm tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
          <Link href="/guides" className="transition-colors hover:text-almanac-ink">
            Guides
          </Link>
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

export function MarketingAlmanacShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-almanac-bg text-almanac-ink">
      <MarketingAlmanacHeader />
      {children}
      <MarketingAlmanacFooter />
    </div>
  );
}
