import { cn } from '@/lib/utils'

interface CyclePhaseTagProps {
  phase: string | null
  className?: string
}

type KnownPhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

const PHASE_CONFIG: Record<KnownPhase, { label: string; classes: string }> = {
  menstrual: {
    label: 'Menstrual',
    classes: 'bg-rose-950/40 border-rose-800/40 text-rose-300',
  },
  follicular: {
    label: 'Follicular',
    classes: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
  },
  ovulation: {
    label: 'Ovulation',
    classes: 'bg-amber-950/40 border-amber-800/40 text-amber-300',
  },
  luteal: {
    label: 'Luteal',
    classes: 'bg-purple-950/40 border-purple-800/40 text-purple-300',
  },
}

export function CyclePhaseTag({ phase, className }: CyclePhaseTagProps) {
  if (!phase) return null

  const key = phase.toLowerCase() as KnownPhase
  const config = PHASE_CONFIG[key]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config
          ? config.classes
          : 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {config ? config.label : phase}
    </span>
  )
}
