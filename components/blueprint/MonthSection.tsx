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
    <div className="rounded-[1rem] border border-border/50 bg-stone-950/35 px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <h4 className="font-display text-[1.1rem] text-bone">{month.name}</h4>
        {month.theme && (
          <span className="text-[0.8rem] text-bone-muted/80">{month.theme}</span>
        )}
      </div>

      {month.energyArc && (
        <p className="text-[0.92rem] leading-[1.65] text-bone-muted mb-3">{month.energyArc}</p>
      )}

      {month.intentions.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {month.intentions.map((intention, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-bone">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-leather-400/55" />
              {intention}
            </li>
          ))}
        </ul>
      )}

      {(month.moonPhases.length > 0 || month.keyTransits.length > 0) && (
        <div className="flex flex-wrap items-start gap-3 pt-1 border-t border-border/40 mt-3">
          {month.moonPhases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {month.moonPhases.map((mp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-stone-900/60 px-2.5 py-1 text-[0.7rem] text-bone-muted"
                  title={mp.significance}
                >
                  <MoonPhaseIcon phase={MOON_PHASE_MAP[mp.phase] ?? (mp.phase as LunarPhase)} size={12} />
                  <span>{mp.date}</span>
                  {mp.significance && (
                    <span className="hidden text-bone-muted/55 sm:inline">· {mp.significance}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {month.keyTransits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {month.keyTransits.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-border/50 bg-stone-900/40 px-2.5 py-1 text-[0.7rem] text-bone-muted/80"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
