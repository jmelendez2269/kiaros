type OrbState = 'speaking' | 'listening' | 'thinking'

interface Props {
  state?: OrbState
  size?: number
  className?: string
  ariaLabel?: string
}

const STATE_BACKGROUND: Record<OrbState, string> = {
  speaking:
    'radial-gradient(circle at 50% 38%, #ffffff 0%, #c8a8ff 14%, #9966FF 42%, #4EE7FD 78%, transparent 100%)',
  listening:
    'radial-gradient(circle at 50% 38%, #ffffff 0%, #a8f5ff 14%, #4EE7FD 45%, #1A6AE8 82%, transparent 100%)',
  thinking:
    'radial-gradient(circle at 50% 38%, #ffffff 0%, #ffd090 14%, #FF9B2B 45%, #cc5500 82%, transparent 100%)',
}

const STATE_GLOW: Record<OrbState, string> = {
  speaking: '0 0 60px rgba(153,102,255,0.5), 0 0 120px rgba(78,231,253,0.2)',
  listening: '0 0 60px rgba(78,231,253,0.4), 0 0 100px rgba(26,106,232,0.2)',
  thinking: '0 0 60px rgba(255,155,43,0.4), 0 0 100px rgba(153,102,255,0.15)',
}

const STATE_ANIMATION: Record<OrbState, string> = {
  speaking: 'stelloquy-pulse 5s ease-in-out infinite',
  listening: 'stelloquy-breathe 6s ease-in-out infinite',
  thinking: 'stelloquy-think 4s ease-in-out infinite',
}

export function StelloquyOrb({
  state = 'speaking',
  size = 64,
  className,
  ariaLabel,
}: Props) {
  // Scale outer glow with size: full glow above 80px, halved for header-sized orbs,
  // dropped entirely at avatar size to avoid bleeding into surrounding text.
  const glow =
    size >= 80
      ? STATE_GLOW[state]
      : size >= 40
        ? STATE_GLOW[state].replace(/0\.5/g, '0.3').replace(/0\.4/g, '0.22').replace(/0\.2/g, '0.12')
        : 'none'

  return (
    <span
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: STATE_BACKGROUND[state],
        boxShadow: glow,
        animation: STATE_ANIMATION[state],
        flexShrink: 0,
      }}
    />
  )
}

export type { OrbState }
