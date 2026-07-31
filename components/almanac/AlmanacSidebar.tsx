'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu, Settings, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { K } from './tokens'
import { StarField } from './StarField'

type NavKey = 'today' | 'year' | 'self' | 'journal'
type CollapsibleNavKey = Extract<NavKey, 'self' | 'journal'>
type SubNavItem = { label: string; href: string; hint: string }

const NAV: ReadonlyArray<{
  key: NavKey
  label: string
  hint: string
  glyph: string
  tone: string
  href: string
  collapsible?: boolean
  subItems?: ReadonlyArray<SubNavItem>
}> = [
  {
    key: 'today',
    label: 'Today',
    hint: 'sky now · daily focus',
    glyph: '☉',
    tone: K.copper,
    href: '/today',
    subItems: [
      { label: 'Day planner', href: '/planner', hint: 'time-blocked daily planning' },
    ],
  },
  {
    key: 'year',
    label: 'Year',
    hint: 'calendar · blueprint · arcs',
    glyph: '◐',
    tone: K.ember,
    href: '/year',
    subItems: [
      { label: 'Blueprint',  href: '/blueprint',        hint: 'the full 52-week read' },
    ],
  },
  {
    key: 'self',
    label: 'Self',
    hint: 'natal · design · areas',
    glyph: '✺',
    tone: K.sage,
    href: '/self',
    collapsible: true,
    subItems: [
      { label: 'Human Design', href: '/self#design', hint: 'type · strategy · authority' },
      { label: 'Life areas', href: '/areas', hint: 'goals mapped to your chart' },
      { label: 'Curriculum', href: '/curriculum', hint: 'study plans · sessions' },
    ],
  },
  {
    key: 'journal',
    label: 'Journal',
    hint: 'entries · tracker · memory',
    glyph: '✎',
    tone: K.brickHi,
    href: '/journal',
    collapsible: true,
    subItems: [
      { label: 'Tracker',  href: '/tracker',         hint: 'daily rhythm · consistency' },
      { label: 'Insights', href: '/journal/insights', hint: `patterns ${BRAND.product} has noticed` },
      { label: 'Mind map', href: '/insights/map',     hint: 'capture topics as a living graph' },
    ],
  },
]

function splitSubHref(href: string): { pathname: string; hash: string } {
  const [pathAndQuery, hash = ''] = href.split('#')
  const [pathname] = pathAndQuery.split('?')
  return { pathname, hash: hash ? `#${hash}` : '' }
}

function isSectionActive(key: NavKey, pathname: string): boolean {
  if (key === 'today') {
    return pathname.startsWith('/today') || pathname.startsWith('/planner')
  }
  if (key === 'year') {
    return (
      pathname.startsWith('/calendar') ||
      pathname.startsWith('/blueprint') ||
      pathname.startsWith('/year')
    )
  }
  if (key === 'self') {
    return (
      pathname.startsWith('/human-design') ||
      pathname.startsWith('/areas') ||
      pathname.startsWith('/curriculum') ||
      pathname.startsWith('/self')
    )
  }
  return (
    pathname.startsWith('/journal') ||
    pathname.startsWith('/tracker') ||
    pathname.startsWith('/insights')
  )
}

const SIDEBAR_STORAGE_KEY = 'kiaros-desktop-sidebar-collapsed'

function ChromeMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `1px solid ${K.copper}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 30% 30%, ${K.bg3}, ${K.bg})`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg width={40} height={40} viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="20" cy="20" r="13" fill="none" stroke={K.copper} strokeWidth="0.5" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="none" stroke={K.copperHi} strokeWidth="0.5" opacity="0.8" />
          <circle cx="20" cy="7" r="1.6" fill={K.copperHi} />
          <circle cx="33" cy="20" r="1.1" fill={K.kairos} />
          <circle cx="11" cy="26" r="1.1" fill={K.starlight} />
        </svg>
      </div>
      {!collapsed ? (
        <div>
          <div
            style={{
              fontFamily: K.fSerif,
              fontStyle: 'italic',
              fontSize: 24,
              color: K.ink,
              lineHeight: 1,
            }}
          >
            {BRAND.product}
          </div>
          <div
            style={{
              fontFamily: K.fMono,
              fontSize: 10.5,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            <span style={{ color: K.kairos }}>●</span>{' '}
            <span style={{ color: K.copperHi }}>Almanac · {new Date().getFullYear()}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NavRow({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const navId = useId()
  const [currentHash, setCurrentHash] = useState('')
  const [openSections, setOpenSections] = useState<Record<CollapsibleNavKey, boolean>>({
    self: isSectionActive('self', pathname),
    journal: isSectionActive('journal', pathname),
  })

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash)
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [pathname])

  useEffect(() => {
    const activeKey = (['self', 'journal'] as const).find((key) =>
      isSectionActive(key, pathname),
    )
    if (!activeKey) return

    setOpenSections((current) =>
      current[activeKey] ? current : { ...current, [activeKey]: true },
    )
  }, [pathname])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {NAV.map((n) => {
        const isActive = isSectionActive(n.key, pathname)
        const subItems = n.subItems ?? []
        const collapsibleKey: CollapsibleNavKey | null =
          n.collapsible && (n.key === 'self' || n.key === 'journal') ? n.key : null
        const isExpanded = collapsibleKey ? openSections[collapsibleKey] : isActive
        const renderSubItems =
          !collapsed && subItems.length > 0 && (collapsibleKey !== null || isExpanded)
        const submenuId = `${navId}-${n.key}-submenu`

        return (
          <div
            key={n.key}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}
          >
          <Link
            href={n.href}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            aria-current={pathname === n.href ? 'page' : undefined}
            data-tour={`nav-${n.key}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              padding: collapsed
                ? '10px 6px'
                : collapsibleKey
                  ? '10px 56px 10px 12px'
                  : '10px 12px',
              borderRadius: 10,
              border: `1px solid ${isActive ? `${n.tone}66` : 'transparent'}`,
              background: isActive ? `linear-gradient(to right, ${n.tone}1a, transparent)` : 'transparent',
              justifyContent: collapsed ? 'center' : 'flex-start',
              textDecoration: 'none',
              transition: 'background 200ms ease, border-color 200ms ease',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1px solid ${isActive ? n.tone : K.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive ? n.tone : K.inkDim,
                fontFamily: K.fSerif,
                fontSize: 16,
                background: K.bg,
                flexShrink: 0,
              }}
            >
              {n.glyph}
            </div>
            {!collapsed ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 18,
                    fontWeight: 500,
                    color: isActive ? K.ink : K.inkDim,
                  }}
                >
                  {n.label}
                </div>
                <div
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    color: K.inkSoft,
                    marginTop: 2,
                  }}
                >
                  {n.hint}
                </div>
              </div>
            ) : null}
          </Link>
          {collapsibleKey && !collapsed ? (
            <button
              type="button"
              onClick={() =>
                setOpenSections((current) => ({
                  ...current,
                  [collapsibleKey]: !current[collapsibleKey],
                }))
              }
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${n.label}`}
              aria-expanded={isExpanded}
              aria-controls={submenuId}
              title={`${isExpanded ? 'Collapse' : 'Expand'} ${n.label}`}
              style={{
                position: 'absolute',
                right: 3,
                top: 3,
                width: 44,
                height: 44,
                border: 'none',
                borderRadius: 8,
                background: 'transparent',
                color: isActive ? n.tone : K.inkSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 200ms ease, color 200ms ease',
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : null}
          {renderSubItems ? (
            <div
              id={submenuId}
              hidden={!isExpanded}
              style={{
                display: isExpanded ? 'flex' : 'none',
                flexDirection: 'column',
                gap: 2,
                paddingLeft: 22,
                borderLeft: `1px solid ${n.tone}44`,
                marginLeft: 19,
              }}
            >
              {subItems.map((sub) => {
                const subParts = splitSubHref(sub.href)
                const pathMatches =
                  pathname === subParts.pathname ||
                  pathname.startsWith(`${subParts.pathname}/`)
                const subActive =
                  pathMatches && (!subParts.hash || currentHash === subParts.hash)
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={onNavigate}
                    aria-current={
                      subActive ? (subParts.hash ? 'location' : 'page') : undefined
                    }
                    data-tour={sub.href === '/curriculum' ? 'nav-curriculum' : undefined}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      padding: '6px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      background: subActive ? `${n.tone}14` : 'transparent',
                      transition: 'background 200ms ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: K.fBody,
                        fontSize: 16.5,
                        fontWeight: 500,
                        color: subActive ? K.ink : K.inkDim,
                      }}
                    >
                      {sub.label}
                    </span>
                    <span
                      style={{
                        fontFamily: K.fMono,
                        fontSize: 12,
                        letterSpacing: '0.1em',
                        color: K.inkSoft,
                      }}
                    >
                      {sub.hint}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : null}
          </div>
        )
      })}
    </div>
  )
}

function SidebarBody({
  pathname,
  collapsed,
  onToggleDesktop,
  onNavigate,
}: {
  pathname: string
  collapsed: boolean
  onToggleDesktop?: () => void
  onNavigate?: () => void
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        height: '100%',
        padding: collapsed ? '22px 10px 16px' : '22px 16px 16px',
        background: K.bg2,
        color: K.ink,
        fontFamily: K.fBody,
        overflow: 'hidden',
      }}
    >
      <StarField count={20} seed={11} opacity={0.12} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
        <div style={{ padding: '0 4px' }}>
          <Link href="/today" onClick={onNavigate} style={{ textDecoration: 'none' }}>
            <ChromeMark collapsed={collapsed} />
          </Link>
        </div>

        {onToggleDesktop ? (
          <button
            type="button"
            onClick={onToggleDesktop}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              height: 44,
              width: '100%',
              padding: collapsed ? 0 : '0 10px',
              borderRadius: 8,
              border: `1px solid ${K.line}`,
              background: 'transparent',
              color: K.inkDim,
              fontFamily: K.fMono,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {!collapsed ? <span>Collapse</span> : null}
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        ) : null}

        <div style={{ height: 1, background: K.line }} />

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: collapsed ? 0 : 2 }}>
          <NavRow
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>

        <div style={{ height: 1, background: K.line }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 6px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: { width: 30, height: 30 },
              },
            }}
          />
          {!collapsed ? (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: K.fMono, fontSize: 13, color: K.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Your chart
              </div>
            </div>
          ) : null}
          <Link
            href="/settings"
            onClick={onNavigate}
            title="Settings"
            aria-label="Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              color: pathname.startsWith('/settings') ? K.ink : K.inkSoft,
            }}
          >
            <Settings size={14} />
          </Link>
          <SignOutButton>
            <button
              type="button"
              title="Sign out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                minWidth: 44,
                height: 44,
                padding: collapsed ? 0 : '0 8px',
                justifyContent: 'center',
                fontFamily: K.fMono,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: K.inkSoft,
              }}
            >
              <LogOut size={14} />
              {!collapsed ? 'Sign out' : null}
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}

export function AlmanacSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false')
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-almanac-line transition-[width] duration-300 md:flex md:min-h-screen md:flex-col',
          collapsed ? 'w-[5.25rem]' : 'w-[19rem]'
        )}
        style={{ background: K.bg2 }}
      >
        <SidebarBody
          pathname={pathname}
          collapsed={collapsed}
          onToggleDesktop={() => setCollapsed((c) => !c)}
        />
      </aside>

      <div
        className="sticky top-0 z-50 w-full md:hidden"
        style={{
          background: K.bg2,
          borderBottom: `1px solid ${K.line}`,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/today" style={{ textDecoration: 'none' }}>
            <ChromeMark />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="almanac-mobile-nav"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: `1px solid ${K.line}`,
              background: K.bg,
              color: K.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 top-[4.25rem] z-40 backdrop-blur-sm md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            id="almanac-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            onClick={(e) => e.stopPropagation()}
            style={{
              height: '100%',
              width: 'min(20rem, 86vw)',
              borderRight: `1px solid ${K.line}`,
              overflowY: 'auto',
              paddingBottom: 'env(safe-area-inset-bottom)',
              background: K.bg2,
            }}
          >
            <SidebarBody
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
