'use client'

import { useEffect, useState } from 'react'
import { LayoutList, Rows3 } from 'lucide-react'
import { BlueprintNarrative } from './BlueprintNarrative'
import { QuarterSection } from './QuarterSection'
import { BlueprintListMode } from './BlueprintListMode'
import type { BlueprintOutput, PeriodRange } from '@/types/blueprint'
import { cn } from '@/lib/utils'

interface BlueprintViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

type Mode = 'layered' | 'list'
const MODE_KEY = 'kiaros.blueprint.mode'

function shortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed)
}

export function BlueprintView({ blueprint, planYear }: BlueprintViewProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [mode, setMode] = useState<Mode>('layered')

  useEffect(() => {
    const stored = window.localStorage.getItem(MODE_KEY)
    if (stored === 'list' || stored === 'layered') setMode(stored)
  }, [])

  function updateMode(next: Mode) {
    setMode(next)
    window.localStorage.setItem(MODE_KEY, next)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="shell-kicker mb-1.5">{planYear} Blueprint</p>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-bone md:text-[2.1rem]">
            {blueprint.yearTheme || 'Your year, laid out'}
          </h1>
          <p className="mt-1.5 text-sm text-bone-muted">
            Everything for the year — quarters, months, and weeks — on one page.
          </p>
        </div>

        <div
          className="flex items-center gap-1 self-start rounded-full border border-border/60 bg-stone-950/60 p-1"
          role="tablist"
          aria-label="View mode"
        >
          <ModeButton
            active={mode === 'layered'}
            onClick={() => updateMode('layered')}
            icon={<Rows3 size={14} />}
            label="Layered"
          />
          <ModeButton
            active={mode === 'list'}
            onClick={() => updateMode('list')}
            icon={<LayoutList size={14} />}
            label="List"
          />
        </div>
      </header>

      <YearOverview blueprint={blueprint} />

      {mode === 'layered' ? (
        <div className="space-y-6">
          {blueprint.quarters.map((quarter) => (
            <QuarterSection
              key={quarter.quarter}
              quarter={quarter}
              months={blueprint.months}
              weeks={blueprint.weeks}
              isCurrentQuarter={quarter.quarter === currentQuarter}
              isPast={quarter.quarter < currentQuarter}
            />
          ))}
        </div>
      ) : (
        <BlueprintListMode blueprint={blueprint} currentQuarter={currentQuarter} />
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
        active ? 'bg-leather-500/30 text-bone shadow-[0_0_0_1px_hsl(var(--leather-400)/0.45)]' : 'text-bone-muted hover:text-bone'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function YearOverview({ blueprint }: { blueprint: BlueprintOutput }) {
  const hasInvitations = blueprint.pushPeriods.length > 0 || blueprint.restPeriods.length > 0

  return (
    <section className="shell-panel px-6 py-6 md:px-8 md:py-7">
      {blueprint.yearSummary ? (
        <BlueprintNarrative
          text={blueprint.yearSummary}
          tone="leather"
          className="max-w-[68ch] text-[1rem] leading-[1.85] text-bone"
        />
      ) : (
        <p className="text-sm text-bone-muted">No year summary was generated.</p>
      )}

      {hasInvitations ? (
        <div className="mt-6 grid gap-4 border-t border-border/50 pt-5 md:grid-cols-2">
          <InvitationStrip
            label="Active windows"
            tone="active"
            periods={blueprint.pushPeriods}
            empty="No active windows were named."
          />
          <InvitationStrip
            label="Passive windows"
            tone="passive"
            periods={blueprint.restPeriods}
            empty="No passive windows were named."
          />
        </div>
      ) : null}
    </section>
  )
}

function InvitationStrip({
  label,
  tone,
  periods,
  empty,
}: {
  label: string
  tone: 'active' | 'passive'
  periods: PeriodRange[]
  empty: string
}) {
  const accent = tone === 'active' ? 'text-amber-200/85' : 'text-emerald-200/85'
  const chip =
    tone === 'active'
      ? 'border-amber-500/35 bg-amber-950/30 text-amber-100'
      : 'border-emerald-500/35 bg-emerald-950/30 text-emerald-100'

  return (
    <div>
      <p className={cn('shell-eyebrow mb-2.5', accent)}>{label}</p>
      {periods.length === 0 ? (
        <p className="text-sm text-bone-muted/80">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {periods.map((p, i) => (
            <span
              key={`${p.startDate}-${i}`}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem]', chip)}
              title={p.reason}
            >
              <span className="font-mono text-[0.7rem]">
                {shortDate(p.startDate)}–{shortDate(p.endDate)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
