import { ArrowDownCircle } from 'lucide-react'
import type { EnergyType, WeekBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

type Tone = 'plum' | 'leather' | 'ember' | 'moss'

const ENERGY_TONES: Record<EnergyType, { chip: string; label: string }> = {
  push: {
    chip: 'border-leather-400/35 bg-leather-500/15 text-leather-200',
    label: 'Push',
  },
  rest: {
    chip: 'border-moss-500/35 bg-moss-500/12 text-moss-200',
    label: 'Rest',
  },
  reflect: {
    chip: 'border-plum-400/35 bg-plum-400/12 text-plum-300',
    label: 'Reflect',
  },
  initiate: {
    chip: 'border-ember-400/35 bg-ember-400/12 text-ember-300',
    label: 'Initiate',
  },
}

const TONE_ACCENT: Record<Tone, string> = {
  plum: 'text-plum-300',
  leather: 'text-leather-200',
  ember: 'text-ember-300',
  moss: 'text-moss-200',
}

interface WeekRowProps {
  week: WeekBlueprint
  tone: Tone
}

export function WeekRow({ week, tone }: WeekRowProps) {
  const energy = ENERGY_TONES[week.energyType]
  const accent = TONE_ACCENT[tone]

  return (
    <article className="rounded-[1.15rem] border border-border/55 bg-stone-950/45 px-4 py-4 md:px-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)_minmax(0,1.05fr)]">
        <div className="space-y-3 md:border-r md:border-border/40 md:pr-4">
          <div>
            <h4 className="font-display text-[1.05rem] text-bone">Week {week.weekNumber}</h4>
            <p className="mt-1 text-xs text-bone-muted/65">{week.startDate}</p>
          </div>

          {week.theme && (
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium',
                energy?.chip ?? 'border-border/55 bg-stone-900/60 text-bone-muted'
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current opacity-70" />
              <span className="truncate">{week.theme}</span>
            </span>
          )}

          {week.cosmicContext && (
            <div>
              <p className="shell-eyebrow text-bone-muted/55">Climate</p>
              <p className="mt-1 text-[0.85rem] italic leading-[1.65] text-bone-muted/85">
                &ldquo;{week.cosmicContext}&rdquo;
              </p>
            </div>
          )}
        </div>

        {week.intentions.length > 0 ? (
          <div>
            <p className={cn('shell-eyebrow mb-2', accent)}>Primary intentions</p>
            <ul className="space-y-1.5">
              {week.intentions.map((intention, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.86rem] leading-6 text-bone">
                  <ArrowDownCircle
                    size={14}
                    className="mt-1 shrink-0 text-bone-muted/55"
                    aria-hidden="true"
                  />
                  <span>{intention}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div />
        )}

        {week.goalCategoryFocus.length > 0 ? (
          <div>
            <p className="shell-eyebrow mb-2 text-bone-muted/65">Goal focus</p>
            <div className="flex flex-wrap gap-1.5">
              {week.goalCategoryFocus.map((g) => (
                <span key={g} className="shell-pill">
                  {g}
                </span>
              ))}
            </div>
            {energy && (
              <p className="mt-3 text-[0.7rem] uppercase tracking-[0.18em] text-bone-muted/55">
                Energy · <span className="text-bone-muted/80">{energy.label}</span>
              </p>
            )}
          </div>
        ) : (
          <div />
        )}
      </div>
    </article>
  )
}
