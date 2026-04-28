import { Sparkles } from 'lucide-react'
import { MonthSection } from './MonthSection'
import type { MonthBlueprint, QuarterBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_WINDOWS = ['', 'Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']

const QUARTER_TONES: Record<
  number,
  {
    border: string
    heading: string
    panel: string
    chip: string
    dot: string
  }
> = {
  1: {
    border: 'border-indigo-500/25',
    heading: 'text-indigo-300',
    panel: 'border-indigo-500/20 bg-indigo-950/20',
    chip: 'border-indigo-500/35 bg-indigo-950/45 text-indigo-200',
    dot: 'bg-indigo-400',
  },
  2: {
    border: 'border-teal-500/25',
    heading: 'text-teal-300',
    panel: 'border-teal-500/20 bg-teal-950/20',
    chip: 'border-teal-500/35 bg-teal-950/45 text-teal-200',
    dot: 'bg-teal-400',
  },
  3: {
    border: 'border-amber-500/25',
    heading: 'text-amber-300',
    panel: 'border-amber-500/20 bg-amber-950/20',
    chip: 'border-amber-500/35 bg-amber-950/45 text-amber-200',
    dot: 'bg-amber-400',
  },
  4: {
    border: 'border-emerald-500/25',
    heading: 'text-emerald-300',
    panel: 'border-emerald-500/20 bg-emerald-950/20',
    chip: 'border-emerald-500/35 bg-emerald-950/45 text-emerald-200',
    dot: 'bg-emerald-400',
  },
}

interface QuarterSectionProps {
  quarter: QuarterBlueprint
  months: MonthBlueprint[]
  isCurrentQuarter: boolean
}

export function QuarterSection({ quarter, months, isCurrentQuarter }: QuarterSectionProps) {
  const quarterMonths = months.filter((month) => Math.ceil(month.month / 3) === quarter.quarter)
  const tone = QUARTER_TONES[quarter.quarter] ?? QUARTER_TONES[1]

  return (
    <section className={cn('overflow-hidden rounded-[1.75rem] border bg-slate-950/60', tone.border)}>
      <header className="px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-5xl font-serif font-bold text-slate-800/80">
            0{quarter.quarter}
          </span>
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.22em]',
              tone.chip
            )}
          >
            Q{quarter.quarter} · {QUARTER_WINDOWS[quarter.quarter]}
          </span>
          {isCurrentQuarter ? (
            <span className="rounded-full border border-leather-400/45 bg-leather-500/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-leather-200">
              Current
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 font-serif text-[1.55rem] leading-tight text-slate-50">
          {quarter.theme}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{quarter.intention}</p>
      </header>

      <div className="space-y-5 border-t border-slate-800 px-5 pb-5 pt-5 md:px-6 md:pb-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className={cn('rounded-3xl border p-5', tone.panel)}>
            {quarter.focusAreas.length > 0 ? (
              <div>
                <p className={cn('text-xs font-bold uppercase tracking-[0.22em]', tone.heading)}>
                  Focus areas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quarter.focusAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {quarter.cosmicHighlights.length > 0 ? (
              <div className={quarter.focusAreas.length > 0 ? 'mt-5' : ''}>
                <p className={cn('flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em]', tone.heading)}>
                  <Sparkles size={14} />
                  Cosmic highlights
                </p>
                <div className="mt-4 space-y-3">
                  {quarter.cosmicHighlights.map((highlight, index) => (
                    <div key={index} className="flex gap-3 rounded-2xl border border-slate-800 bg-black/20 p-3">
                      <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', tone.dot)} />
                      <p className="text-sm leading-7 text-slate-300">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
                Active windows
              </p>
              <div className="mt-4 space-y-3">
                {quarter.pushPeriods.length > 0 ? (
                  quarter.pushPeriods.map((period, index) => (
                    <div key={index} className="rounded-2xl border border-amber-500/15 bg-black/20 p-3">
                      <p className="text-xs font-mono uppercase text-slate-500">
                        {period.startDate} - {period.endDate}
                      </p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        {period.reason || 'An invitation toward forward motion.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-400">No quarter-specific active windows listed.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
                Passive windows
              </p>
              <div className="mt-4 space-y-3">
                {quarter.restPeriods.length > 0 ? (
                  quarter.restPeriods.map((period, index) => (
                    <div key={index} className="rounded-2xl border border-emerald-500/15 bg-black/20 p-3">
                      <p className="text-xs font-mono uppercase text-slate-500">
                        {period.startDate} - {period.endDate}
                      </p>
                      <p className="mt-1 text-sm leading-7 text-slate-300">
                        {period.reason || 'An invitation toward integration and recalibration.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-400">No quarter-specific passive windows listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {quarterMonths.length > 0 ? (
          <div className="grid gap-4 border-t border-slate-800 pt-5 md:grid-cols-2 xl:grid-cols-3">
            {quarterMonths.map((month) => (
              <MonthSection key={month.month} month={month} quarter={quarter.quarter} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
