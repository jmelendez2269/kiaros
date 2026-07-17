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
    border: 'border-plum-400/20 bg-plum-400/6',
    accent: 'text-plum-300',
    badge: 'border-plum-400/30 bg-plum-400/16 text-plum-300',
    dot: 'bg-plum-300',
  },
  2: {
    border: 'border-leather-400/20 bg-leather-500/6',
    accent: 'text-leather-200',
    badge: 'border-leather-400/30 bg-leather-500/16 text-leather-200',
    dot: 'bg-leather-300',
  },
  3: {
    border: 'border-ember-400/20 bg-ember-400/6',
    accent: 'text-ember-300',
    badge: 'border-ember-400/30 bg-ember-400/16 text-ember-300',
    dot: 'bg-ember-300',
  },
  4: {
    border: 'border-moss-500/20 bg-moss-500/6',
    accent: 'text-moss-200',
    badge: 'border-moss-500/30 bg-moss-500/16 text-moss-200',
    dot: 'bg-moss-300',
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
          <h4 className="font-display text-xl text-bone">{month.name}</h4>
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

      <div className="mt-4 space-y-4 text-sm leading-7 text-bone-muted">
        <div>
          <p className="shell-eyebrow text-bone-muted/60">Energy arc</p>
          <p className="mt-2">{month.energyArc || 'No energy arc provided for this month.'}</p>
        </div>

        {month.intentions.length > 0 ? (
          <div>
            <p className="shell-eyebrow text-bone-muted/60">Intentions</p>
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
            <p className="shell-eyebrow text-bone-muted/60">Moon phases</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {month.moonPhases.slice(0, 2).map((phase, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-stone-950/80 px-3 py-1 text-[0.72rem] text-bone-muted"
                  title={phase.significance}
                >
                  <MoonPhaseIcon phase={MOON_PHASE_MAP[phase.phase] ?? (phase.phase as LunarPhase)} size={12} />
                  <span className="text-bone">{phase.date}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {month.keyTransits.length > 0 ? (
          <div>
            <p className="shell-eyebrow text-bone-muted/60">Key transits</p>
            <div className="mt-2 space-y-2">
              {month.keyTransits.slice(0, 2).map((transit, index) => (
                <div key={index} className="rounded-2xl border border-border/50 bg-black/20 px-3 py-2 text-bone-muted">
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
