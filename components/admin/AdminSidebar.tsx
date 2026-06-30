'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/admin/sources', label: 'Sources', glyph: '*' },
  { href: '/admin/imports', label: 'Imports', glyph: 'v' },
  { href: '/admin/commerce', label: 'Commerce', glyph: '$' },
  { href: '/admin/drafts', label: 'Drafts', glyph: '#' },
  { href: '/admin/published', label: 'Published', glyph: '+' },
  { href: '/admin/mapping', label: 'Mapping', glyph: '@' },
  { href: '/admin/feedback', label: 'Feedback', glyph: '!' },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <ul className="space-y-0.5" role="list">
      {NAV_LINKS.map(({ href, label, glyph }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground',
              pathname.startsWith(href) ? 'bg-muted text-foreground' : 'text-muted-foreground'
            )}
          >
            <span className="w-4 text-center text-base leading-none" aria-hidden>
              {glyph}
            </span>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Link
            href="/admin/sources"
            className="text-lg font-bold tracking-tight transition-colors hover:text-muted-foreground"
          >
            Admin
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </nav>
        <div className="flex h-14 shrink-0 items-center border-t border-border px-4">
          <UserButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <Link
          href="/admin/sources"
          className="text-lg font-bold tracking-tight"
        >
          Admin
        </Link>
        <div className="flex items-center gap-3">
          <UserButton />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border transition-colors hover:bg-muted"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="h-full w-64 border-r border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center border-b border-border px-5">
              <span className="text-lg font-bold">Menu</span>
            </div>
            <nav className="overflow-y-auto px-3 py-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
