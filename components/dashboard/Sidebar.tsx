'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { BookOpen, Brain, CalendarDays, ChevronLeft, ChevronRight, FileText, Hexagon, LockKeyhole, Menu, MessageSquare, Orbit, Sparkles, X } from 'lucide-react'
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
    href: '/human-design',
    label: 'Human Design',
    detailLead: 'Type & strategy',
    detailTrail: 'chart',
    icon: Hexagon,
    tone: {
      active: 'border-moss-400/60 bg-moss-500/18 text-bone shadow-glow',
      accent: 'bg-moss-300',
      icon: 'border-moss-300/30 bg-moss-500/12 text-moss-200',
      detail: 'text-moss-200',
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
  hasOracleAccess?: boolean
}

function NavigationContent({
  pathname,
  categories,
  isCollapsed,
  onNavigate,
  onToggleDesktop,
  hasOracleAccess = false,
}: {
  pathname: string
  categories: CategorySummary[]
  isCollapsed: boolean
  onNavigate?: () => void
  onToggleDesktop?: () => void
  hasOracleAccess?: boolean
}) {
  const isLinkActive = (href: string) => {
    if (href === '/areas') return pathname === href || pathname.startsWith('/areas/')
    if (href === '/journal') return pathname === href || pathname.startsWith('/journal/')
    return pathname === href
  }

  return (
    <>
      <div className={cn('border-b border-border/70 pb-3.5 pt-[1.125rem]', isCollapsed ? 'px-3' : 'px-[1.125rem]')}>
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-leather-500/24 bg-stone-950/70 text-leather-300 shadow-panel">
              <Orbit size={17} />
            </div>
            {!isCollapsed ? (
              <div>
                <p className="font-serif text-[1.5rem] leading-none text-bone">Life OS</p>
                <p className="mt-1 text-[11px] text-bone-muted">
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
              'mt-3 hidden h-9 items-center rounded-xl border border-border/70 bg-stone-950/65 text-bone-muted transition-colors hover:text-bone md:inline-flex',
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

      <div className={cn('py-3.5', isCollapsed ? 'px-2.5' : 'px-3')}>
        <div className="space-y-1">
          {NAV_LINKS.map(({ href, label, detailLead, detailTrail, icon: Icon, tone }) => {
            const isOracleLocked = href === '/oracle' && !hasOracleAccess
            const linkHref = isOracleLocked ? '/pricing' : href
            const DisplayIcon = isOracleLocked ? LockKeyhole : Icon
            const active = isLinkActive(href)
            return (
              <Link
                key={href}
                href={linkHref}
                onClick={onNavigate}
                title={isCollapsed ? (isOracleLocked ? 'Upgrade Oracle' : label) : undefined}
                className={cn(
                  'group flex rounded-[1rem] border transition-all duration-200',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'items-center gap-2.5 px-2.5 py-2.5',
                  active
                    ? tone.active
                    : 'border-transparent text-bone-muted hover:border-border/70 hover:bg-stone-850/65 hover:text-bone'
                )}
              >
                {!isCollapsed ? (
                  <span
                    className={cn(
                      'hidden h-8 w-1 shrink-0 rounded-full transition-opacity md:block',
                      active ? tone.accent : 'bg-transparent opacity-0 group-hover:opacity-100'
                    )}
                  />
                ) : null}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-[0.9rem] border transition-colors',
                    active
                      ? tone.icon
                      : 'border-border/60 bg-stone-950/65 text-bone-muted group-hover:text-bone'
                  )}
                >
                  <DisplayIcon size={16} />
                </div>
                {!isCollapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-[0.92rem] font-semibold">{label}</p>
                    <p className={cn('truncate text-[10px] leading-[1.125rem]', active ? 'text-bone/80' : 'text-bone-muted/70')}>
                      <span className={cn('font-medium', active ? tone.detail : 'text-bone/90')}>
                        {isOracleLocked ? 'Upgrade' : detailLead}
                      </span>
                      <span className="text-bone-muted/68"> {isOracleLocked ? 'required' : detailTrail}</span>
                    </p>
                  </div>
                ) : null}
              </Link>
            )
          })}
        </div>

        {!isCollapsed && categories.length > 0 && (
          <div className="mt-6">
            <p className="shell-kicker mb-3 px-2 text-bone-muted/70">Areas</p>
            <div className="space-y-1">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/areas/${slugifyAreaName(category.name)}`}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-[0.95rem] px-3 py-2 text-sm transition-colors',
                    pathname === `/areas/${slugifyAreaName(category.name)}`
                      ? 'bg-leather-500/15 text-bone'
                      : 'text-bone-muted hover:bg-stone-850/60 hover:text-bone'
                  )}
                >
                  <span className="w-5 text-center text-[0.95rem] leading-none">{category.icon_key ?? '-'}</span>
                  <span className="truncate">{category.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 px-2">
              <Link
                href="/areas"
                onClick={onNavigate}
                className="inline-flex w-full items-center justify-center rounded-[0.95rem] border border-leather-400/22 bg-leather-500/8 px-3 py-2.5 text-sm font-medium text-leather-200 transition-colors hover:border-leather-400/35 hover:bg-leather-500/14"
              >
                Add areas
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className={cn('mt-auto border-t border-border/70 py-3.5', isCollapsed ? 'px-3' : 'px-[1.125rem]')}>
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

export function Sidebar({ categories, hasOracleAccess = false }: SidebarProps) {
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

  useEffect(() => {
    if (!mobileOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border/70 bg-stone-900/72 bg-shell-glow transition-[width] duration-300 md:flex md:min-h-screen md:flex-col',
          desktopCollapsed ? 'w-[5.25rem]' : 'w-[14.5rem]'
        )}
      >
        <NavigationContent
          pathname={pathname}
          categories={categories}
          isCollapsed={desktopCollapsed}
          hasOracleAccess={hasOracleAccess}
          onToggleDesktop={() => setDesktopCollapsed((collapsed) => !collapsed)}
        />
      </aside>

      <div className="sticky top-0 z-50 w-full border-b border-border/70 bg-stone-900/88 px-4 py-4 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-[1.8rem] text-bone">Life OS</p>
            <p className="text-[11px] text-bone-muted">Kiaros planning shell</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-stone-950/80 text-bone"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-[5.5rem] z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="flex h-full w-[min(22rem,88vw)] flex-col overflow-y-auto border-r border-border/80 bg-stone-900/96 pb-[env(safe-area-inset-bottom)]"
            onClick={(event) => event.stopPropagation()}
          >
            <NavigationContent pathname={pathname} categories={categories} isCollapsed={false} hasOracleAccess={hasOracleAccess} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
