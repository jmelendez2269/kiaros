'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AccentCopy } from './AccentCopy'
import { MonthSection } from './MonthSection'
import type { MonthBlueprint, QuarterBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_NAMES = ['', 'Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_MONTHS = ['', 'Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']

const QUARTER_TONES: Record<
  number,
  {
    border: string
    bg: string
    accent: string
    marker: string
    panel: string
    tone: 'plum' | 'leather' | 'ember' | 'moss'
  }
> = {
  1: {
    border: 'border-plum-400/25',
    bg: 'bg-plum-400/6',
    accent: 'text-plum-300',
    marker: 'bg-plum-300/85',
    panel: 'border-plum-400/15 bg-plum-400/8',
    tone: 'plum',
  },
  2: {
    border: 'border-leather-400/30',
    bg: 'bg-leather-500/8',
    accent: 'text-leather-200',
    marker: 'bg-leather-300/85',
    panel: 'border-leather-400/15 bg-leather-500/8',
    tone: 'leather',
  },
  3: {
    border: 'border-ember-400/25',
    bg: 'bg-ember-400/6',
    accent: 'text-ember-300',
    marker: 'bg-ember-300/85',
    panel: 'border-ember-400/15 bg-ember-400/8',
    tone: 'ember',
  },
  4: {
    border: 'border-moss-500/30',
    bg: 'bg-moss-500/8',
    accent: 'text-moss-200',
    marker: 'bg-moss-300/85',
    panel: 'border-moss-500/15 bg-moss-500/8',
    tone: 'moss',
  },
}

interface QuarterSectionProps {
  quarter: QuarterBlueprint
  months: MonthBlueprint[]
  isCurrentQuarter: boolean
}

export function QuarterSection({ quarter, months, isCurrentQuarter }: QuarterSectionProps) {
  const [open, setOpen] = useState(isCurrentQuarter)
  const quarterMonths = months.filter((m) => Math.ceil(m.month / 3) === quarter.quarter)
  const tone = QUARTER_TONES[quarter.quarter] ?? QUARTER_TONES[1]

  return (
    <section className={cn('overflow-hidden rounded-[1.35rem] border', tone.border, tone.bg)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-400/40 md:px-6"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={cn('shell-kicker', tone.accent)}>
                {QUARTER_NAMES[quarter.quarter]} · {QUARTER_MONTHS[quarter.quarter]}
              </span>
              {isCurrentQuarter && (
                <span className="inline-flex items-center gap-1 rounded-full border border-leather-400/40 bg-leather-500/20 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-leather-200">
                  <span className="h-1 w-1 rounded-full bg-leather-300" />
                  Now
                </span>
              )}
            </div>
            <h3 className="font-display text-[1.35rem] leading-tight text-bone md:text-[1.6rem]">
              {quarter.theme}
            </h3>
            <div className="mt-3 max-w-3xl text-sm leading-7">
              <AccentCopy
                text={quarter.intention}
                tone={tone.tone}
                showMarker
                leadClassName="text-bone"
                restClassName="text-bone-muted/90"
              />
            </div>
            {!open && quarter.focusAreas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {quarter.focusAreas.slice(0, 4).map((area) => (
                  <span key={area} className="shell-pill">
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ChevronDown
            size={18}
            className={cn(
              'mt-1.5 shrink-0 text-bone-muted/60 transition-transform duration-300',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'opacity-100' : 'max-h-0 opacity-0'
        )}
        style={open ? { maxHeight: 'none' } : {}}
      >
        <div className="space-y-5 border-t border-border/50 px-5 pb-5 pt-4 md:px-6 md:pb-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <div className={cn('shell-panel-inline px-4 py-4', tone.panel)}>
              {quarter.focusAreas.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {quarter.focusAreas.map((area) => (
                    <span key={area} className="shell-pill">
                      {area}
                    </span>
                  ))}
                </div>
              )}

              {quarter.cosmicHighlights.length > 0 && (
                <div>
                  <p className={cn('shell-eyebrow mb-3', tone.accent)}>Cosmic highlights</p>
                  <ul className="space-y-3">
                    {quarter.cosmicHighlights.map((highlight, i) => (
                      <li key={i} className="text-sm leading-[1.7]">
                        <AccentCopy
                          text={highlight}
                          tone={tone.tone}
                          showMarker
                          leadClassName="text-bone"
                          restClassName="text-bone-muted/88"
                          markerClassName="w-7"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {(quarter.pushPeriods.length > 0 || quarter.restPeriods.length > 0) && (
              <div className="grid gap-3">
                {quarter.pushPeriods.length > 0 && (
                  <div className="shell-panel-inline border-leather-400/15 bg-leather-500/8 px-4 py-3">
                    <p className="shell-eyebrow mb-2 text-leather-200/80">Activation windows</p>
                    <div className="space-y-2">
                      {quarter.pushPeriods.map((p, i) => (
                        <div key={i} className="rounded-2xl border border-leather-400/15 bg-black/10 px-3 py-2 text-xs leading-5">
                          <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                          {p.reason ? <span className="ml-1.5 text-bone-muted/88">{p.reason}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {quarter.restPeriods.length > 0 && (
                  <div className="shell-panel-inline border-moss-500/15 bg-moss-500/8 px-4 py-3">
                    <p className="shell-eyebrow mb-2 text-moss-200/80">Rest periods</p>
                    <div className="space-y-2">
                      {quarter.restPeriods.map((p, i) => (
                        <div key={i} className="rounded-2xl border border-moss-500/15 bg-black/10 px-3 py-2 text-xs leading-5">
                          <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                          {p.reason ? <span className="ml-1.5 text-bone-muted/88">{p.reason}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {quarterMonths.length > 0 && (
            <div className="grid gap-3 border-t border-border/50 pt-4 md:grid-cols-2 xl:grid-cols-3">
              {quarterMonths.map((month) => (
                <MonthSection key={month.month} month={month} tone={tone.tone} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
