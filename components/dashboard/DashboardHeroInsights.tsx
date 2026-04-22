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
    <div className="grid gap-3 xl:grid-cols-3">
      {insights.map((insight) => {
        const expanded = expandedId === insight.id

        return (
          <button
            key={insight.id}
            type="button"
            onClick={() => setExpandedId((current) => (current === insight.id ? null : insight.id))}
            className={cn(
              'rounded-[1rem] border border-border/70 bg-black/15 text-left transition-all duration-200',
              insight.span === 'wide' ? 'md:col-span-2 xl:col-span-1' : '',
              expanded ? 'border-leather-400/35 bg-stone-900/92 shadow-glow' : 'hover:border-leather-400/30 hover:bg-stone-900/82'
            )}
            aria-expanded={expanded}
          >
            <div className="flex min-h-[12.25rem] flex-col px-5 py-5">
              <div>
                <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.18em]', ACCENT_STYLES[insight.accent ?? 'default'])}>
                  {insight.kicker}
                </p>
                <h3 className="mt-4 text-[1rem] font-semibold leading-7 text-bone md:text-[1.08rem]">
                  {insight.title}
                </h3>
              </div>

              <div className="mt-5 flex-1">
                <p className="text-sm leading-7 text-bone-muted/88">
                  {insight.preview}
                </p>
                {expanded ? (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <p className="text-sm leading-7 text-bone-muted">{insight.detail}</p>
                  </div>
                ) : null}
              </div>

              <span className="mt-5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                {expanded ? 'Tap to collapse' : 'Tap for more'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
