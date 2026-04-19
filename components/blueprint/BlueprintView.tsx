import { QuarterSection } from './QuarterSection'
import type { BlueprintOutput } from '@/types/blueprint'

interface BlueprintViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

export function BlueprintView({ blueprint, planYear }: BlueprintViewProps) {
  return (
    <div className="space-y-8">
      <div className="shell-panel px-6 py-7 md:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="shell-kicker">{planYear} Blueprint</span>
          </div>
          <h1 className="shell-section-title">{blueprint.yearTheme}</h1>
          <p className="max-w-3xl text-base leading-7 text-bone-muted">{blueprint.yearSummary}</p>
        </div>
      </div>

      {(blueprint.pushPeriods.length > 0 || blueprint.restPeriods.length > 0) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {blueprint.pushPeriods.length > 0 && (
            <div className="shell-panel px-5 py-5">
              <p className="shell-kicker mb-3 text-leather-300/90">Push Periods - {planYear}</p>
              <ul className="space-y-2">
                {blueprint.pushPeriods.map((p, i) => (
                  <li key={i} className="text-sm text-bone-muted">
                    <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                    {p.reason && <span className="ml-2">{p.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {blueprint.restPeriods.length > 0 && (
            <div className="shell-panel px-5 py-5">
              <p className="shell-kicker mb-3 text-moss-300/90">Rest Periods - {planYear}</p>
              <ul className="space-y-2">
                {blueprint.restPeriods.map((p, i) => (
                  <li key={i} className="text-sm text-bone-muted">
                    <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                    {p.reason && <span className="ml-2">{p.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {blueprint.quarters.map((quarter) => (
          <QuarterSection key={quarter.quarter} quarter={quarter} months={blueprint.months} />
        ))}
      </div>
    </div>
  )
}
