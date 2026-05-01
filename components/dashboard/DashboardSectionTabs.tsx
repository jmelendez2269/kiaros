'use client'

import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BookOpen,
  Brain,
  CalendarDays,
  Compass,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Orbit,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardTabId =
  | 'overview'
  | 'weekly'
  | 'cosmic'
  | 'blueprint'
  | 'areas'
  | 'tracker'
  | 'journal'
  | 'oracle'
  | 'curriculum'

export type DashboardSectionTab = {
  id: DashboardTabId
  label: string
  detail: string
}

const TAB_ICONS = {
  overview: LayoutDashboard,
  weekly: CalendarDays,
  cosmic: Orbit,
  blueprint: BookOpen,
  areas: Compass,
  tracker: Activity,
  journal: FileText,
  oracle: MessageSquare,
  curriculum: Brain,
} satisfies Record<DashboardTabId, typeof LayoutDashboard>

const HASH_PREFIX = 'dashboard-'

function readHashTab(tabs: DashboardSectionTab[]) {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.replace('#', '')
  if (!hash.startsWith(HASH_PREFIX)) return null

  const id = hash.slice(HASH_PREFIX.length)
  return tabs.find((tab) => tab.id === id)?.id ?? null
}

function syncPanels(activeTab: DashboardTabId) {
  document.querySelectorAll<HTMLElement>('[data-dashboard-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.dashboardTabPanel !== activeTab
  })
}

export function DashboardSectionTabs({ tabs }: { tabs: DashboardSectionTab[] }) {
  const firstTab = tabs[0]?.id ?? 'overview'
  const [activeTab, setActiveTab] = useState<DashboardTabId>(firstTab)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeIndex = useMemo(
    () => Math.max(0, tabs.findIndex((tab) => tab.id === activeTab)),
    [activeTab, tabs]
  )

  useEffect(() => {
    const initialTab = readHashTab(tabs) ?? firstTab
    setActiveTab(initialTab)
    syncPanels(initialTab)

    function handleHashChange() {
      const nextTab = readHashTab(tabs)
      if (nextTab) {
        setActiveTab(nextTab)
        syncPanels(nextTab)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [firstTab, tabs])

  function selectTab(tabId: DashboardTabId, shouldFocus = false) {
    setActiveTab(tabId)
    syncPanels(tabId)
    window.history.replaceState(null, '', `#${HASH_PREFIX}${tabId}`)

    if (shouldFocus) {
      const index = tabs.findIndex((tab) => tab.id === tabId)
      window.requestAnimationFrame(() => tabRefs.current[index]?.focus())
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return
    }

    event.preventDefault()

    if (event.key === 'Home') {
      selectTab(tabs[0].id, true)
      return
    }

    if (event.key === 'End') {
      selectTab(tabs[tabs.length - 1].id, true)
      return
    }

    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (activeIndex + direction + tabs.length) % tabs.length
    selectTab(tabs[nextIndex].id, true)
  }

  return (
    <section className="shell-panel overflow-hidden px-3 py-3 md:px-4">
      <div
        role="tablist"
        aria-label="Dashboard sections"
        onKeyDown={handleKeyDown}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {tabs.map((tab, index) => {
          const Icon = TAB_ICONS[tab.id]
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              className={cn(
                'group flex min-h-16 min-w-[9.4rem] shrink-0 items-center gap-2.5 rounded-[0.95rem] border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70',
                isActive
                  ? 'border-leather-400/55 bg-leather-500/16 text-bone shadow-glow'
                  : 'border-border/60 bg-stone-950/50 text-bone-muted hover:border-border hover:bg-stone-900/70 hover:text-bone'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border transition-colors',
                  isActive
                    ? 'border-leather-300/35 bg-leather-500/18 text-leather-200'
                    : 'border-border/60 bg-stone-900/75 text-bone-muted group-hover:text-bone'
                )}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.9rem] font-semibold">{tab.label}</span>
                <span className="mt-0.5 block truncate text-[0.68rem] uppercase tracking-[0.16em] text-bone-muted/70">
                  {tab.detail}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
