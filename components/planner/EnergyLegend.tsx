import { cn } from '@/lib/utils'
import type { EnergyType } from '@/types/blueprint'

const ENERGY_ORDER: EnergyType[] = ['push', 'initiate', 'reflect', 'rest']

const ENERGY_LABEL: Record<EnergyType, string> = {
  push: 'Push',
  initiate: 'Initiate',
  reflect: 'Reflect',
  rest: 'Rest',
}

const ENERGY_DOT: Record<EnergyType, string> = {
  push: 'bg-leather-400',
  initiate: 'bg-ember-400',
  reflect: 'bg-plum-400',
  rest: 'bg-moss-400',
}

export function EnergyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-bone-muted/60">
      {ENERGY_ORDER.map((kind) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', ENERGY_DOT[kind])} />
          {ENERGY_LABEL[kind]}
        </span>
      ))}
    </div>
  )
}
