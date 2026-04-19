import { MonthSection } from './MonthSection'
import type { QuarterBlueprint, MonthBlueprint } from '@/types/blueprint'

const QUARTER_NAMES = ['', 'Q1', 'Q2', 'Q3', 'Q4']

interface QuarterSectionProps {
  quarter: QuarterBlueprint
  months: MonthBlueprint[]
}

export function QuarterSection({ quarter, months }: QuarterSectionProps) {
  const quarterMonths = months.filter((m) => Math.ceil(m.month / 3) === quarter.quarter)

  return (
    <section className="shell-panel overflow-hidden">
      <div className="border-b border-border/80 px-6 py-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="shell-kicker">{QUARTER_NAMES[quarter.quarter]}</span>
          {quarter.focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {quarter.focusAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-leather-500/20 bg-leather-500/10 px-2 py-0.5 text-[10px] text-leather-200"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
        <h3 className="font-serif text-[1.8rem] text-bone">{quarter.theme}</h3>
        <p className="mt-2 text-sm leading-7 text-bone-muted">{quarter.intention}</p>
      </div>

      <div className="space-y-6 px-6 py-5">
        {quarter.cosmicHighlights.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-bone-muted/45">
              Cosmic Highlights
            </p>
            <ul className="space-y-1">
              {quarter.cosmicHighlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-bone-muted">
                  <span className="mt-0.5 shrink-0 text-bone-muted/40">*</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(quarter.pushPeriods.length > 0 || quarter.restPeriods.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quarter.pushPeriods.length > 0 && (
              <div className="rounded-[1rem] border border-leather-500/20 bg-leather-500/10 px-4 py-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-leather-200">
                  Push Periods
                </p>
                {quarter.pushPeriods.map((p, i) => (
                  <div key={i} className="text-xs text-bone-muted">
                    <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                    {p.reason && <span> - {p.reason}</span>}
                  </div>
                ))}
              </div>
            )}
            {quarter.restPeriods.length > 0 && (
              <div className="rounded-[1rem] border border-moss-500/20 bg-moss-500/10 px-4 py-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-moss-200">
                  Rest Periods
                </p>
                {quarter.restPeriods.map((p, i) => (
                  <div key={i} className="text-xs text-bone-muted">
                    <span className="font-medium text-bone">{p.startDate} - {p.endDate}</span>
                    {p.reason && <span> - {p.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {quarterMonths.length > 0 && (
          <div className="space-y-6 border-t border-border/80 pt-5">
            {quarterMonths.map((month) => (
              <MonthSection key={month.month} month={month} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
