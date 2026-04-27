import { CalendarDays, CalendarRange, CheckCircle2, Target } from 'lucide-react'
import { MonthCard } from './MonthCard'
import { WeekRow } from './WeekRow'
import type { MonthBlueprint, QuarterBlueprint, WeekBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_TONES: Record<
  number,
  {
    heroBorder: string
    heroBg: string
    accent: string
    accentSoft: string
    marker: string
    tone: 'plum' | 'leather' | 'ember' | 'moss'
  }
> = {
  1: {
    heroBorder: 'border-plum-400/35',
    heroBg: 'bg-plum-400/8',
    accent: 'text-plum-300',
    accentSoft: 'text-plum-300/85',
    marker: 'bg-plum-300/85',
    tone: 'plum',
  },
  2: {
    heroBorder: 'border-leather-400/40',
    heroBg: 'bg-leather-500/10',
    accent: 'text-leather-200',
    accentSoft: 'text-leather-200/85',
    marker: 'bg-leather-300/85',
    tone: 'leather',
  },
  3: {
    heroBorder: 'border-ember-400/35',
    heroBg: 'bg-ember-400/8',
    accent: 'text-ember-300',
    accentSoft: 'text-ember-300/85',
    marker: 'bg-ember-300/85',
    tone: 'ember',
  },
  4: {
    heroBorder: 'border-moss-500/40',
    heroBg: 'bg-moss-500/8',
    accent: 'text-moss-200',
    accentSoft: 'text-moss-200/85',
    marker: 'bg-moss-300/85',
    tone: 'moss',
  },
}

interface QuarterPanelProps {
  quarter: QuarterBlueprint
  months: MonthBlueprint[]
  weeks: WeekBlueprint[]
  isCurrentQuarter: boolean
}

export function QuarterPanel({ quarter, months, weeks, isCurrentQuarter }: QuarterPanelProps) {
  const tone = QUARTER_TONES[quarter.quarter] ?? QUARTER_TONES[1]
  const quarterMonths = months.filter((m) => Math.ceil(m.month / 3) === quarter.quarter)

  const startMonth = (quarter.quarter - 1) * 3 + 1
  const endMonth = quarter.quarter * 3
  const quarterWeeks = weeks.filter((w) => {
    const month = parseInt(w.startDate.slice(5, 7), 10)
    return Number.isFinite(month) && month >= startMonth && month <= endMonth
  })

  const description = quarter.cosmicHighlights[0] ?? ''
  const hasWindows = quarter.pushPeriods.length > 0 || quarter.restPeriods.length > 0
  const restHighlights = quarter.cosmicHighlights.slice(1)

  return (
    <div className="space-y-6">
      <section
        className={cn(
          'overflow-hidden rounded-[1.35rem] border px-5 py-5 md:px-6 md:py-6',
          tone.heroBorder,
          tone.heroBg
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={cn('shell-kicker', tone.accent)}>Q{quarter.quarter}</span>
              {isCurrentQuarter && (
                <span className="inline-flex items-center gap-1 rounded-full border border-leather-400/40 bg-leather-500/20 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-leather-200">
                  <span className="h-1 w-1 rounded-full bg-leather-300" />
                  Now
                </span>
              )}
            </div>
            <h2 className="font-display text-[1.85rem] leading-[1.05] text-bone md:text-[2.2rem]">
              Q{quarter.quarter}: {quarter.theme}
            </h2>
            {quarter.intention && (
              <p className={cn('mt-3 italic text-base md:text-[1.05rem]', tone.accent)}>
                &ldquo;{quarter.intention}&rdquo;
              </p>
            )}
            {description && (
              <p className="mt-4 max-w-[60ch] text-[0.95rem] leading-7 text-bone-muted/85">
                {description}
              </p>
            )}
          </div>

          {quarter.focusAreas.length > 0 && (
            <div className="rounded-2xl border border-moss-500/25 bg-moss-500/8 px-4 py-4 shadow-[0_0_0_1px_hsl(var(--moss-500)/0.06),0_16px_36px_hsl(var(--moss-500)/0.1)]">
              <div className="flex items-center gap-2 text-moss-200">
                <Target size={14} />
                <p className="shell-eyebrow text-moss-200/85">Focus Areas</p>
              </div>
              <ul className="mt-3 space-y-2">
                {quarter.focusAreas.map((area) => (
                  <li key={area} className="flex items-start gap-2 text-[0.92rem] leading-6 text-bone">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-300/85" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {(restHighlights.length > 0 || hasWindows) && (
          <div className="mt-6 grid gap-5 border-t border-border/40 pt-5 md:grid-cols-2">
            {restHighlights.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-moss-300">
                  <CheckCircle2 size={15} />
                  <p className="shell-eyebrow text-moss-300/85">Cosmic Highlights</p>
                </div>
                <ul className="space-y-2.5">
                  {restHighlights.map((highlight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-[0.92rem] leading-7 text-bone"
                    >
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-moss-300/85" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasWindows && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-ember-300">
                  <CalendarRange size={15} />
                  <p className="shell-eyebrow text-ember-300/85">Activation &amp; Rest Windows</p>
                </div>
                <ul className="space-y-2.5">
                  {quarter.pushPeriods.map((p, i) => (
                    <li key={`push-${i}`} className="flex items-start gap-2.5 text-[0.9rem] leading-6">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leather-300/85" />
                      <span>
                        <span className="font-medium text-leather-200">Push</span>
                        <span className="text-bone-muted/80"> · </span>
                        <span className="text-bone">
                          {p.startDate} – {p.endDate}
                        </span>
                        {p.reason ? (
                          <span className="text-bone-muted/85"> · {p.reason}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {quarter.restPeriods.map((p, i) => (
                    <li key={`rest-${i}`} className="flex items-start gap-2.5 text-[0.9rem] leading-6">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-300/85" />
                      <span>
                        <span className="font-medium text-moss-200">Rest</span>
                        <span className="text-bone-muted/80"> · </span>
                        <span className="text-bone">
                          {p.startDate} – {p.endDate}
                        </span>
                        {p.reason ? (
                          <span className="text-bone-muted/85"> · {p.reason}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {quarterMonths.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quarterMonths.map((month) => (
            <MonthCard key={month.month} month={month} tone={tone.tone} />
          ))}
        </div>
      )}

      {quarterWeeks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-t border-border/40 pt-5">
            <CalendarDays size={18} className={tone.accent} />
            <h3 className="font-display text-[1.1rem] text-bone">Weekly Execution Map</h3>
          </div>
          <div className="space-y-3">
            {quarterWeeks.map((week) => (
              <WeekRow key={week.weekNumber} week={week} tone={tone.tone} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
