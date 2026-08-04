import Link from 'next/link'
import { ArrowRight, CalendarDays, CalendarRange, LayoutGrid, ListChecks, MoonStar, Orbit, Sparkles } from 'lucide-react'
import { AccentCopy } from '@/components/blueprint/AccentCopy'
import type { BlueprintOutput } from '@/types/blueprint'
import { cn } from '@/lib/utils'

interface CosmicPlanViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

export function CosmicPlanView({ blueprint, planYear }: CosmicPlanViewProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)
  const currentQuarterData = blueprint.quarters.find((q) => q.quarter === currentQuarter)

  return (
    <div className="shell-panel-hero px-5 py-5 md:px-6 md:py-6">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="shell-kicker">{planYear} Cosmic Plan</p>
              <Link
                href="/blueprint"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-leather-200/80 transition-colors hover:text-leather-200"
              >
                Read the full blueprint →
              </Link>
            </div>
            <h1 className="mt-3 font-display text-[1.9rem] leading-[1.02] text-bone md:text-[2.35rem]">
              {blueprint.yearTheme}
            </h1>
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
              eyebrow="Active windows"
              value={String(blueprint.pushPeriods.length)}
              accent="leather"
              copy="Spans the sky invites toward action and visibility"
            />
            <MetricTile
              icon={<MoonStar size={15} />}
              eyebrow="Passive windows"
              value={String(blueprint.restPeriods.length)}
              accent="moss"
              copy="Spans the sky invites toward consolidation and review"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <QuickLink
            href="/year?view=week"
            icon={<CalendarDays size={16} />}
            label="Week"
            hint="This week, day by day"
          />
          <QuickLink
            href="/year?view=month"
            icon={<LayoutGrid size={16} />}
            label="Month"
            hint="Calendar grid, this month"
          />
          <QuickLink
            href="/year?view=review"
            icon={<ListChecks size={16} />}
            label="Review"
            hint={`Q${currentQuarter} quarterly review`}
          />
        </div>
      </div>
    </div>
  )
}

interface QuickLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  hint: string
}

function QuickLink({ href, icon, label, hint }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-[1rem] border border-border/55 bg-stone-950/40 px-4 py-3 transition-colors hover:border-leather-400/40 hover:bg-leather-500/8"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-bone-muted/70 transition-colors group-hover:text-leather-200">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-bone">{label}</p>
          <p className="text-xs text-bone-muted/70">{hint}</p>
        </div>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 text-bone-muted/40 transition-colors group-hover:text-leather-200"
      />
    </Link>
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
