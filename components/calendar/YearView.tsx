import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import type { MoonPhaseEvent } from '@/types/blueprint'
import { MONTH_NAMES } from './utils'

interface YearViewProps {
  year: number
  moonPhases: MoonPhaseEvent[]
  onMonthClick: (month: number) => void
}

export function YearView({ year, moonPhases, onMonthClick }: YearViewProps) {
  const dotsByMonth = new Map<number, MoonPhaseEvent[]>()
  for (const mp of moonPhases) {
    if (mp.phase !== 'new' && mp.phase !== 'full') continue
    const month = Number.parseInt(mp.date.slice(5, 7), 10)
    if (!dotsByMonth.has(month)) dotsByMonth.set(month, [])
    dotsByMonth.get(month)!.push(mp)
  }

  return (
    <div className="shell-panel px-6 py-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="shell-kicker mb-2">Year view</p>
          <h2 className="font-serif text-[2rem] text-bone">{year}</h2>
        </div>
        <p className="max-w-sm text-right text-sm text-bone-muted">
          New and full moon events mark the strongest monthly openings in your calendar.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {MONTH_NAMES.map((name, i) => {
          const month = i + 1
          const dots = dotsByMonth.get(month) ?? []

          return (
            <button
              key={month}
              onClick={() => onMonthClick(month)}
              className="group rounded-[1.1rem] border border-border/70 bg-stone-950/55 px-4 py-4 text-left transition-colors hover:border-leather-400/45 hover:bg-stone-900/80"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-widest text-bone-muted/55">
                {name.slice(0, 3)}
              </div>
              <div className="mb-3 text-lg font-semibold text-bone transition-colors group-hover:text-leather-200">
                {name}
              </div>
              {dots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dots.map((mp) => (
                    <span
                      key={mp.date}
                      title={`${mp.phase === 'new' ? 'New Moon' : 'Full Moon'} in ${mp.sign} - ${mp.date.slice(5)}`}
                    >
                      <MoonPhaseIcon phase={mp.phase} size={12} />
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-bone-muted/45">No major moon events cached</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
