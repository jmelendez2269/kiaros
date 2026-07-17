'use client'

import { cn } from '@/lib/utils'
import type { PlanetaryHourBand, PlanetaryHourRuler } from '@/lib/planetary/planetary-hours'

// Same glyphs the Week view uses, so a planet reads the same everywhere.
const PLANET_GLYPH: Record<PlanetaryHourRuler, string> = {
  Sun: '☉',
  Moon: '☾',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
}

// Full-strength accent per energy — the faint grid fills only hint at the
// zone; the rail is where the planet and its energy are stated plainly.
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
  return `${displayH}:${String(mm).padStart(2, '0')}${suffix}`
}

interface Props {
  bands: PlanetaryHourBand[]
  pxPerMinute: number
  totalMinutes: number
}

export function PlanetaryHourRail({ bands, pxPerMinute, totalMinutes }: Props) {
  if (bands.length === 0) {
    return (
      <div className="w-20 shrink-0" style={{ height: totalMinutes * pxPerMinute }}>
        <p className="px-1 pt-2 text-[9px] leading-tight text-bone-muted/40">
          Planetary hours unavailable for this location
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-20 shrink-0" style={{ height: totalMinutes * pxPerMinute }}>
      {bands.map((b, i) => {
        const height = (b.endMinute - b.startMinute) * pxPerMinute
        const accent = ENERGY_ACCENT[b.energyType]
        return (
          <div
            key={i}
            className={cn(
              'absolute inset-x-0 flex flex-col justify-start gap-0.5 overflow-hidden border-l-2 pl-1.5',
              accent.border
            )}
            style={{ top: b.startMinute * pxPerMinute, height }}
            title={`${b.ruler} hour · ${formatTime(b.startMinute)}–${formatTime(b.endMinute)} · ${b.energyType}`}
          >
            <span className={cn('flex items-center gap-1 text-sm leading-none', accent.text)}>
              {PLANET_GLYPH[b.ruler]}
              {height > 40 && <span className="text-[10px] text-bone">{b.ruler}</span>}
            </span>
            {height > 22 && (
              <span className="text-[9px] leading-none text-bone-muted/55">{formatTime(b.startMinute)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
