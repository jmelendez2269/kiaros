'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MonthSection } from './MonthSection'
import type { QuarterBlueprint, MonthBlueprint } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_NAMES = ['', 'Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_MONTHS = ['', 'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']

const QUARTER_TONES: Record<number, { border: string; bg: string; accent: string }> = {
  1: { border: 'border-plum-400/25', bg: 'bg-plum-400/6', accent: 'text-plum-300' },
  2: { border: 'border-leather-400/30', bg: 'bg-leather-500/8', accent: 'text-leather-200' },
  3: { border: 'border-ember-400/25', bg: 'bg-ember-400/6', accent: 'text-ember-300' },
  4: { border: 'border-moss-500/30', bg: 'bg-moss-500/8', accent: 'text-moss-200' },
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
        className="w-full px-6 py-5 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-400/40"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
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
            <h3 className="font-display text-[1.6rem] leading-tight text-bone md:text-[1.8rem]">
              {quarter.theme}
            </h3>
            {!open && quarter.focusAreas.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {quarter.focusAreas.map((area) => (
                  <span
                    key={area}
                    className="shell-pill"
                  >
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
        <div className="space-y-6 border-t border-border/50 px-6 pb-7 pt-5">
          {quarter.intention && (
            <p className="shell-prose max-w-3xl">{quarter.intention}</p>
          )}

          {quarter.focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quarter.focusAreas.map((area) => (
                <span key={area} className="shell-pill">{area}</span>
              ))}
            </div>
          )}

          {quarter.cosmicHighlights.length > 0 && (
            <div>
              <p className="shell-eyebrow mb-3">Cosmic highlights</p>
              <ul className="space-y-2">
                {quarter.cosmicHighlights.map((h, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-[1.65] text-bone-muted">
                    <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-bone-muted/35" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(quarter.pushPeriods.length > 0 || quarter.restPeriods.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {quarter.pushPeriods.length > 0 && (
                <div className="shell-panel-inline px-4 py-3">
                  <p className="shell-eyebrow mb-2 text-leather-200/80">Activation windows</p>
                  {quarter.pushPeriods.map((p, i) => (
                    <div key={i} className="text-xs text-bone-muted">
                      <span className="font-medium text-bone">{p.startDate} – {p.endDate}</span>
                      {p.reason && <span className="ml-1.5">{p.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
              {quarter.restPeriods.length > 0 && (
                <div className="shell-panel-inline px-4 py-3">
                  <p className="shell-eyebrow mb-2 text-moss-200/80">Rest periods</p>
                  {quarter.restPeriods.map((p, i) => (
                    <div key={i} className="text-xs text-bone-muted">
                      <span className="font-medium text-bone">{p.startDate} – {p.endDate}</span>
                      {p.reason && <span className="ml-1.5">{p.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {quarterMonths.length > 0 && (
            <div className="space-y-4 border-t border-border/50 pt-5">
              {quarterMonths.map((month) => (
                <MonthSection key={month.month} month={month} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
