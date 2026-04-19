import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import type { MonthBlueprint, LunarPhase } from '@/types/blueprint'

const MOON_PHASE_MAP: Record<string, LunarPhase> = {
  new: 'new',
  'first-quarter': 'first-quarter',
  full: 'full',
  'last-quarter': 'last-quarter',
}

interface MonthSectionProps {
  month: MonthBlueprint
}

export function MonthSection({ month }: MonthSectionProps) {
  return (
    <div className="space-y-3 rounded-[1rem] border border-border/60 bg-stone-950/45 p-4">
      <div className="flex items-baseline gap-2">
        <h4 className="font-serif text-xl text-bone">{month.name}</h4>
        <span className="text-xs text-bone-muted">{month.theme}</span>
      </div>

      <p className="text-sm leading-7 text-bone-muted">{month.energyArc}</p>

      {month.intentions.length > 0 && (
        <ul className="space-y-1">
          {month.intentions.map((intention, i) => (
            <li key={i} className="flex gap-2 text-sm text-bone">
              <span className="mt-0.5 shrink-0 text-bone-muted">-</span>
              {intention}
            </li>
          ))}
        </ul>
      )}

      {month.moonPhases.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {month.moonPhases.map((mp, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-md border border-border/70 bg-stone-900/65 px-2 py-1 text-xs text-bone-muted"
              title={mp.significance}
            >
              <MoonPhaseIcon phase={MOON_PHASE_MAP[mp.phase] ?? (mp.phase as LunarPhase)} size={14} />
              <span>{mp.date}</span>
              {mp.significance && <span className="hidden text-bone-muted/60 sm:inline">- {mp.significance}</span>}
            </div>
          ))}
        </div>
      )}

      {month.keyTransits.length > 0 && (
        <div className="pt-1">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-bone-muted/45">
            Transits
          </p>
          <ul className="space-y-0.5">
            {month.keyTransits.map((t, i) => (
              <li key={i} className="text-xs text-bone-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
