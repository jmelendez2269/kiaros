import { cn } from '@/lib/utils'
import type { Transit, AspectType, Planet } from '@/types/blueprint'

interface TransitBadgeProps {
  transit: Transit
  size?: 'sm' | 'md'
  className?: string
}

const PLANET_GLYPHS: Record<Planet, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

const ASPECT_GLYPHS: Record<AspectType, string> = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '✶',
}

const ASPECT_LABELS: Record<AspectType, string> = {
  conjunction: 'conjunct',
  opposition: 'opposite',
  square: 'square',
  trine: 'trine',
  sextile: 'sextile',
}

const HARD_ASPECTS = new Set<AspectType>(['conjunction', 'opposition', 'square'])

export function TransitBadge({ transit, size = 'md', className }: TransitBadgeProps) {
  const isHard = HARD_ASPECTS.has(transit.aspect)
  const label = `${transit.planet} ${ASPECT_LABELS[transit.aspect]} natal ${transit.natalPlanet}`

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border font-mono leading-none',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        isHard
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-accent/30 bg-accent/10 text-accent',
        className
      )}
    >
      <span>{PLANET_GLYPHS[transit.planet]}</span>
      <span className="opacity-60">{ASPECT_GLYPHS[transit.aspect]}</span>
      <span>{PLANET_GLYPHS[transit.natalPlanet]}</span>
    </span>
  )
}
