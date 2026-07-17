'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import { ChevronLeft, ChevronRight, LogOut, Menu, Settings, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { slugifyAreaName } from '@/lib/areas'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { K } from './tokens'
import { StarField } from './StarField'

type CategorySummary = {
  id: string
  name: string
  icon_key: string | null
}

interface SidebarProps {
  categories: CategorySummary[]
  hasOracleAccess?: boolean
}

// Four doors. The fifth (Stelloquy) is the orb, not a tab.
// Self now points at /self (the "One Reading" chapter page). Year/Journal
// hrefs still point at existing routes for now; later phases flip these to
// /year, /journal-new as those screens land.
type SubNavItem = { label: string; href: string; hint: string }

const NAV: ReadonlyArray<{
  key: 'today' | 'year' | 'self' | 'journal'
  label: string
  hint: string
  glyph: string
  tone: string
  href: string
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
      { label: 'Planner', href: '/planner', hint: 'day · week · month, time-blocked' },
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
      { label: 'Month',      href: '/year?view=month',  hint: 'lunar month · intentions' },
      { label: 'Week',       href: '/year?view=week',   hint: 'current week · curriculum' },
      { label: 'Review',     href: '/year?view=review', hint: 'quarterly wins · pivots' },
      { label: 'Blueprint',  href: '/blueprint',        hint: 'the full 52-week read' },
      { label: 'Curriculum', href: '/curriculum',       hint: 'study plans · sessions' },
    ],
  },
  {
    key: 'self',
    label: 'Self',
    hint: 'natal · design · areas',
    glyph: '✺',
    tone: K.sage,
    href: '/self',
    subItems: [
      { label: 'Areas', href: '/areas', hint: 'goals mapped to your chart' },
    ],
  },
  {
    key: 'journal',
    label: 'Journal',
    hint: 'entries · tracker · memory',
    glyph: '✎',
    tone: K.brickHi,
    href: '/journal',
    subItems: [
      { label: 'Tracker',  href: '/tracker',         hint: 'daily rhythm · consistency' },
      { label: 'Insights', href: '/journal/insights', hint: `patterns ${BRAND.product} has noticed` },
      { label: 'Mind map', href: '/insights/map',     hint: 'capture topics as a living graph' },
    ],
  },
]

// Sub-items can carry a `?view=…` query (Month and Week share the /year
// route). Map each sub-href to its plain pathname and the optional `view`
// it expects, so the active check can match both halves.
function splitSubHref(href: string): { pathname: string; view: string | null } {
  const [pathname, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  return { pathname, view: params.get('view') }
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
  currentView,
  collapsed,
  onNavigate,
}: {
  pathname: string
  currentView: string | null
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {NAV.map((n) => {
        const isActive =
          pathname === n.href ||
          // /today nav highlights for /today only; the other three highlight when
          // either the legacy or new (future) route is active.
          (n.key === 'year' &&
            (pathname.startsWith('/calendar') || pathname.startsWith('/blueprint') || pathname.startsWith('/curriculum') || pathname.startsWith('/year'))) ||
          (n.key === 'self' &&
            (pathname.startsWith('/human-design') || pathname.startsWith('/areas') || pathname.startsWith('/self'))) ||
          (n.key === 'journal' &&
            (pathname.startsWith('/journal') || pathname.startsWith('/tracker')))

        const subItems = n.subItems ?? []
        // Sub-items only show for whichever section is currently active —
        // no manual expand/collapse control (tried a chevron toggle; it
        // worked but wasn't discoverable, so this stays automatic).
        const showSubItems = !collapsed && subItems.length > 0 && isActive

        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            href={n.href}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            data-tour={`nav-${n.key}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              padding: collapsed ? '10px 6px' : '10px 12px',
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
          {showSubItems ? (
            <div
              style={{
                display: 'flex',
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
                // When the sub-item targets a ?view= variant we require the
                // current view to match too; otherwise Year's children would
                // all light up whenever Year is active.
                const viewMatches = subParts.view
                  ? currentView === subParts.view
                  : currentView === null || subParts.pathname !== pathname
                const subActive = pathMatches && viewMatches
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={onNavigate}
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

function PinnedAreas({
  categories,
  onNavigate,
}: {
  categories: CategorySummary[]
  onNavigate?: () => void
}) {
  if (categories.length === 0) return null
  return (
    <div>
      <div
        style={{
          fontFamily: K.fMono,
          fontSize: 13,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: K.inkSoft,
          marginBottom: 8,
          paddingLeft: 8,
        }}
      >
        Pinned areas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {categories.slice(0, 4).map((c) => (
          <Link
            key={c.id}
            href={`/areas/${slugifyAreaName(c.name)}`}
            onClick={onNavigate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 8,
              textDecoration: 'none',
              color: K.inkDim,
            }}
          >
            <span style={{ color: K.copper, fontSize: 14, width: 16, textAlign: 'center' }}>
              {c.icon_key ?? '·'}
            </span>
            <span style={{ fontFamily: K.fBody, fontSize: 15.5 }}>{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SidebarBody({
  pathname,
  currentView,
  categories,
  collapsed,
  onToggleDesktop,
  onNavigate,
}: {
  pathname: string
  currentView: string | null
  categories: CategorySummary[]
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
              height: 32,
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

        <NavRow
          pathname={pathname}
          currentView={currentView}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        <div style={{ flex: 1 }} />

        {!collapsed ? <PinnedAreas categories={categories} onNavigate={onNavigate} /> : null}

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
              padding: '4px 6px',
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
                padding: '4px 6px',
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

export function AlmanacSidebar({ categories, hasOracleAccess: _hasOracleAccess = false }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view')
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
          currentView={currentView}
          categories={categories}
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
              width: 40,
              height: 40,
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
              currentView={currentView}
              categories={categories}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
