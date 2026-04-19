import { cn } from '@/lib/utils'
import type { LunarPhase } from '@/types/blueprint'

interface MoonPhaseIconProps {
  phase: LunarPhase
  size?: number
  className?: string
  /** Renders a small label beneath the icon */
  showLabel?: boolean
}

const PHASE_LABELS: Record<LunarPhase, string> = {
  'new': 'New Moon',
  'waxing-crescent': 'Waxing Crescent',
  'first-quarter': 'First Quarter',
  'waxing-gibbous': 'Waxing Gibbous',
  'full': 'Full Moon',
  'waning-gibbous': 'Waning Gibbous',
  'last-quarter': 'Last Quarter',
  'waning-crescent': 'Waning Crescent',
}

// Builds the <mask> element that controls which part of the lit circle is visible.
// White areas in the mask = revealed; black = hidden.
// All geometry uses the 24×24 viewBox with the moon disc at (12,12) r=10.
function PhaseMask({ phase, id }: { phase: LunarPhase; id: string }) {
  switch (phase) {
    case 'first-quarter':
      // Right half lit — white rect covers x=[12,22]
      return (
        <mask id={id}>
          <rect x="12" y="2" width="10" height="20" fill="white" />
        </mask>
      )

    case 'last-quarter':
      // Left half lit — white rect covers x=[2,12]
      return (
        <mask id={id}>
          <rect x="2" y="2" width="10" height="20" fill="white" />
        </mask>
      )

    case 'waxing-crescent':
      // Right sliver: white right-half rect, black circle at (8,12) r=9 carves away most of it.
      // Visible at y=12: x=[17,22] ≈ 25% lit on the right.
      return (
        <mask id={id}>
          <rect x="12" y="2" width="10" height="20" fill="white" />
          <circle cx="8" cy="12" r="9" fill="black" />
        </mask>
      )

    case 'waxing-gibbous':
      // Full rect lit, black circle at (-1,12) r=9 hides the thin left shadow crescent.
      // Hidden at y=12: x=[2,8] ≈ 30% shadow on left → ~70% lit on right.
      return (
        <mask id={id}>
          <rect x="2" y="2" width="20" height="20" fill="white" />
          <circle cx="-1" cy="12" r="9" fill="black" />
        </mask>
      )

    case 'waning-gibbous':
      // Mirror of waxing-gibbous: black circle at (25,12) hides thin right shadow.
      // Hidden at y=12: x=[16,22] ≈ 30% shadow on right → ~70% lit on left.
      return (
        <mask id={id}>
          <rect x="2" y="2" width="20" height="20" fill="white" />
          <circle cx="25" cy="12" r="9" fill="black" />
        </mask>
      )

    case 'waning-crescent':
      // Mirror of waxing-crescent: white left-half rect, black circle at (16,12) r=9.
      // Visible at y=12: x=[2,7] ≈ 25% lit on the left.
      return (
        <mask id={id}>
          <rect x="2" y="2" width="10" height="20" fill="white" />
          <circle cx="16" cy="12" r="9" fill="black" />
        </mask>
      )

    // new and full are handled outside this component (no mask needed)
    default:
      return null
  }
}

export function MoonPhaseIcon({
  phase,
  size = 20,
  className,
  showLabel = false,
}: MoonPhaseIconProps) {
  const maskId = `moon-mask-${phase}`
  const isNew = phase === 'new'
  const isFull = phase === 'full'
  const hasMask = !isNew && !isFull

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label={PHASE_LABELS[phase]}
      role="img"
      className={cn('inline-block shrink-0', !showLabel && className)}
    >
      {hasMask && (
        <defs>
          <PhaseMask phase={phase} id={maskId} />
        </defs>
      )}

      {/* Dark base disc — represents the unlit face of the moon */}
      <circle
        cx="12"
        cy="12"
        r="10"
        className="fill-muted"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="0.5"
        strokeOpacity="0.5"
      />

      {/* Lit overlay — masked to the illuminated region only */}
      {!isNew && (
        <circle
          cx="12"
          cy="12"
          r="10"
          className="fill-foreground"
          mask={hasMask ? `url(#${maskId})` : undefined}
        />
      )}
    </svg>
  )

  if (!showLabel) return svg

  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      {svg}
      <span className="text-[10px] leading-none text-muted-foreground">
        {PHASE_LABELS[phase]}
      </span>
    </span>
  )
}
