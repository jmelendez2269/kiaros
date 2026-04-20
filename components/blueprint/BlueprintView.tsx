import { QuarterSection } from './QuarterSection'
import type { BlueprintOutput } from '@/types/blueprint'

interface BlueprintViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

export function BlueprintView({ blueprint, planYear }: BlueprintViewProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const hasPushRest = blueprint.pushPeriods.length > 0 || blueprint.restPeriods.length > 0

  return (
    <div className="space-y-8 pb-6">
      {/* HERO */}
      <div className="shell-panel-hero px-7 py-9 md:px-10 md:py-11">
        <div className="relative">
          <p className="shell-kicker mb-4">{planYear} Blueprint</p>
          <h1 className="shell-hero-title max-w-3xl">{blueprint.yearTheme}</h1>
          <p className="mt-5 shell-prose-lead">{blueprint.yearSummary}</p>

          {hasPushRest && (
            <div className="mt-7 flex flex-wrap gap-5 border-t border-border/40 pt-6">
              {blueprint.pushPeriods.length > 0 && (
                <div>
                  <p className="shell-eyebrow mb-2 text-leather-200/80">Activation windows</p>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.pushPeriods.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-leather-400/30 bg-leather-500/12 px-3 py-1 text-[0.72rem] text-bone-muted"
                        title={p.reason}
                      >
                        <span className="h-1 w-1 rounded-full bg-leather-300/70" />
                        {p.startDate} – {p.endDate}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {blueprint.restPeriods.length > 0 && (
                <div>
                  <p className="shell-eyebrow mb-2 text-moss-200/80">Rest periods</p>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.restPeriods.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-moss-500/30 bg-moss-500/10 px-3 py-1 text-[0.72rem] text-bone-muted"
                        title={p.reason}
                      >
                        <span className="h-1 w-1 rounded-full bg-moss-300/70" />
                        {p.startDate} – {p.endDate}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUARTERS */}
      <div className="space-y-4">
        {blueprint.quarters.map((quarter) => (
          <QuarterSection
            key={quarter.quarter}
            quarter={quarter}
            months={blueprint.months}
            isCurrentQuarter={quarter.quarter === currentQuarter}
          />
        ))}
      </div>
    </div>
  )
}
