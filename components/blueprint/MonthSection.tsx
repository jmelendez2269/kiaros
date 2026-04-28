import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import type { LunarPhase, MonthBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const MOON_PHASE_MAP: Record<string, LunarPhase> = {
  new: 'new',
  'first-quarter': 'first-quarter',
  full: 'full',
  'last-quarter': 'last-quarter',
}

const QUARTER_MONTH_TONES: Record<
  number,
  {
    border: string
    accent: string
    badge: string
    dot: string
  }
> = {
  1: {
    border: 'border-indigo-500/20 bg-indigo-950/14',
    accent: 'text-indigo-200',
    badge: 'border-indigo-500/30 bg-indigo-950/50 text-indigo-200',
    dot: 'bg-indigo-300',
  },
  2: {
    border: 'border-teal-500/20 bg-teal-950/14',
    accent: 'text-teal-200',
    badge: 'border-teal-500/30 bg-teal-950/50 text-teal-200',
    dot: 'bg-teal-300',
  },
  3: {
    border: 'border-amber-500/20 bg-amber-950/14',
    accent: 'text-amber-200',
    badge: 'border-amber-500/30 bg-amber-950/50 text-amber-200',
    dot: 'bg-amber-300',
  },
  4: {
    border: 'border-emerald-500/20 bg-emerald-950/14',
    accent: 'text-emerald-200',
    badge: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-200',
    dot: 'bg-emerald-300',
  },
}

interface MonthSectionProps {
  month: MonthBlueprint
  quarter: number
}

export function MonthSection({ month, quarter }: MonthSectionProps) {
  const tone = QUARTER_MONTH_TONES[quarter] ?? QUARTER_MONTH_TONES[1]

  return (
    <article className={cn('rounded-3xl border p-4', tone.border)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-serif text-xl text-slate-50">{month.name}</h4>
          <p className={cn('mt-1 text-sm', tone.accent)}>{month.theme || 'Untitled month'}</p>
        </div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.18em]',
            tone.badge
          )}
        >
          Month {month.month}
        </span>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Energy arc</p>
          <p className="mt-2">{month.energyArc || 'No energy arc provided for this month.'}</p>
        </div>

        {month.intentions.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Intentions</p>
            <ul className="mt-2 space-y-2">
              {month.intentions.slice(0, 3).map((intention, index) => (
                <li key={index} className="flex gap-3">
                  <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
                  <span>{intention}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {month.moonPhases.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Moon phases</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {month.moonPhases.slice(0, 2).map((phase, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[0.72rem] text-slate-300"
                  title={phase.significance}
                >
                  <MoonPhaseIcon phase={MOON_PHASE_MAP[phase.phase] ?? (phase.phase as LunarPhase)} size={12} />
                  <span className="text-slate-100">{phase.date}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {month.keyTransits.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Key transits</p>
            <div className="mt-2 space-y-2">
              {month.keyTransits.slice(0, 2).map((transit, index) => (
                <div key={index} className="rounded-2xl border border-slate-800 bg-black/20 px-3 py-2 text-slate-300">
                  {transit}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
