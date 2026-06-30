import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { cn } from '@/lib/utils'
import type { EphemerisDay, RetrogradePeriod } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { MONTH_NAMES, SHORT_DAY_NAMES, buildCalendarGrid } from './utils'

interface MonthViewProps {
  year: number
  month: number
  dayMap: Map<string, EphemerisDay>
  curriculumByDate: Map<string, CurriculumSessionRow[]>
  retrogradePeriods: RetrogradePeriod[]
  today: string
  onDayClick: (date: string) => void
}

export function MonthView({
  year,
  month,
  dayMap,
  curriculumByDate,
  retrogradePeriods,
  today,
  onDayClick,
}: MonthViewProps) {
  const grid = buildCalendarGrid(year, month)

  const stationDates = new Set<string>()
  for (const p of retrogradePeriods) {
    stationDates.add(p.startDate)
    stationDates.add(p.endDate)
  }

  return (
    <div className="shell-panel px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="shell-kicker mb-2">Month view</p>
          <h2 className="font-serif text-[2rem] text-bone">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
        </div>
        <p className="max-w-md text-sm text-bone-muted">
          Tap a day to open the weekly panel with transit detail, intentions, and moon events.
        </p>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {SHORT_DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-bone-muted/45"
          >
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[1.1rem] bg-border/80">
        {grid.map((date, i) => {
          if (!date) {
            return <div key={`pad-${i}`} className="min-h-[52px] bg-stone-950/40 sm:min-h-[86px]" aria-hidden />
          }

          const day = dayMap.get(date)
          const curriculumSessions = curriculumByDate.get(date) ?? []
          const isToday = date === today
          const dayNum = Number.parseInt(date.slice(8), 10)
          const hasPhaseEvent = !!day?.moonPhaseEvent
          const isStation = stationDates.has(date)

          return (
            <button
              key={date}
              onClick={() => onDayClick(date)}
              className={cn(
                'flex min-h-[52px] flex-col gap-1 bg-stone-900/90 p-1.5 text-left transition-colors hover:bg-stone-850/95 sm:min-h-[86px] sm:p-2',
                isToday && 'bg-leather-500/14'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium leading-none',
                  isToday ? 'text-leather-200' : 'text-bone-muted'
                )}
              >
                {dayNum}
              </span>

              {hasPhaseEvent && day?.moonPhaseEvent && (
                <MoonPhaseIcon phase={day.moonPhaseEvent.phase} size={14} />
              )}

              {isStation && <span className="text-[9px] font-medium leading-none text-plum-300">Rx</span>}

              {curriculumSessions.length > 0 && (
                <div className="mt-auto flex items-center gap-1 text-[9px] font-medium leading-none text-leather-200">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-leather-300" />
                  <span>{curriculumSessions.length} study</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
