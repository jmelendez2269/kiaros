'use client'

import { useState, type ReactNode } from 'react'

type TabKey = 'patterns' | 'map' | 'journal' | 'captures'

/**
 * Each tab carries its own channel so the active pill takes the hue of the
 * content behind it — leather for what Kiaros synthesised, moss for the
 * user's own entries, plum for Stelloquy memory.
 */
const TABS: { key: TabKey; label: string; channel: string }[] = [
  { key: 'patterns', label: 'Patterns', channel: 'channel-ai' },
  { key: 'map', label: 'Mind map', channel: 'channel-ai' },
  { key: 'journal', label: 'Your entries', channel: 'channel-mine' },
  { key: 'captures', label: 'Captures', channel: 'channel-memory' },
]

interface InsightsTabsProps {
  counts: Partial<Record<TabKey, number>>
  patterns: ReactNode
  map: ReactNode
  journal: ReactNode
  captures: ReactNode
}

export function InsightsTabs({ counts, patterns, map, journal, captures }: InsightsTabsProps) {
  const [active, setActive] = useState<TabKey>('patterns')

  const panels: Record<TabKey, ReactNode> = { patterns, map, journal, captures }
  const activeChannel = TABS.find((tab) => tab.key === active)?.channel ?? 'channel-ai'

  return (
    <div className="space-y-6">
      <div className="shell-tablist" role="tablist" aria-label="Insight views">
        {TABS.map((tab) => {
          const count = counts[tab.key]
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`insights-tab-${tab.key}`}
              aria-selected={active === tab.key}
              aria-controls={`insights-panel-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`${tab.channel} shell-tab`}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 ? (
                <span className="ml-1.5 text-bone-muted/60">{count}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`insights-panel-${active}`}
        aria-labelledby={`insights-tab-${active}`}
        className={`${activeChannel} space-y-6`}
      >
        {panels[active]}
      </div>
    </div>
  )
}
