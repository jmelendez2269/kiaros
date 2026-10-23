'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  calendarTabBlueprintHref,
  calendarTabDayHref,
  calendarTabMonthHref,
  calendarTabYearHref,
  resolveCalendarTabKey,
  type CalendarTabKey,
} from '@/lib/calendar/calendar-day-routes'
import { CALENDAR_TAB_ROW_TOUR_TARGET } from '@/lib/almanac/nav-tour-target'
import styles from './calendar-tabs.module.css'

const TABS: { key: CalendarTabKey; label: string; href: () => string }[] = [
  { key: 'day', label: 'Day', href: calendarTabDayHref },
  { key: 'month', label: 'Month', href: () => calendarTabMonthHref() },
  { key: 'year', label: 'Year', href: calendarTabYearHref },
  { key: 'blueprint', label: 'Blueprint', href: calendarTabBlueprintHref },
]

type DayWeekView = 'day' | 'week'

function dayWeekHref(pathname: string, params: URLSearchParams, view: DayWeekView): string {
  const sp = new URLSearchParams(params.toString())
  sp.set('view', view)
  const date = params.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    sp.set('date', date)
  }
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function CalendarTabs() {
  const pathname = usePathname()
  const params = useSearchParams()
  const view = params.get('view')
  const active = resolveCalendarTabKey(pathname, view)
  const onCalendarDayRoute =
    pathname === '/calendar' || (pathname.startsWith('/calendar') && !pathname.startsWith('/calendar/month'))
  const dayWeekView: DayWeekView = view === 'week' ? 'week' : 'day'

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

  const hrefForTab = (key: CalendarTabKey, defaultHref: () => string) => {
    if (key === 'month') return monthHref()
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
        {onCalendarDayRoute ? (
          <div className={styles.dayWeekDesktop}>
            <div className={styles.dayWeek} aria-label="Day or week view">
              <Link
                href={dayWeekHref(pathname, new URLSearchParams(params.toString()), 'day')}
                className={`${styles.dayWeekLink}${dayWeekView === 'day' ? ` ${styles.dayWeekLinkActive}` : ''}`}
                aria-current={dayWeekView === 'day' ? 'page' : undefined}
              >
                Day
              </Link>
              <span className={styles.dayWeekSep} aria-hidden>|</span>
              <Link
                href={dayWeekHref(pathname, new URLSearchParams(params.toString()), 'week')}
                className={`${styles.dayWeekLink}${dayWeekView === 'week' ? ` ${styles.dayWeekLinkActive}` : ''}`}
                aria-current={dayWeekView === 'week' ? 'page' : undefined}
              >
                Week
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      {onCalendarDayRoute ? (
        <div className={styles.dayWeekMobile}>
          <div className={styles.dayWeek} aria-label="Day or week view">
            <Link
              href={dayWeekHref(pathname, new URLSearchParams(params.toString()), 'day')}
              className={`${styles.dayWeekLink}${dayWeekView === 'day' ? ` ${styles.dayWeekLinkActive}` : ''}`}
              aria-current={dayWeekView === 'day' ? 'page' : undefined}
            >
              Day
            </Link>
            <span className={styles.dayWeekSep} aria-hidden>|</span>
            <Link
              href={dayWeekHref(pathname, new URLSearchParams(params.toString()), 'week')}
              className={`${styles.dayWeekLink}${dayWeekView === 'week' ? ` ${styles.dayWeekLinkActive}` : ''}`}
              aria-current={dayWeekView === 'week' ? 'page' : undefined}
            >
              Week
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
