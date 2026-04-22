'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type HeroInsight = {
  id: string
  kicker: string
  title: string
  preview: string
  detail: string
  accent?: 'default' | 'leather' | 'moss' | 'plum'
  span?: 'default' | 'wide'
}

interface DashboardHeroInsightsProps {
  insights: HeroInsight[]
}

const ACCENT_STYLES: Record<NonNullable<HeroInsight['accent']>, string> = {
  default: 'text-bone-muted/78',
  leather: 'text-leather-200/85',
  moss: 'text-moss-200/85',
  plum: 'text-plum-300/85',
}

export function DashboardHeroInsights({ insights }: DashboardHeroInsightsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => {
        const expanded = expandedId === insight.id

        return (
          <button
            key={insight.id}
            type="button"
            onClick={() => setExpandedId((current) => (current === insight.id ? null : insight.id))}
            className={cn(
              'group relative overflow-hidden rounded-[1rem] border border-border/70 bg-black/15 text-left transition-all duration-200',
              insight.span === 'wide' ? 'md:col-span-2 xl:col-span-1' : '',
              expanded ? 'border-leather-400/35 bg-stone-900/88 shadow-glow' : 'hover:border-leather-400/30 hover:bg-stone-900/80'
            )}
            aria-expanded={expanded}
          >
            <div className="flex min-h-[11.5rem] flex-col justify-between px-4 py-4">
              <div>
                <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.18em]', ACCENT_STYLES[insight.accent ?? 'default'])}>
                  {insight.kicker}
                </p>
                <h3 className="mt-3 text-[1.05rem] font-semibold leading-6 text-bone">
                  {insight.title}
                </h3>
              </div>

              <div className="mt-4 pr-6">
                <p className="text-sm leading-6 text-bone-muted transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0">
                  {insight.preview}
                </p>
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 top-[4.75rem] overflow-hidden border-t border-border/60 bg-stone-950/96 px-4 py-4 opacity-0 transition duration-200',
                    'group-hover:opacity-100 group-focus-visible:opacity-100',
                    expanded ? 'opacity-100' : ''
                  )}
                >
                  <p className="text-sm leading-6 text-bone-muted">{insight.detail}</p>
                </div>
              </div>

              <span className="mt-4 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                {expanded ? 'Tap to collapse' : 'Hover or tap to expand'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
