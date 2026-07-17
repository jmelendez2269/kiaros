'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { MonthSection } from './MonthSection'
import { WeekRow } from '@/components/cosmic-plan/WeekRow'
import type { MonthBlueprint, QuarterBlueprint, WeekBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_WINDOWS = ['', 'Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']

type Tone = 'plum' | 'leather' | 'ember' | 'moss'

const QUARTER_TONES: Record<
  number,
  {
    border: string
    heading: string
    panel: string
    chip: string
    dot: string
    tone: Tone
  }
> = {
  1: {
    border: 'border-plum-400/25',
    heading: 'text-plum-300',
    panel: 'border-plum-400/20 bg-plum-400/8',
    chip: 'border-plum-400/35 bg-plum-400/16 text-plum-300',
    dot: 'bg-plum-300',
    tone: 'plum',
  },
  2: {
    border: 'border-leather-400/25',
    heading: 'text-leather-200',
    panel: 'border-leather-400/20 bg-leather-500/8',
    chip: 'border-leather-400/35 bg-leather-500/16 text-leather-200',
    dot: 'bg-leather-300',
    tone: 'leather',
  },
  3: {
    border: 'border-ember-400/25',
    heading: 'text-ember-300',
    panel: 'border-ember-400/20 bg-ember-400/8',
    chip: 'border-ember-400/35 bg-ember-400/16 text-ember-300',
    dot: 'bg-ember-300',
    tone: 'ember',
  },
  4: {
    border: 'border-moss-500/25',
    heading: 'text-moss-200',
    panel: 'border-moss-500/20 bg-moss-500/8',
    chip: 'border-moss-500/35 bg-moss-500/16 text-moss-200',
    dot: 'bg-moss-300',
    tone: 'moss',
  },
}

interface QuarterSectionProps {
  quarter: QuarterBlueprint
  months: MonthBlueprint[]
  weeks: WeekBlueprint[]
  isCurrentQuarter: boolean
  isPast: boolean
}

export function QuarterSection({ quarter, months, weeks, isCurrentQuarter, isPast }: QuarterSectionProps) {
  const [collapsed, setCollapsed] = useState(isPast)
  const quarterMonths = months.filter((month) => Math.ceil(month.month / 3) === quarter.quarter)
  const tone = QUARTER_TONES[quarter.quarter] ?? QUARTER_TONES[1]

  const startMonth = (quarter.quarter - 1) * 3 + 1
  const endMonth = quarter.quarter * 3
  const quarterWeeks = isCurrentQuarter
    ? weeks.filter((w) => {
        const month = parseInt(w.startDate.slice(5, 7), 10)
        return Number.isFinite(month) && month >= startMonth && month <= endMonth
      })
    : []

  if (collapsed) {
    return (
      <section
        id={`q${quarter.quarter}`}
        className={cn('scroll-mt-10 overflow-hidden rounded-[1.75rem] border bg-stone-950/60', tone.border)}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] md:px-6"
        >
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.22em]',
              tone.chip
            )}
          >
            Q{quarter.quarter} · {QUARTER_WINDOWS[quarter.quarter]}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-bone">{quarter.theme}</span>
          <ChevronDown size={16} className="shrink-0 text-bone-muted/60" />
        </button>
      </section>
    )
  }

  return (
    <section
      id={`q${quarter.quarter}`}
      className={cn('scroll-mt-10 overflow-hidden rounded-[1.75rem] border bg-stone-950/60', tone.border)}
    >
      <header className="px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-5xl text-stone-800/80">
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
          {isPast ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ml-auto text-xs text-bone-muted/60 underline underline-offset-2 hover:text-bone-muted"
            >
              Collapse
            </button>
          ) : null}
        </div>
        <h3 className="mt-3 font-display text-[1.55rem] leading-tight text-bone">
          {quarter.theme}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-bone-muted">{quarter.intention}</p>
      </header>

      <div className="space-y-5 border-t border-border/50 px-5 pb-5 pt-5 md:px-6 md:pb-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className={cn('rounded-3xl border p-5', tone.panel)}>
            {quarter.focusAreas.length > 0 ? (
              <div>
                <p className={cn('shell-eyebrow', tone.heading)}>
                  Focus areas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quarter.focusAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-border/60 bg-stone-950/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-bone-muted"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {quarter.cosmicHighlights.length > 0 ? (
              <div className={quarter.focusAreas.length > 0 ? 'mt-5' : ''}>
                <p className={cn('shell-eyebrow flex items-center gap-2', tone.heading)}>
                  <Sparkles size={14} />
                  Cosmic highlights
                </p>
                <div className="mt-4 space-y-3">
                  {quarter.cosmicHighlights.map((highlight, index) => (
                    <div key={index} className="flex gap-3 rounded-2xl border border-border/50 bg-black/20 p-3">
                      <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', tone.dot)} />
                      <p className="text-sm leading-7 text-bone-muted">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-leather-400/20 bg-leather-500/8 p-5">
              <p className="shell-eyebrow text-leather-200/85">
                Active windows
              </p>
              <div className="mt-4 space-y-3">
                {quarter.pushPeriods.length > 0 ? (
                  quarter.pushPeriods.map((period, index) => (
                    <div key={index} className="rounded-2xl border border-leather-400/15 bg-black/20 p-3">
                      <p className="text-xs font-mono uppercase text-bone-muted/60">
                        {period.startDate} - {period.endDate}
                      </p>
                      <p className="mt-1 text-sm leading-7 text-bone-muted">
                        {period.reason || 'An invitation toward forward motion.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-bone-muted/70">No quarter-specific active windows listed.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-moss-500/20 bg-moss-500/8 p-5">
              <p className="shell-eyebrow text-moss-200/85">
                Passive windows
              </p>
              <div className="mt-4 space-y-3">
                {quarter.restPeriods.length > 0 ? (
                  quarter.restPeriods.map((period, index) => (
                    <div key={index} className="rounded-2xl border border-moss-500/15 bg-black/20 p-3">
                      <p className="text-xs font-mono uppercase text-bone-muted/60">
                        {period.startDate} - {period.endDate}
                      </p>
                      <p className="mt-1 text-sm leading-7 text-bone-muted">
                        {period.reason || 'An invitation toward integration and recalibration.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-bone-muted/70">No quarter-specific passive windows listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {quarterMonths.length > 0 ? (
          <div className="grid gap-4 border-t border-border/50 pt-5 md:grid-cols-2 xl:grid-cols-3">
            {quarterMonths.map((month) => (
              <MonthSection key={month.month} month={month} quarter={quarter.quarter} />
            ))}
          </div>
        ) : null}

        {quarterWeeks.length > 0 ? (
          <div className="space-y-3 border-t border-border/50 pt-5">
            <p className={cn('shell-eyebrow', tone.heading)}>This quarter's weeks</p>
            <div className="space-y-3">
              {quarterWeeks.map((week) => (
                <WeekRow key={week.weekNumber} week={week} tone={tone.tone} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
