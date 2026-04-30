'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-react'
import type { EphemerisDay, WeekBlueprint, YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { YearView } from './YearView'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { MONTH_NAMES } from './utils'
import { cn } from '@/lib/utils'

type CalendarView = 'year' | 'month' | 'week'

interface CosmicCalendarProps {
  yearEphemeris: YearEphemeris
  weeks: WeekBlueprint[]
  curriculumSessions: CurriculumSessionRow[]
}

export function CosmicCalendar({ yearEphemeris, weeks, curriculumSessions }: CosmicCalendarProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [view, setView] = useState<CalendarView>('year')
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [showLegend, setShowLegend] = useState(true)

  const dayMap = useMemo(() => {
    const map = new Map<string, EphemerisDay>()
    for (const day of yearEphemeris.days) {
      map.set(day.date, day)
    }
    return map
  }, [yearEphemeris.days])

  const curriculumByDate = useMemo(() => {
    const map = new Map<string, CurriculumSessionRow[]>()
    for (const session of curriculumSessions) {
      const current = map.get(session.scheduled_for) ?? []
      current.push(session)
      map.set(session.scheduled_for, current)
    }
    return map
  }, [curriculumSessions])

  function handleMonthClick(month: number) {
    setActiveMonth(month)
    setView('month')
  }

  function handleDayClick(date: string) {
    setSelectedDate(date)
    setActiveMonth(Number.parseInt(date.slice(5, 7), 10))
    setView('week')
  }

  function handleBackToYear() {
    setView('year')
  }

  function handleBackToMonth() {
    setView('month')
  }

  function handleTodayClick() {
    const todayYear = Number.parseInt(today.slice(0, 4), 10)
    if (todayYear !== yearEphemeris.year) return

    setSelectedDate(today)
    setActiveMonth(Number.parseInt(today.slice(5, 7), 10))
    setView('week')
  }

  const monthName = MONTH_NAMES[activeMonth - 1]
  const todayInYear = today.startsWith(String(yearEphemeris.year))
  const viewLabel =
    view === 'year'
      ? `${yearEphemeris.year} year view`
      : view === 'month'
        ? `${monthName} ${yearEphemeris.year}`
        : `Week of ${selectedDate.slice(5)}`

  return (
    <div className="space-y-6">
      <div className="shell-panel-hero px-4 py-4 md:px-5">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="shell-kicker mb-2">Cosmic Calendar</p>
            <h2 className="font-display text-[1.75rem] leading-tight text-bone md:text-[2.05rem]">
              {viewLabel}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-stone-950/65 p-1"
              role="tablist"
              aria-label="Calendar view"
            >
              <CalendarToggle
                active={view === 'year'}
                onClick={() => setView('year')}
                icon={<LayoutGrid size={14} />}
                label="Year"
              />
              <CalendarToggle
                active={view === 'month'}
                onClick={() => setView('month')}
                icon={<CalendarRange size={14} />}
                label="Month"
              />
              <CalendarToggle
                active={view === 'week'}
                onClick={() => setView('week')}
                icon={<Rows3 size={14} />}
                label="Week"
              />
            </div>

            <button
              type="button"
              onClick={handleTodayClick}
              disabled={!todayInYear}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
                todayInYear
                  ? 'border-leather-400/35 bg-leather-500/15 text-leather-200 hover:bg-leather-500/22'
                  : 'cursor-not-allowed border-border/55 bg-stone-950/45 text-bone-muted/40'
              )}
            >
              <CalendarDays size={14} />
              Today
            </button>

            <button
              type="button"
              onClick={() => setShowLegend((value) => !value)}
              aria-pressed={showLegend}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
                showLegend
                  ? 'border-plum-400/35 bg-plum-400/15 text-plum-300'
                  : 'border-border/70 bg-stone-950/55 text-bone-muted hover:text-bone'
              )}
            >
              <SlidersHorizontal size={14} />
              Signals
            </button>
          </div>
        </div>

        {showLegend && <CalendarLegend />}
      </div>

      {view !== 'year' && (
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            onClick={handleBackToYear}
            className="text-bone-muted transition-colors hover:text-bone"
          >
            {yearEphemeris.year}
          </button>
          <span className="text-bone-muted/40">/</span>

          {view === 'month' ? (
            <span className="text-bone">{monthName}</span>
          ) : (
            <>
              <button
                onClick={handleBackToMonth}
                className="text-bone-muted transition-colors hover:text-bone"
              >
                {monthName}
              </button>
              <span className="text-bone-muted/40">/</span>
              <span className="text-bone">Week</span>
            </>
          )}
        </nav>
      )}

      {view === 'year' && (
        <YearView
          yearEphemeris={yearEphemeris}
          weeks={weeks}
          onMonthClick={handleMonthClick}
          onDayClick={handleDayClick}
        />
      )}

      {view === 'month' && (
        <MonthView
          year={yearEphemeris.year}
          month={activeMonth}
          dayMap={dayMap}
          curriculumByDate={curriculumByDate}
          retrogradePeriods={yearEphemeris.retrogradePeriods}
          today={today}
          onDayClick={handleDayClick}
        />
      )}

      {view === 'week' && (
        <WeekView
          selectedDate={selectedDate}
          dayMap={dayMap}
          weeks={weeks}
          curriculumByDate={curriculumByDate}
          today={today}
        />
      )}
    </div>
  )
}

function CalendarToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors',
        active ? 'bg-stone-900/85 text-bone shadow-[0_0_0_1px_hsl(var(--leather-400)/0.18)]' : 'text-bone-muted/65 hover:text-bone'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function CalendarLegend() {
  return (
    <div className="relative z-10 mt-4 flex flex-wrap gap-2">
      <LegendPill className="bg-leather-300" label="Sun arc" />
      <LegendPill className="bg-bone" label="Moon phases" />
      <LegendPill className="bg-plum-300" label="Retrogrades" />
      <LegendPill className="bg-moss-300" label="Aspects" />
      <LegendPill className="bg-ember-300" label="Personal plan" />
    </div>
  )
}

function LegendPill({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/55 px-3 py-1 text-[0.7rem] font-medium text-bone-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]', className)} />
      {label}
    </span>
  )
}
