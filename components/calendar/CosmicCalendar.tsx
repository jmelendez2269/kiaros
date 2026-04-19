'use client'

import { useMemo, useState } from 'react'
import type { EphemerisDay, WeekBlueprint, YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { YearView } from './YearView'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { MONTH_NAMES } from './utils'

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

  const monthName = MONTH_NAMES[activeMonth - 1]

  return (
    <div className="space-y-6">
      <div className="shell-panel-soft flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="shell-kicker mb-2">Navigation</p>
          <p className="text-sm text-bone-muted">
            Move from yearly overview into months and then the active week.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-bone-muted">
          <span className={`shell-pill ${view === 'year' ? 'border-leather-400/35 text-bone' : ''}`}>Year</span>
          <span className={`shell-pill ${view === 'month' ? 'border-leather-400/35 text-bone' : ''}`}>Month</span>
          <span className={`shell-pill ${view === 'week' ? 'border-leather-400/35 text-bone' : ''}`}>Week</span>
        </div>
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
          year={yearEphemeris.year}
          moonPhases={yearEphemeris.moonPhases}
          onMonthClick={handleMonthClick}
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
