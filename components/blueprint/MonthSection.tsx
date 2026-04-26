import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { AccentCopy } from './AccentCopy'
import type { LunarPhase, MonthBlueprint } from '@/types/blueprint'

const MOON_PHASE_MAP: Record<string, LunarPhase> = {
  new: 'new',
  'first-quarter': 'first-quarter',
  full: 'full',
  'last-quarter': 'last-quarter',
}

const MOON_PHASE_TONES: Record<string, { chip: string; bar: string; meta: string }> = {
  new: {
    chip: 'border-leather-400/30 bg-leather-500/10 text-leather-200',
    bar: 'bg-leather-300/85',
    meta: 'text-leather-200/75',
  },
  full: {
    chip: 'border-moss-400/30 bg-moss-500/10 text-moss-200',
    bar: 'bg-moss-300/85',
    meta: 'text-moss-200/75',
  },
  'first-quarter': {
    chip: 'border-plum-400/30 bg-plum-400/10 text-plum-300',
    bar: 'bg-plum-300/85',
    meta: 'text-plum-300/75',
  },
  'last-quarter': {
    chip: 'border-plum-400/30 bg-plum-400/10 text-plum-300',
    bar: 'bg-plum-300/85',
    meta: 'text-plum-300/75',
  },
}

const TRANSIT_TONES = [
  {
    chip: 'border-leather-400/25 bg-leather-500/10 text-leather-200/90',
    bar: 'bg-leather-300/85',
  },
  {
    chip: 'border-moss-400/25 bg-moss-500/10 text-moss-200/90',
    bar: 'bg-moss-300/85',
  },
]

const MONTH_TONES = {
  leather: {
    frame: 'border-leather-400/18 bg-leather-500/7',
    accent: 'text-leather-200',
  },
  plum: {
    frame: 'border-plum-400/18 bg-plum-400/7',
    accent: 'text-plum-300',
  },
  moss: {
    frame: 'border-moss-500/18 bg-moss-500/7',
    accent: 'text-moss-200',
  },
  ember: {
    frame: 'border-ember-400/18 bg-ember-400/7',
    accent: 'text-ember-300',
  },
} as const

interface MonthSectionProps {
  month: MonthBlueprint
  tone?: keyof typeof MONTH_TONES
}

export function MonthSection({ month, tone = 'leather' }: MonthSectionProps) {
  const monthTone = MONTH_TONES[tone]

  return (
    <div className={`rounded-[1rem] border px-4 py-4 ${monthTone.frame}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="font-display text-[1rem] text-bone">{month.name}</h4>
        {month.theme ? <span className={`text-[0.78rem] ${monthTone.accent}`}>{month.theme}</span> : null}
      </div>

      {month.energyArc && (
        <div className="mb-3 text-[0.88rem] leading-[1.7]">
          <AccentCopy
            text={month.energyArc}
            tone={tone}
            showMarker
            leadClassName="text-bone"
            restClassName="text-bone-muted/92"
            markerClassName="w-7"
          />
        </div>
      )}

      {month.intentions.length > 0 && (
        <ul className="mb-3 space-y-2">
          {month.intentions.slice(0, 3).map((intention, i) => (
            <li key={i} className="text-[0.82rem] leading-6">
              <AccentCopy
                text={intention}
                tone={tone}
                showMarker
                leadClassName="text-bone"
                restClassName="text-bone-muted/88"
                markerClassName="w-6"
              />
            </li>
          ))}
        </ul>
      )}

      {(month.moonPhases.length > 0 || month.keyTransits.length > 0) && (
        <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-border/40 pt-3">
          {month.moonPhases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {month.moonPhases.slice(0, 2).map((mp, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] ${MOON_PHASE_TONES[mp.phase]?.chip ?? 'border-border/60 bg-stone-900/60 text-bone-muted'}`}
                  title={mp.significance}
                >
                  <span
                    className={`h-1.5 w-8 shrink-0 rounded-full ${MOON_PHASE_TONES[mp.phase]?.bar ?? 'bg-bone-muted/45'}`}
                    aria-hidden="true"
                  />
                  <MoonPhaseIcon
                    phase={MOON_PHASE_MAP[mp.phase] ?? (mp.phase as LunarPhase)}
                    size={12}
                  />
                  <span className="text-bone">{mp.date}</span>
                  {mp.significance ? (
                    <span className={`hidden sm:inline ${MOON_PHASE_TONES[mp.phase]?.meta ?? 'text-bone-muted/55'}`}>
                      · {mp.significance}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {month.keyTransits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {month.keyTransits.slice(0, 2).map((transit, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] ${TRANSIT_TONES[i % TRANSIT_TONES.length].chip}`}
                >
                  <span
                    className={`h-1.5 w-8 shrink-0 rounded-full ${TRANSIT_TONES[i % TRANSIT_TONES.length].bar}`}
                    aria-hidden="true"
                  />
                  {transit}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
