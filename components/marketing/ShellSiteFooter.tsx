import Link from "next/link";

import { FieldNotesFooterSignup } from "./FieldNotesFooterSignup";

export function ShellSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <FieldNotesFooterSignup variant="shell" />
      <footer className="border-t border-border/50 bg-stone-950/40">
        <div className="container flex flex-col gap-4 py-8 text-sm text-bone-muted md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-display text-bone transition-colors hover:text-leather-200">
            Kairos
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/field-notes" className="transition-colors hover:text-bone">Field Notes</Link>
            <Link href="/pricing" className="transition-colors hover:text-bone">Pricing</Link>
            <Link href="/stelloquy" className="transition-colors hover:text-bone">Stelloquy</Link>
            <Link href="/contact" className="transition-colors hover:text-bone">Contact</Link>
            <Link href="/privacy" className="transition-colors hover:text-bone">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-bone">Terms</Link>
          </nav>
          <p className="text-xs text-bone-muted/70">© {year} Kairos</p>
        </div>
      </footer>
    </>
  );
}
