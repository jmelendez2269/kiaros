'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen, Brain, CalendarDays, Menu, MessageSquare, Orbit, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { slugifyAreaName } from '@/lib/areas'
import { cn } from '@/lib/utils'

type CategorySummary = {
  id: string
  name: string
  icon_key: string | null
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', detail: 'Life OS home', icon: Sparkles },
  { href: '/calendar', label: 'Cosmic Plan', detail: 'Your year map', icon: CalendarDays },
  { href: '/blueprint', label: 'Blueprint', detail: 'Celestial architecture', icon: BookOpen },
  { href: '/areas', label: 'Areas', detail: 'Chart-specific paths', icon: Orbit },
  { href: '/curriculum', label: 'Curriculum', detail: 'AI study tracks', icon: Brain },
  { href: '/oracle', label: 'Oracle', detail: 'Guidance channel', icon: MessageSquare },
] as const

interface SidebarProps {
  categories: CategorySummary[]
}

function NavigationContent({
  pathname,
  categories,
  onNavigate,
}: {
  pathname: string
  categories: CategorySummary[]
  onNavigate?: () => void
}) {
  const isLinkActive = (href: string) => (href === '/areas' ? pathname === href || pathname.startsWith('/areas/') : pathname === href)

  return (
    <>
      <div className="border-b border-border/80 px-6 pb-6 pt-7">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-leather-500/30 bg-stone-950/80 text-leather-300 shadow-panel">
              <Orbit size={18} />
            </div>
            <div>
              <p className="font-serif text-[2rem] leading-none text-bone">Life OS</p>
              <p className="mt-1 text-sm text-bone-muted">Kiaros - Personalized planning</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 py-5">
        <div className="space-y-2">
          {NAV_LINKS.map(({ href, label, detail, icon: Icon }) => {
            const active = isLinkActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200',
                  active
                    ? 'border-leather-400/60 bg-leather-500/42 text-bone shadow-glow'
                    : 'border-transparent text-bone-muted hover:border-border/80 hover:bg-stone-850/80 hover:text-bone'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
                    active
                      ? 'border-leather-300/30 bg-black/15 text-bone'
                      : 'border-border/60 bg-stone-950/65 text-bone-muted group-hover:text-bone'
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{label}</p>
                  <p className={cn('truncate text-xs', active ? 'text-bone/80' : 'text-bone-muted/70')}>
                    {detail}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {categories.length > 0 && (
          <div className="mt-8">
            <p className="shell-kicker mb-3 px-2 text-bone-muted/70">Areas</p>
            <div className="space-y-1.5">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/areas/${slugifyAreaName(category.name)}`}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    pathname === `/areas/${slugifyAreaName(category.name)}`
                      ? 'bg-leather-500/15 text-bone'
                      : 'text-bone-muted hover:bg-stone-850/70 hover:text-bone'
                  )}
                >
                  <span className="w-5 text-center text-base leading-none">{category.icon_key ?? '-'}</span>
                  <span className="truncate">{category.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 px-2">
              <Link
                href="/areas"
                onClick={onNavigate}
                className="inline-flex w-full items-center justify-center rounded-xl border border-leather-400/25 bg-leather-500/10 px-3 py-2.5 text-sm font-medium text-leather-200 transition-colors hover:border-leather-400/40 hover:bg-leather-500/16"
              >
                Add areas
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-border/80 px-5 py-4">
        <div className="mb-3 flex items-center justify-between text-xs text-bone-muted">
          <div>
            <p className="shell-kicker text-bone-muted/70">Custom Year</p>
            <p className="mt-1">Birth chart first - customization next</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </>
  )
}

export function Sidebar({ categories }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="hidden w-[18.75rem] shrink-0 border-r border-border/80 bg-stone-900/85 bg-shell-glow md:flex md:min-h-screen md:flex-col">
        <NavigationContent pathname={pathname} categories={categories} />
      </aside>

      <div className="sticky top-0 z-40 border-b border-border/80 bg-stone-900/90 px-4 py-4 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-2xl text-bone">Life OS</p>
            <p className="text-xs text-bone-muted">Kiaros planning shell</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-stone-950/80 text-bone"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden">
          <div className="h-full w-[88%] max-w-[22rem] border-r border-border/80 bg-stone-900/96">
            <NavigationContent pathname={pathname} categories={categories} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
