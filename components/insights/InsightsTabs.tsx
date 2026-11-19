'use client'

import { useState, type ReactNode } from 'react'
import { K } from '@/components/almanac'

type TabKey = 'patterns' | 'map' | 'journal' | 'captures'

/**
 * Each tab carries its own channel so the active pill takes the hue of the
 * content behind it — leather for what Kiaros synthesised, moss for the
 * user's own entries, plum for Stelloquy memory.
 */
const TABS: { key: TabKey; label: string; channel: string }[] = [
  { key: 'patterns', label: 'Patterns', channel: 'channel-ai' },
  { key: 'journal', label: 'Your entries', channel: 'channel-mine' },
  { key: 'captures', label: 'Captures', channel: 'channel-memory' },
]

interface InsightsTabsProps {
  counts: Partial<Record<TabKey, number>>
  patterns: ReactNode
  /** No longer shown here: the mind map has its own page at /insights/mind-map. */
  map?: ReactNode
  journal: ReactNode
  captures: ReactNode
}

export function InsightsTabs({ counts, patterns, map, journal, captures }: InsightsTabsProps) {
  const [active, setActive] = useState<TabKey>('patterns')

  const panels: Record<TabKey, ReactNode> = { patterns, map, journal, captures }
  const activeChannel = TABS.find((tab) => tab.key === active)?.channel ?? 'channel-ai'

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Insight views" className="flex flex-wrap gap-1.5 self-start rounded-full p-1" style={{ width: 'fit-content', maxWidth: '100%', background: K.bg3, border: `1px solid ${K.line}` }}>
        {TABS.map((tab) => {
          const count = counts[tab.key]
          const on = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`insights-tab-${tab.key}`}
              aria-selected={on}
              aria-controls={`insights-panel-${tab.key}`}
              onClick={() => setActive(tab.key)}
              style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, fontSize: 14, cursor: 'pointer', border: `1px solid ${on ? `${K.copper}66` : 'transparent'}`, background: on ? `${K.copper}1a` : 'transparent', color: on ? K.ink : K.inkDim }}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 ? <span style={{ marginLeft: 6, opacity: 0.7 }}>· {count}</span> : null}
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
