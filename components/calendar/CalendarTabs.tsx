'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  calendarTabBlueprintHref,
  calendarTabDayHref,
  calendarTabMonthHref,
  calendarTabWeekHref,
  calendarTabYearHref,
  resolveCalendarTabKey,
  type CalendarTabKey,
} from '@/lib/calendar/calendar-day-routes'
import { CALENDAR_TAB_ROW_TOUR_TARGET } from '@/lib/almanac/nav-tour-target'
import styles from './calendar-tabs.module.css'

const TABS: { key: CalendarTabKey; label: string; href: () => string }[] = [
  { key: 'day', label: 'Day', href: calendarTabDayHref },
  { key: 'week', label: 'Week', href: () => calendarTabWeekHref() },
  { key: 'month', label: 'Month', href: () => calendarTabMonthHref() },
  { key: 'year', label: 'Year', href: calendarTabYearHref },
  { key: 'blueprint', label: 'Blueprint', href: calendarTabBlueprintHref },
]

export function CalendarTabs() {
  const pathname = usePathname()
  const params = useSearchParams()
  const view = params.get('view')
  const active = resolveCalendarTabKey(pathname, view)

  const monthHref = () => {
    const month = params.get('month')
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      return calendarTabMonthHref(month)
    }
    const date = params.get('date')
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return calendarTabMonthHref(date.slice(0, 7))
    }
    return calendarTabMonthHref()
  }

  const weekHref = () => {
    const date = params.get('date')
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return calendarTabWeekHref(date)
    }
    return calendarTabWeekHref()
  }

  const hrefForTab = (key: CalendarTabKey, defaultHref: () => string) => {
    if (key === 'month') return monthHref()
    if (key === 'week') return weekHref()
    return defaultHref()
  }

  return (
    <div className={styles.row}>
      <div className={styles.topLine}>
        <nav
          className={styles.segment}
          aria-label="Calendar views"
          data-tour={CALENDAR_TAB_ROW_TOUR_TARGET}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === active
            return (
              <Link
                key={tab.key}
                href={hrefForTab(tab.key, tab.href)}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
