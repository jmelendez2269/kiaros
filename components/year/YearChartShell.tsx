'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CalendarDays, SlidersHorizontal } from 'lucide-react'
import { YearView } from '@/components/calendar/YearView'
import type { WeekBlueprint, YearEphemeris } from '@/types/blueprint'
import { cn } from '@/lib/utils'

interface Props {
  yearEphemeris: YearEphemeris
  weeks: WeekBlueprint[]
}

export function YearChartShell({ yearEphemeris, weeks }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showLegend, setShowLegend] = useState(true)

  const today = new Date().toISOString().slice(0, 10)
  const todayInYear = today.startsWith(String(yearEphemeris.year))

  const goMonth = (monthOneIndexed: number) => {
    const m = String(monthOneIndexed).padStart(2, '0')
    startTransition(() => {
      router.replace(`/year?view=month&month=${yearEphemeris.year}-${m}`, { scroll: false })
    })
  }

  const goWeek = (dateIso: string) => {
    startTransition(() => {
      router.replace(`/year?view=week&date=${dateIso}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {todayInYear ? (
          <Link
            href={`/year?view=week&date=${today}`}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-leather-400/35 bg-leather-500/15 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-leather-200 transition-colors hover:bg-leather-500/22"
          >
            <CalendarDays size={14} />
            Today
          </Link>
        ) : (
          <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-2xl border border-border/55 bg-stone-950/45 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-bone-muted/40">
            <CalendarDays size={14} />
            Today
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowLegend((value) => !value)}
          aria-pressed={showLegend}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
            showLegend
              ? 'border-plum-400/35 bg-plum-400/15 text-plum-300'
              : 'border-border/70 bg-stone-950/55 text-bone-muted hover:text-bone'
          )}
        >
          <SlidersHorizontal size={14} />
          Signals
        </button>
      </div>

      {showLegend ? <CalendarLegend /> : null}

      <YearView
        yearEphemeris={yearEphemeris}
        weeks={weeks}
        onMonthClick={goMonth}
        onDayClick={goWeek}
      />
    </div>
  )
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      <LegendPill className="bg-leather-300" label="Sun arc" />
      <LegendPill className="bg-bone" label="Moon phases" />
      <LegendPill className="bg-plum-300" label="Retrogrades" />
      <LegendPill className="bg-moss-300" label="Aspects" />
      <LegendPill className="bg-ember-300" label="Personal plan" />
    </div>
  )
}

function LegendPill({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/55 px-3 py-1 text-[0.7rem] font-medium text-bone-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]', className)} />
      {label}
    </span>
  )
}
