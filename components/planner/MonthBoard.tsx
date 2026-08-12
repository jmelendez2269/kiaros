import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buildCalendarGrid, SHORT_DAY_NAMES } from '@/components/calendar/utils'
import type { MonthPlan } from '@/lib/planner/get-month-plan'

const ENERGY_DOT: Record<string, string> = {
  push: 'bg-leather-400',
  initiate: 'bg-ember-400',
  reflect: 'bg-plum-400',
  rest: 'bg-moss-400',
}

interface Props {
  plan: MonthPlan
  today: string
}

export function MonthBoard({ plan, today }: Props) {
  const grid = buildCalendarGrid(plan.year, plan.month)
  const summaryByDate = new Map(plan.days.map((d) => [d.date, d]))

  return (
    <div className="shell-panel overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-border/60 text-center">
        {SHORT_DAY_NAMES.map((label) => (
          <div
            key={label}
            className="bg-stone-900/80 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-bone-muted/60"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border/60">
        {grid.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[92px] bg-stone-950/60" />
          const summary = summaryByDate.get(date)
          const isToday = date === today
          const dayNum = Number.parseInt(date.slice(8), 10)

          return (
            <Link
              key={date}
              href={`/planner?date=${date}`}
              className={cn(
                'flex min-h-[92px] flex-col gap-1.5 bg-stone-900/60 px-2 py-2 transition-colors hover:bg-stone-900',
                isToday && 'ring-1 ring-inset ring-leather-400/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-sm font-semibold', isToday ? 'text-leather-200' : 'text-bone')}>{dayNum}</span>
                {summary?.character && (
                  <span
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ENERGY_DOT[summary.character.energyType])}
                    title={`${summary.character.label}${summary.character.reason ? ` · ${summary.character.reason}` : ''}`}
                  />
                )}
              </div>
              {summary && summary.itemCount > 0 && (
                <span className="text-[10px] text-bone-muted/60">
                  {summary.doneCount}/{summary.itemCount} done
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
