'use client'

import { useMemo, useState } from 'react'
import { CalendarRange, LayoutGrid, ListChecks, MoonStar, Orbit, Sparkles } from 'lucide-react'
import { AccentCopy } from '@/components/blueprint/AccentCopy'
import { BlueprintNarrative } from '@/components/blueprint/BlueprintNarrative'
import { QuarterPanel } from './QuarterPanel'
import type { BlueprintOutput } from '@/types/blueprint'
import { cn } from '@/lib/utils'

type ViewMode = 'focus' | 'year'

interface CosmicPlanViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

export function CosmicPlanView({ blueprint, planYear }: CosmicPlanViewProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const initialQuarter = useMemo(() => {
    return blueprint.quarters.find((q) => q.quarter === currentQuarter)?.quarter
      ?? blueprint.quarters[0]?.quarter
      ?? 1
  }, [blueprint.quarters, currentQuarter])

  const [activeQuarter, setActiveQuarter] = useState<number>(initialQuarter)
  const [viewMode, setViewMode] = useState<ViewMode>('focus')

  const quarter = blueprint.quarters.find((q) => q.quarter === activeQuarter)

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 rounded-2xl border border-border/55 bg-stone-950/55 p-1"
          role="tablist"
          aria-label="Quarter"
        >
          {blueprint.quarters.map((q) => {
            const active = activeQuarter === q.quarter
            return (
              <button
                key={q.quarter}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveQuarter(q.quarter)}
                className={cn(
                  'rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-leather-500/35 text-bone shadow-[0_0_0_1px_hsl(var(--leather-400)/0.45)]'
                    : 'text-bone-muted/65 hover:text-bone'
                )}
              >
                Q{q.quarter}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-border/55 bg-stone-950/55 p-1">
          <ToggleButton
            active={viewMode === 'focus'}
            onClick={() => setViewMode('focus')}
            icon={<ListChecks size={14} />}
            label="Quarter Focus"
          />
          <ToggleButton
            active={viewMode === 'year'}
            onClick={() => setViewMode('year')}
            icon={<LayoutGrid size={14} />}
            label="Year at a Glance"
          />
        </div>
      </div>

      {viewMode === 'year' ? (
        <YearAtAGlance
          blueprint={blueprint}
          planYear={planYear}
          currentQuarter={currentQuarter}
          onSelectQuarter={(q) => {
            setActiveQuarter(q)
            setViewMode('focus')
          }}
        />
      ) : quarter ? (
        <QuarterPanel
          quarter={quarter}
          months={blueprint.months}
          weeks={blueprint.weeks}
          isCurrentQuarter={quarter.quarter === currentQuarter}
        />
      ) : null}
    </div>
  )
}

function ToggleButton({
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
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
        active ? 'bg-stone-900/75 text-bone' : 'text-bone-muted/60 hover:text-bone'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

interface YearAtAGlanceProps {
  blueprint: BlueprintOutput
  planYear: number
  currentQuarter: number
  onSelectQuarter: (quarter: number) => void
}

function YearAtAGlance({ blueprint, planYear, currentQuarter, onSelectQuarter }: YearAtAGlanceProps) {
  const hasPushRest = blueprint.pushPeriods.length > 0 || blueprint.restPeriods.length > 0
  const currentQuarterData = blueprint.quarters.find((q) => q.quarter === currentQuarter)

  return (
    <div className="shell-panel-hero px-5 py-5 md:px-6 md:py-6">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <div>
            <p className="shell-kicker mb-3">{planYear} Cosmic Plan</p>
            <h1 className="font-display text-[1.9rem] leading-[1.02] text-bone md:text-[2.35rem]">
              {blueprint.yearTheme}
            </h1>
            <BlueprintNarrative
              text={blueprint.yearSummary}
              tone="leather"
              className="mt-4 max-w-[62ch] text-[0.98rem] leading-[1.9] md:text-[1.02rem]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              icon={<Orbit size={15} />}
              eyebrow="Current quarter"
              value={`Q${currentQuarter}`}
              accent="leather"
              copy={currentQuarterData?.theme ?? 'Annual architecture in motion'}
            />
            <MetricTile
              icon={<Sparkles size={15} />}
              eyebrow="Structure"
              value={`${blueprint.quarters.length} quarters`}
              accent="plum"
              copy={`${blueprint.months.length} months layered underneath`}
            />
            <MetricTile
              icon={<CalendarRange size={15} />}
              eyebrow="Activation windows"
              value={String(blueprint.pushPeriods.length)}
              accent="leather"
              copy="High-momentum spans for action and visibility"
            />
            <MetricTile
              icon={<MoonStar size={15} />}
              eyebrow="Rest periods"
              value={String(blueprint.restPeriods.length)}
              accent="moss"
              copy="Recovery windows for consolidation and review"
            />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {blueprint.quarters.map((quarter) => {
            const tone =
              quarter.quarter === 1
                ? 'plum'
                : quarter.quarter === 2
                  ? 'leather'
                  : quarter.quarter === 3
                    ? 'ember'
                    : 'moss'

            return (
              <button
                key={quarter.quarter}
                type="button"
                onClick={() => onSelectQuarter(quarter.quarter)}
                className={cn(
                  'rounded-[1rem] border px-4 py-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-400/40',
                  quarter.quarter === currentQuarter
                    ? 'border-leather-400/40 bg-leather-500/12 shadow-[0_0_0_1px_hsl(var(--leather-400)/0.1),0_18px_44px_hsl(var(--leather-500)/0.16)]'
                    : tone === 'plum'
                      ? 'border-plum-400/18 bg-plum-400/7'
                      : tone === 'ember'
                        ? 'border-ember-400/18 bg-ember-400/7'
                        : tone === 'moss'
                          ? 'border-moss-500/18 bg-moss-500/7'
                          : 'border-leather-400/18 bg-leather-500/7'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-bone-muted/65">
                    Q{quarter.quarter}
                  </span>
                  {quarter.quarter === currentQuarter && (
                    <span className="rounded-full border border-leather-400/35 bg-leather-500/15 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-leather-200">
                      Live
                    </span>
                  )}
                </div>
                <p className="mt-3 font-display text-[1.08rem] leading-tight text-bone">
                  {quarter.theme}
                </p>
                <div className="mt-2 text-sm leading-6">
                  <AccentCopy
                    text={
                      quarter.focusAreas.length > 0
                        ? quarter.focusAreas.slice(0, 2).join(' · ')
                        : quarter.intention
                    }
                    tone={tone}
                    showMarker
                    leadClassName="text-bone"
                    restClassName="text-bone-muted/88"
                  />
                </div>
              </button>
            )
          })}
        </div>

        {hasPushRest && (
          <div className="grid gap-3 border-t border-border/40 pt-4 lg:grid-cols-2">
            {blueprint.pushPeriods.length > 0 && (
              <div>
                <p className="shell-eyebrow mb-2 text-leather-200/80">Activation windows</p>
                <div className="flex flex-wrap gap-2">
                  {blueprint.pushPeriods.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-leather-400/30 bg-leather-500/12 px-3 py-1 text-[0.72rem] text-bone-muted"
                      title={p.reason}
                    >
                      <span className="h-1 w-1 rounded-full bg-leather-300/70" />
                      <span className="text-bone">
                        {p.startDate} - {p.endDate}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {blueprint.restPeriods.length > 0 && (
              <div>
                <p className="shell-eyebrow mb-2 text-moss-200/80">Rest periods</p>
                <div className="flex flex-wrap gap-2">
                  {blueprint.restPeriods.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-moss-500/30 bg-moss-500/10 px-3 py-1 text-[0.72rem] text-bone-muted"
                      title={p.reason}
                    >
                      <span className="h-1 w-1 rounded-full bg-moss-300/70" />
                      <span className="text-bone">
                        {p.startDate} - {p.endDate}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricTileProps {
  icon: React.ReactNode
  eyebrow: string
  value: string
  copy: string
  accent: 'leather' | 'plum' | 'moss' | 'ember'
}

const METRIC_TONES: Record<
  MetricTileProps['accent'],
  { frame: string; text: string; eyebrow: string }
> = {
  leather: {
    frame:
      'border-leather-400/18 bg-leather-500/7 shadow-[0_0_0_1px_hsl(var(--leather-400)/0.08),0_18px_40px_hsl(var(--leather-500)/0.14)]',
    text: 'text-leather-200',
    eyebrow: 'text-leather-200/80',
  },
  plum: {
    frame:
      'border-plum-400/18 bg-plum-400/7 shadow-[0_0_0_1px_hsl(var(--plum-400)/0.08),0_18px_40px_hsl(var(--plum-400)/0.14)]',
    text: 'text-plum-300',
    eyebrow: 'text-plum-300/80',
  },
  moss: {
    frame:
      'border-moss-500/18 bg-moss-500/7 shadow-[0_0_0_1px_hsl(var(--moss-500)/0.08),0_18px_40px_hsl(var(--moss-500)/0.14)]',
    text: 'text-moss-200',
    eyebrow: 'text-moss-200/80',
  },
  ember: {
    frame:
      'border-ember-400/18 bg-ember-400/7 shadow-[0_0_0_1px_hsl(var(--ember-400)/0.08),0_18px_40px_hsl(var(--ember-400)/0.14)]',
    text: 'text-ember-300',
    eyebrow: 'text-ember-300/80',
  },
}

function MetricTile({ icon, eyebrow, value, copy, accent }: MetricTileProps) {
  const tone = METRIC_TONES[accent]
  return (
    <div className={cn('shell-panel-inline px-4 py-3', tone.frame)}>
      <div className={cn('flex items-center gap-2', tone.text)}>
        {icon}
        <p className={cn('shell-eyebrow', tone.eyebrow)}>{eyebrow}</p>
      </div>
      <p className="mt-3 text-xl font-semibold text-bone">{value}</p>
      <div className="mt-2 text-sm leading-6">
        <AccentCopy
          text={copy}
          tone={accent}
          showMarker
          leadClassName="text-bone"
          restClassName="text-bone-muted/88"
        />
      </div>
    </div>
  )
}
