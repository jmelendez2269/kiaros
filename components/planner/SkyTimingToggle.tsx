'use client'

import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  className?: string
}

export function SkyTimingToggle({ checked, onCheckedChange, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider transition-colors',
        checked
          ? 'border-leather-400/50 bg-leather-500/20 text-bone'
          : 'border-border/40 text-bone-muted/50 hover:text-bone-muted',
        className
      )}
    >
      Sky timing
    </button>
  )
}
