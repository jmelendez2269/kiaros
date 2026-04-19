import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/admin/sources", label: "Sources", glyph: "◈" },
  { href: "/admin/imports", label: "Imports", glyph: "↓" },
  { href: "/admin/drafts", label: "Drafts", glyph: "◻" },
  { href: "/admin/published", label: "Published", glyph: "✦" },
  { href: "/admin/mapping", label: "Mapping", glyph: "◉" },
];

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href="/admin/sources"
          className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
        >
          Admin
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5" role="list">
          {NAV_LINKS.map(({ href, label, glyph }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <span
                  className="w-4 text-center text-base leading-none"
                  aria-hidden
                >
                  {glyph}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      <div className="flex h-14 shrink-0 items-center border-t border-border px-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
