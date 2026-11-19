'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu, Settings, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { BRAND } from '@/lib/brand'
import { BrandMark } from '@/components/shared/BrandMark'
import { cn } from '@/lib/utils'
import {
  iaGoalsFlagEnabled,
  resolveNavItemHint,
  SELF_NAV_HINT_GOALS_IA,
  SELF_NAV_HINT_LEGACY,
} from '@/lib/goals-study/ia-goals-routes'
import { K } from './tokens'
import { StarField } from './StarField'
import { AppHelpMenu } from '@/components/feedback/AppHelpMenu'
import { IaOverlaysNoticeStack } from '@/components/overlays/IaOverlaysNoticeStack'
import { useMobileNavOpen } from '@/components/app/MobileNavOpenContext'

type NavKey = 'today' | 'journal' | 'stelloquy' | 'insights' | 'year' | 'blueprint' | 'self' | 'goalsStudy'
type CollapsibleNavKey = Extract<NavKey, 'self' | 'journal' | 'goalsStudy' | 'insights' | 'year'>
type SubNavItem = { label: string; href: string; hint: string }

const COLLAPSIBLE_KEYS: ReadonlyArray<CollapsibleNavKey> = ['self', 'journal', 'goalsStudy', 'insights', 'year']

/**
 * Insight-first order: what Kairos notices (journal, Stelloquy, insights) sits
 * above the calendar. Week, month and year share one Calendar item. The
 * Calendar item keeps the 'year' key so the product tour's nav-year target and
 * existing active-state rules keep working.
 */
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
  // Insights leads: it is the home page, and Today follows it.
  {
    key: 'insights',
    label: 'Insights',
    hint: 'patterns · reviews · your year',
    glyph: '◎',
    tone: K.violetDim,
    href: '/insights',
    collapsible: true,
    subItems: [
      { label: 'Patterns', href: '/insights/map', hint: 'what keeps coming up' },
      { label: 'Mind map', href: '/insights/mind-map', hint: 'how your themes connect' },
      // Yearly Unwrapped opens from the end of the Reviews timeline now.
      { label: 'Reviews', href: '/reviews', hint: 'every week, month and quarter' },
    ],
  },
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
    key: 'journal',
    label: 'Journal',
    hint: 'write · entries · from Stelloquy',
    glyph: '✎',
    tone: K.brickHi,
    href: '/journal',
  },
  {
    key: 'stelloquy',
    label: BRAND.oracle,
    hint: 'ongoing conversation',
    glyph: '✦',
    tone: K.kairosHi,
    href: '/oracle',
  },
  {
    key: 'year',
    label: 'Calendar',
    hint: 'week · month · year',
    glyph: '▦',
    tone: K.plum,
    href: '/year',
    collapsible: true,
    subItems: [
      { label: 'Week', href: '/year?view=week', hint: 'this week, day by day' },
      { label: 'Month', href: '/year?view=month', hint: 'calendar grid · this month' },
      { label: 'Year', href: '/year', hint: 'seasons · arcs' },
    ],
  },
  {
    key: 'blueprint',
    label: 'Blueprint',
    hint: 'the full 52-week read',
    glyph: '◐',
    tone: K.ember,
    href: '/blueprint',
  },
  {
    key: 'self',
    label: 'Self',
    hint: SELF_NAV_HINT_LEGACY,
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
]

const GOALS_STUDY_NAV: (typeof NAV)[number] = {
  key: 'goalsStudy',
  label: 'Goals and study',
  hint: 'life areas · study plans',
  glyph: '◈',
  tone: K.starlight,
  href: '/areas',
  collapsible: true,
  subItems: [
    { label: 'Life areas', href: '/areas', hint: 'goals mapped to your chart' },
    { label: 'Curriculum', href: '/curriculum', hint: 'study plans · sessions' },
  ],
}

function navForAccess(
  hasOracleAccess: boolean,
  _journalIaEnabled: boolean,
  goalsIaEnabled: boolean,
  calendarDayEnabled = false,
) {
  let items = NAV.map((item) => {
    if (goalsIaEnabled && item.key === 'self' && item.subItems) {
      return {
        ...item,
        hint: SELF_NAV_HINT_GOALS_IA,
        subItems: item.subItems.filter(
          (sub) => sub.href !== '/areas' && sub.href !== '/curriculum',
        ),
      }
    }
    if (item.key === 'insights' && item.subItems && !hasOracleAccess) {
      return {
        ...item,
        // Patterns stays: without Stelloquy access it opens a preview of the member's own patterns.
        subItems: item.subItems.filter((sub) => sub.href !== '/insights/mind-map'),
      }
    }
    if (item.key === 'year' && item.subItems && calendarDayEnabled) {
      return {
        ...item,
        subItems: item.subItems.map((sub) =>
          sub.label === 'Month' ? { ...sub, href: '/calendar/month' } : sub,
        ),
      }
    }
    return item
  })

  if (goalsIaEnabled) {
    const selfIndex = items.findIndex((item) => item.key === 'self')
    items = [...items.slice(0, selfIndex), GOALS_STUDY_NAV, ...items.slice(selfIndex)]
  }

  return items
}

function splitSubHref(href: string): { pathname: string; hash: string } {
  const [pathAndQuery, hash = ''] = href.split('#')
  const [pathname] = pathAndQuery.split('?')
  return { pathname, hash: hash ? `#${hash}` : '' }
}

function isSectionActive(
  key: NavKey,
  pathname: string,
  view: string | null = null,
  calendarDayEnabled = false,
  journalIaEnabled = false,
  goalsIaEnabled = false,
): boolean {
  if (key === 'today') {
    if (calendarDayEnabled) {
      return (
        pathname.startsWith('/today') ||
        pathname.startsWith('/planner') ||
        (pathname.startsWith('/calendar') && !pathname.startsWith('/calendar/month'))
      )
    }
    return (
      pathname.startsWith('/today') ||
      pathname.startsWith('/planner') ||
      pathname.startsWith('/calendar')
    )
  }
  if (key === 'insights') {
    return isInsightsPath(pathname)
  }
  if (key === 'blueprint') {
    return pathname.startsWith('/blueprint')
  }
  if (key === 'year') {
    // Calendar: week, month and year views (and the calendar month page).
    if (isInsightsPath(pathname)) return false
    if (calendarDayEnabled && pathname.startsWith('/calendar/month')) return true
    return pathname.startsWith('/year')
  }
  if (key === 'self') {
    if (goalsIaEnabled) {
      return pathname.startsWith('/human-design') || pathname.startsWith('/self')
    }
    return (
      pathname.startsWith('/human-design') ||
      pathname.startsWith('/areas') ||
      pathname.startsWith('/curriculum') ||
      pathname.startsWith('/self')
    )
  }
  if (key === 'goalsStudy') {
    return pathname.startsWith('/areas') || pathname.startsWith('/curriculum')
  }
  if (key === 'stelloquy') {
    return pathname.startsWith('/oracle')
  }
  return pathname.startsWith('/journal') && !isInsightsPath(pathname)
}

/** Pages that belong to Insights: reviews, patterns, look back, unwrapped. */
function isInsightsPath(pathname: string): boolean {
  return (
    pathname.startsWith('/reviews') ||
    pathname.startsWith('/period-review') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/reflections') ||
    pathname.startsWith('/journal/patterns') ||
    pathname.startsWith('/journal/look-back') ||
    pathname.startsWith('/year/unwrapped')
  )
}

const SIDEBAR_STORAGE_KEY = 'kiaros-desktop-sidebar-collapsed'

function ChromeMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <BrandMark size="header" />
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
            <span style={{ color: K.violetDim }}>●</span>{' '}
            <span style={{ color: K.violetDim }}>Almanac · {new Date().getFullYear()}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NavRow({
  navItems,
  pathname,
  collapsed,
  onNavigate,
  calendarDayEnabled,
  journalIaEnabled,
  goalsIaEnabled,
}: {
  navItems: typeof NAV
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
  calendarDayEnabled: boolean
  journalIaEnabled: boolean
  goalsIaEnabled: boolean
}) {
  const navId = useId()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const [currentHash, setCurrentHash] = useState('')
  const [openSections, setOpenSections] = useState<Record<CollapsibleNavKey, boolean>>(() => {
    const initial = {} as Record<CollapsibleNavKey, boolean>
    for (const key of COLLAPSIBLE_KEYS) {
      initial[key] = isSectionActive(key, pathname, null, calendarDayEnabled, journalIaEnabled, goalsIaEnabled)
    }
    // Insights stays open by default so reviews and patterns are always one tap away.
    initial.insights = true
    return initial
  })

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash)
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [pathname])

  useEffect(() => {
    const activeKey = COLLAPSIBLE_KEYS.find((key) =>
      isSectionActive(key, pathname, null, calendarDayEnabled, journalIaEnabled, goalsIaEnabled),
    )
    if (!activeKey) return

    setOpenSections((current) =>
      current[activeKey] ? current : { ...current, [activeKey]: true },
    )
  }, [pathname, calendarDayEnabled, journalIaEnabled, goalsIaEnabled])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {navItems.map((n) => {
        const isActive = isSectionActive(n.key, pathname, view, calendarDayEnabled, journalIaEnabled, goalsIaEnabled)
        const subItems = n.subItems ?? []
        const collapsibleKey: CollapsibleNavKey | null =
          n.collapsible && (COLLAPSIBLE_KEYS as ReadonlyArray<NavKey>).includes(n.key)
            ? (n.key as CollapsibleNavKey)
            : null
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
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    color: K.inkDim,
                    marginTop: 2,
                  }}
                >
                  {resolveNavItemHint(n.key, n.hint, goalsIaEnabled)}
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
                color: isActive ? n.tone : K.inkDim,
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
                  pathname.startsWith(`${subParts.pathname}/`) ||
                  (subParts.pathname === '/planner' &&
                    pathname.startsWith('/calendar') &&
                    (!calendarDayEnabled || !pathname.startsWith('/calendar/month')))
                const subView = new URLSearchParams(sub.href.split('?')[1]?.split('#')[0] ?? '').get('view')
                // /year serves week, month and year: match the view, and keep
                // Yearly Unwrapped (/year/unwrapped) out of the plain Year item.
                const viewMatches =
                  subParts.pathname !== '/year'
                    ? true
                    : pathname === '/year' &&
                      (subView ? view === subView : view !== 'week' && view !== 'month')
                const subActive =
                  pathMatches && viewMatches && (!subParts.hash || currentHash === subParts.hash)
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
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        color: K.inkDim,
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
  navItems,
  pathname,
  collapsed,
  onToggleDesktop,
  onNavigate,
  calendarDayEnabled,
  journalIaEnabled,
  goalsIaEnabled,
  iaOverlaysEnabled,
  showPatternDiscovery,
  patternScope,
  initialPatternIds,
}: {
  navItems: typeof NAV
  pathname: string
  collapsed: boolean
  onToggleDesktop?: () => void
  onNavigate?: () => void
  calendarDayEnabled: boolean
  journalIaEnabled: boolean
  goalsIaEnabled: boolean
  iaOverlaysEnabled: boolean
  showPatternDiscovery: boolean
  patternScope: string
  initialPatternIds: string[]
}) {
  const footerMenuAnchorRef = useRef<HTMLDivElement>(null)

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
          <Link href="/insights" onClick={onNavigate} style={{ textDecoration: 'none' }}>
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
              border: `1px solid ${K.borderStrong}`,
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

        {iaOverlaysEnabled && !collapsed ? (
          <IaOverlaysNoticeStack
            showPatternDiscovery={showPatternDiscovery}
            patternScope={patternScope}
            initialPatternIds={initialPatternIds}
          />
        ) : null}

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: collapsed ? 0 : 2 }}>
          <NavRow
            navItems={navItems}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
            calendarDayEnabled={calendarDayEnabled}
            journalIaEnabled={journalIaEnabled}
            goalsIaEnabled={goalsIaEnabled}
          />
        </div>

        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
            overflow: 'visible',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
        <div style={{ height: 1, background: K.line }} />

        <div
          ref={footerMenuAnchorRef}
          style={{
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'visible',
          }}
        >
        {iaOverlaysEnabled ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 6px 4px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                boxSizing: 'border-box',
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
                <div
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 13,
                    color: K.inkDim,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Your chart
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '0 6px 6px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                boxSizing: 'border-box',
              }}
            >
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
                  color: pathname.startsWith('/settings') ? K.ink : K.inkDim,
                }}
              >
                <Settings size={14} />
              </Link>
              <AppHelpMenu menuAnchorRef={footerMenuAnchorRef} />
              <SignOutButton>
                <button
                  type="button"
                  title="Sign out"
                  aria-label="Sign out"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: 44,
                    height: 44,
                    padding: 0,
                    color: K.inkDim,
                  }}
                >
                  <LogOut size={14} aria-hidden="true" />
                </button>
              </SignOutButton>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 6px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              overflow: 'visible',
              boxSizing: 'border-box',
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
                <div
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 13,
                    color: K.inkDim,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}
                >
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
                color: pathname.startsWith('/settings') ? K.ink : K.inkDim,
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
                  color: K.inkDim,
                }}
              >
                <LogOut size={14} />
                {!collapsed ? 'Sign out' : null}
              </button>
            </SignOutButton>
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  )
}

export function AlmanacSidebar({
  hasOracleAccess,
  calendarDayEnabled = false,
  journalIaEnabled = false,
  goalsIaEnabled = false,
  iaOverlaysEnabled = false,
  showPatternDiscovery = false,
  patternScope = '',
  initialPatternIds = [],
}: {
  hasOracleAccess: boolean
  calendarDayEnabled?: boolean
  journalIaEnabled?: boolean
  goalsIaEnabled?: boolean
  iaOverlaysEnabled?: boolean
  showPatternDiscovery?: boolean
  patternScope?: string
  initialPatternIds?: string[]
}) {
  const goalsIaOn =
    goalsIaEnabled || iaGoalsFlagEnabled(process.env.NEXT_PUBLIC_IA_GOALS)
  const navItems = navForAccess(hasOracleAccess, journalIaEnabled, goalsIaOn, calendarDayEnabled)
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { setMobileNavOpen } = useMobileNavOpen()

  useEffect(() => {
    if (!iaOverlaysEnabled) return
    setMobileNavOpen(mobileOpen)
  }, [iaOverlaysEnabled, mobileOpen, setMobileNavOpen])

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
          navItems={navItems}
          pathname={pathname}
          collapsed={collapsed}
          onToggleDesktop={() => setCollapsed((c) => !c)}
          calendarDayEnabled={calendarDayEnabled}
          journalIaEnabled={journalIaEnabled}
          goalsIaEnabled={goalsIaOn}
          iaOverlaysEnabled={iaOverlaysEnabled}
          showPatternDiscovery={showPatternDiscovery}
          patternScope={patternScope}
          initialPatternIds={initialPatternIds}
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
          <Link href="/insights" style={{ textDecoration: 'none' }}>
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
              border: `1px solid ${K.borderStrong}`,
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
        {iaOverlaysEnabled ? (
          <div style={{ marginTop: 10 }}>
            <IaOverlaysNoticeStack
              showPatternDiscovery={showPatternDiscovery}
              patternScope={patternScope}
              initialPatternIds={initialPatternIds}
            />
          </div>
        ) : null}
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
              navItems={navItems}
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              calendarDayEnabled={calendarDayEnabled}
              journalIaEnabled={journalIaEnabled}
              goalsIaEnabled={goalsIaOn}
              iaOverlaysEnabled={iaOverlaysEnabled}
              showPatternDiscovery={showPatternDiscovery}
              patternScope={patternScope}
              initialPatternIds={initialPatternIds}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
