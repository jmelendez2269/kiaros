'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  journalTabEntriesHref,
  journalTabLookBackHref,
  journalTabPatternsHref,
  journalTabWriteHref,
  lookBackSubViewHref,
  patternsSubViewHref,
  resolveJournalTabKey,
  resolveLookBackSubView,
  resolvePatternsSubView,
  type JournalTabKey,
  type LookBackSubView,
  type PatternsSubView,
} from '@/lib/journal/ia-journal-routes'
import styles from '@/components/calendar/calendar-tabs.module.css'

const MAIN_TABS: { key: JournalTabKey; label: string; href: () => string }[] = [
  { key: 'write', label: 'Write', href: journalTabWriteHref },
  { key: 'entries', label: 'Entries', href: journalTabEntriesHref },
  { key: 'patterns', label: 'Patterns', href: () => journalTabPatternsHref() },
  { key: 'look-back', label: 'Look back', href: () => journalTabLookBackHref() },
]

const PATTERNS_SUB: { key: PatternsSubView; label: string }[] = [
  { key: 'patterns', label: 'Overview' },
  { key: 'map', label: 'Mind map' },
  { key: 'captures', label: 'Captures' },
]

const LOOK_BACK_SUB: { key: LookBackSubView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
]

function SubToggleRow({
  ariaLabel,
  items,
  active,
  hrefFor,
}: {
  ariaLabel: string
  items: { key: string; label: string }[]
  active: string
  hrefFor: (key: string) => string
}) {
  return (
    <div className={styles.dayWeek} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <span key={item.key} className="inline-flex items-center gap-3">
          {index > 0 ? <span className={styles.dayWeekSep} aria-hidden>|</span> : null}
          <Link
            href={hrefFor(item.key)}
            className={`${styles.dayWeekLink}${active === item.key ? ` ${styles.dayWeekLinkActive}` : ''}`}
            aria-current={active === item.key ? 'page' : undefined}
          >
            {item.label}
          </Link>
        </span>
      ))}
    </div>
  )
}

export function JournalTabs() {
  const pathname = usePathname()
  const params = useSearchParams()
  const activeTab = resolveJournalTabKey(pathname)
  const patternsView = resolvePatternsSubView(params.get('view'))
  const lookBackView = resolveLookBackSubView(params.get('view'))

  const patternsSubRow = (
    <SubToggleRow
      ariaLabel="Patterns views"
      items={PATTERNS_SUB}
      active={patternsView}
      hrefFor={(key) => patternsSubViewHref(pathname, new URLSearchParams(params.toString()), key as PatternsSubView)}
    />
  )

  const lookBackSubRow = (
    <SubToggleRow
      ariaLabel="Look back views"
      items={LOOK_BACK_SUB}
      active={lookBackView}
      hrefFor={(key) => lookBackSubViewHref(pathname, new URLSearchParams(params.toString()), key as LookBackSubView)}
    />
  )

  return (
    <div className={styles.row}>
      <div className={styles.topLine}>
        <nav className={styles.segment} aria-label="Journal views">
          {MAIN_TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <Link
                key={tab.key}
                href={tab.href()}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        {activeTab === 'patterns' ? (
          <div className={styles.dayWeekDesktop}>{patternsSubRow}</div>
        ) : null}
        {activeTab === 'look-back' ? (
          <div className={styles.dayWeekDesktop}>{lookBackSubRow}</div>
        ) : null}
      </div>
      {activeTab === 'patterns' ? <div className={styles.dayWeekMobile}>{patternsSubRow}</div> : null}
      {activeTab === 'look-back' ? <div className={styles.dayWeekMobile}>{lookBackSubRow}</div> : null}
    </div>
  )
}
