'use client'

import { cn } from '@/lib/utils'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'

const ENERGY_ACCENT: Record<string, { border: string; text: string }> = {
  push: { border: 'border-leather-400', text: 'text-leather-200' },
  initiate: { border: 'border-ember-400', text: 'text-ember-300' },
  reflect: { border: 'border-plum-400', text: 'text-plum-300' },
  rest: { border: 'border-moss-400', text: 'text-moss-300' },
}

function formatTime(minutes: number): string {
  const m = minutes % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  const displayH = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? 'a' : 'p'
  return mm === 0 ? `${displayH}${suffix}` : `${displayH}:${String(mm).padStart(2, '0')}${suffix}`
}

interface Props {
  windows: EnergyWindow[]
  pxPerMinute: number
  totalMinutes: number
}

export function EnergyWindowRail({ windows, pxPerMinute, totalMinutes }: Props) {
  if (windows.length === 0) {
    return (
      <div className="w-20 shrink-0" style={{ height: totalMinutes * pxPerMinute }}>
        <p className="px-1 pt-2 text-[9px] leading-tight text-bone-muted/40">
          Energy windows unavailable for this location
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-20 shrink-0" style={{ height: totalMinutes * pxPerMinute }}>
      {windows.map((w, i) => {
        const height = (w.endMinute - w.startMinute) * pxPerMinute
        const accent = ENERGY_ACCENT[w.energyType]
        return (
          <div
            key={i}
            className={cn(
              'absolute inset-x-0 flex flex-col gap-0.5 overflow-hidden border-l-2 pl-1.5 pt-1',
              accent.border
            )}
            style={{ top: w.startMinute * pxPerMinute, height }}
            title={`${w.label} · ${formatTime(w.startMinute)}–${formatTime(w.endMinute)}${w.reason ? ` · ${w.reason}` : ''}`}
          >
            <span className={cn('text-[11px] font-medium uppercase tracking-wider leading-none', accent.text)}>
              {w.label}
            </span>
            {height > 30 && (
              <span className="text-[9px] leading-none text-bone-muted/55">
                {formatTime(w.startMinute)}–{formatTime(w.endMinute)}
              </span>
            )}
            {w.reason && height > 52 && (
              <span className="text-[9px] italic leading-tight text-bone-muted/70">{w.reason}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
