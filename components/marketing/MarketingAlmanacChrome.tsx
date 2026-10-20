"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";
import { BRAND } from "@/lib/brand";

const HEADER_NAV_LINKS = [
  { href: "/guides", label: "Guides" },
  { href: "/stelloquy", label: "Stelloquy" },
  { href: "/pricing", label: "Pricing" },
] as const;

const navLinkClass =
  "transition-colors hover:text-almanac-ink min-h-11 inline-flex items-center";

export function MarketingAlmanacHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-almanac-line-hi bg-[rgba(10,12,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-5 md:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <BrandMark size="header" />
          <span className="truncate font-almanac-display text-base tracking-[0.06em] text-almanac-ink sm:text-lg sm:tracking-[0.08em]">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>

        <nav
          className="hidden min-w-0 items-center gap-2 font-almanac-mono text-[0.62rem] uppercase tracking-[0.1em] text-almanac-ink-dim sm:flex sm:gap-3 sm:text-[0.68rem] sm:tracking-[0.14em] md:gap-5"
          aria-label="Primary"
        >
          {HEADER_NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
          <Link href="/sign-in" className={navLinkClass}>
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-almanac-line text-almanac-ink-dim transition-colors hover:border-almanac-line-hi hover:text-almanac-ink sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="marketing-almanac-mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="marketing-almanac-mobile-nav"
          className="border-t border-almanac-line px-3 py-3 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-dim sm:hidden"
          aria-label="Primary mobile"
        >
          <ul className="flex flex-col gap-1">
            {HEADER_NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${navLinkClass} w-full px-1`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-in"
                className={`${navLinkClass} w-full px-1`}
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
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
