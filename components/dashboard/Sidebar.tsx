'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen, Brain, CalendarDays, ChevronLeft, ChevronRight, FileText, Menu, MessageSquare, Orbit, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { slugifyAreaName } from '@/lib/areas'
import { cn } from '@/lib/utils'

type CategorySummary = {
  id: string
  name: string
  icon_key: string | null
}

const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    detailLead: 'Life OS',
    detailTrail: 'home',
    icon: Sparkles,
    tone: {
      active: 'border-leather-400/60 bg-leather-500/18 text-bone shadow-glow',
      accent: 'bg-leather-300',
      icon: 'border-leather-300/30 bg-leather-500/12 text-leather-200',
      detail: 'text-leather-200',
    },
  },
  {
    href: '/calendar',
    label: 'Cosmic Plan',
    detailLead: 'Your year',
    detailTrail: 'map',
    icon: CalendarDays,
    tone: {
      active: 'border-plum-400/60 bg-plum-400/18 text-bone shadow-glow',
      accent: 'bg-plum-300',
      icon: 'border-plum-300/30 bg-plum-400/12 text-plum-300',
      detail: 'text-plum-300',
    },
  },
  {
    href: '/blueprint',
    label: 'Blueprint',
    detailLead: 'Celestial',
    detailTrail: 'architecture',
    icon: BookOpen,
    tone: {
      active: 'border-moss-400/60 bg-moss-500/18 text-bone shadow-glow',
      accent: 'bg-moss-300',
      icon: 'border-moss-300/30 bg-moss-500/12 text-moss-200',
      detail: 'text-moss-200',
    },
  },
  {
    href: '/areas',
    label: 'Areas',
    detailLead: 'Chart-specific',
    detailTrail: 'paths',
    icon: Orbit,
    tone: {
      active: 'border-leather-400/60 bg-leather-500/18 text-bone shadow-glow',
      accent: 'bg-leather-300',
      icon: 'border-leather-300/30 bg-leather-500/12 text-leather-200',
      detail: 'text-leather-200',
    },
  },
  {
    href: '/curriculum',
    label: 'Curriculum',
    detailLead: 'AI study',
    detailTrail: 'tracks',
    icon: Brain,
    tone: {
      active: 'border-plum-400/60 bg-plum-400/18 text-bone shadow-glow',
      accent: 'bg-plum-300',
      icon: 'border-plum-300/30 bg-plum-400/12 text-plum-300',
      detail: 'text-plum-300',
    },
  },
  {
    href: '/journal',
    label: 'Journal',
    detailLead: 'History',
    detailTrail: 'and entries',
    icon: FileText,
    tone: {
      active: 'border-moss-400/60 bg-moss-500/18 text-bone shadow-glow',
      accent: 'bg-moss-300',
      icon: 'border-moss-300/30 bg-moss-500/12 text-moss-200',
      detail: 'text-moss-200',
    },
  },
  {
    href: '/oracle',
    label: 'Oracle',
    detailLead: 'Guidance',
    detailTrail: 'channel',
    icon: MessageSquare,
    tone: {
      active: 'border-leather-400/60 bg-leather-500/18 text-bone shadow-glow',
      accent: 'bg-leather-300',
      icon: 'border-leather-300/30 bg-leather-500/12 text-leather-200',
      detail: 'text-leather-200',
    },
  },
] as const

const DESKTOP_SIDEBAR_STORAGE_KEY = 'kiaros-desktop-sidebar-collapsed'

interface SidebarProps {
  categories: CategorySummary[]
}

function NavigationContent({
  pathname,
  categories,
  isCollapsed,
  onNavigate,
  onToggleDesktop,
}: {
  pathname: string
  categories: CategorySummary[]
  isCollapsed: boolean
  onNavigate?: () => void
  onToggleDesktop?: () => void
}) {
  const isLinkActive = (href: string) => (href === '/areas' ? pathname === href || pathname.startsWith('/areas/') : pathname === href)

  return (
    <>
      <div className={cn('border-b border-border/80 pb-4 pt-5', isCollapsed ? 'px-3' : 'px-5')}>
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-leather-500/30 bg-stone-950/80 text-leather-300 shadow-panel">
              <Orbit size={18} />
            </div>
            {!isCollapsed ? (
              <div>
                <p className="font-serif text-[1.7rem] leading-none text-bone">Life OS</p>
                <p className="mt-1 text-xs text-bone-muted">
                  <span className="text-leather-200">Kiaros</span>
                  <span className="text-bone-muted/70"> · Personalized planning</span>
                </p>
              </div>
            ) : null}
          </div>
        </Link>

        {onToggleDesktop ? (
          <button
            type="button"
            onClick={onToggleDesktop}
            className={cn(
              'mt-3 hidden h-10 items-center rounded-xl border border-border/80 bg-stone-950/75 text-bone-muted transition-colors hover:text-bone md:inline-flex',
              isCollapsed ? 'w-full justify-center' : 'w-full justify-between px-3'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {!isCollapsed ? <span className="text-xs font-medium uppercase tracking-[0.16em]">Collapse</span> : null}
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        ) : null}
      </div>

      <div className={cn('py-4', isCollapsed ? 'px-2.5' : 'px-3.5')}>
        <div className="space-y-1.5">
          {NAV_LINKS.map(({ href, label, detailLead, detailTrail, icon: Icon, tone }) => {
            const active = isLinkActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={isCollapsed ? label : undefined}
                className={cn(
                  'group flex rounded-2xl border transition-all duration-200',
                  isCollapsed ? 'justify-center px-2 py-3' : 'items-center gap-3 px-3 py-2.5',
                  active
                    ? tone.active
                    : 'border-transparent text-bone-muted hover:border-border/80 hover:bg-stone-850/80 hover:text-bone'
                )}
              >
                {!isCollapsed ? (
                  <span
                    className={cn(
                      'hidden h-10 w-1 shrink-0 rounded-full transition-opacity md:block',
                      active ? tone.accent : 'bg-transparent opacity-0 group-hover:opacity-100'
                    )}
                  />
                ) : null}
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                    active
                      ? tone.icon
                      : 'border-border/60 bg-stone-950/65 text-bone-muted group-hover:text-bone'
                  )}
                >
                  <Icon size={17} />
                </div>
                {!isCollapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{label}</p>
                    <p className={cn('truncate text-[11px] leading-5', active ? 'text-bone/80' : 'text-bone-muted/70')}>
                      <span className={cn('font-medium', active ? tone.detail : 'text-bone/90')}>
                        {detailLead}
                      </span>
                      <span className="text-bone-muted/68"> {detailTrail}</span>
                    </p>
                  </div>
                ) : null}
              </Link>
            )
          })}
        </div>

        {!isCollapsed && categories.length > 0 && (
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

      <div className={cn('mt-auto border-t border-border/80 py-4', isCollapsed ? 'px-3' : 'px-5')}>
        <div className={cn('mb-1 flex items-center text-xs text-bone-muted', isCollapsed ? 'justify-center' : 'justify-between')}>
          {!isCollapsed ? (
            <div>
              <p className="shell-kicker text-bone-muted/70">Custom Year</p>
              <p className="mt-1">Birth chart first - customization next</p>
            </div>
          ) : null}
          <UserButton />
        </div>
      </div>
    </>
  )
}

export function Sidebar({ categories }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY)
    setDesktopCollapsed(savedPreference === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, desktopCollapsed ? 'true' : 'false')
  }, [desktopCollapsed])

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border/80 bg-stone-900/85 bg-shell-glow transition-[width] duration-300 md:flex md:min-h-screen md:flex-col',
          desktopCollapsed ? 'w-[5.5rem]' : 'w-[15.5rem]'
        )}
      >
        <NavigationContent
          pathname={pathname}
          categories={categories}
          isCollapsed={desktopCollapsed}
          onToggleDesktop={() => setDesktopCollapsed((collapsed) => !collapsed)}
        />
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
            <NavigationContent pathname={pathname} categories={categories} isCollapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
