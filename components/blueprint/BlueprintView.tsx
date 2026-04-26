import { CalendarRange, MoonStar, Orbit, Sparkles } from 'lucide-react'
import { AccentCopy } from './AccentCopy'
import { BlueprintNarrative } from './BlueprintNarrative'
import { QuarterSection } from './QuarterSection'
import type { BlueprintOutput } from '@/types/blueprint'

interface BlueprintViewProps {
  blueprint: BlueprintOutput
  planYear: number
}

export function BlueprintView({ blueprint, planYear }: BlueprintViewProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)
  const currentQuarterData = blueprint.quarters.find((quarter) => quarter.quarter === currentQuarter)
  const hasPushRest = blueprint.pushPeriods.length > 0 || blueprint.restPeriods.length > 0

  return (
    <div className="space-y-6 pb-6">
      <div className="shell-panel-hero px-5 py-5 md:px-6 md:py-6">
        <div className="relative space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
            <div>
              <p className="shell-kicker mb-3">{planYear} Blueprint</p>
              <h1 className="font-display text-[1.9rem] leading-[1.02] text-bone md:text-[2.35rem]">
                {blueprint.yearTheme}
              </h1>
              <BlueprintNarrative
                text={blueprint.yearSummary}
                tone="leather"
                className="mt-4 max-w-[62ch] text-[0.98rem] leading-[1.9] md:text-[1.02rem]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="shell-panel-inline border-leather-400/18 bg-leather-500/7 px-4 py-3 shadow-[0_0_0_1px_hsl(var(--leather-400)/0.08),0_18px_40px_hsl(var(--leather-500)/0.14)]">
                <div className="flex items-center gap-2 text-leather-200">
                  <Orbit size={15} />
                  <p className="shell-eyebrow text-leather-200/80">Current quarter</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-bone">Q{currentQuarter}</p>
                <div className="mt-2 text-sm leading-6">
                  <AccentCopy
                    text={currentQuarterData?.theme ?? 'Annual architecture in motion'}
                    tone="leather"
                    showMarker
                    leadClassName="text-bone"
                    restClassName="text-bone-muted/88"
                  />
                </div>
              </div>

              <div className="shell-panel-inline border-plum-400/18 bg-plum-400/7 px-4 py-3 shadow-[0_0_0_1px_hsl(var(--plum-400)/0.08),0_18px_40px_hsl(var(--plum-400)/0.14)]">
                <div className="flex items-center gap-2 text-plum-300">
                  <Sparkles size={15} />
                  <p className="shell-eyebrow text-plum-300/80">Structure</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-bone">{blueprint.quarters.length} quarters</p>
                <div className="mt-2 text-sm leading-6">
                  <AccentCopy
                    text={`${blueprint.months.length} months layered underneath`}
                    tone="plum"
                    showMarker
                    leadClassName="text-bone"
                    restClassName="text-bone-muted/88"
                  />
                </div>
              </div>

              <div className="shell-panel-inline border-leather-400/18 bg-leather-500/7 px-4 py-3 shadow-[0_0_0_1px_hsl(var(--leather-400)/0.08),0_18px_40px_hsl(var(--leather-500)/0.14)]">
                <div className="flex items-center gap-2 text-leather-200">
                  <CalendarRange size={15} />
                  <p className="shell-eyebrow text-leather-200/80">Activation windows</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-bone">{blueprint.pushPeriods.length}</p>
                <div className="mt-2 text-sm leading-6">
                  <AccentCopy
                    text="High-momentum spans for action and visibility"
                    tone="leather"
                    showMarker
                    leadClassName="text-bone"
                    restClassName="text-bone-muted/88"
                  />
                </div>
              </div>

              <div className="shell-panel-inline border-moss-500/18 bg-moss-500/7 px-4 py-3 shadow-[0_0_0_1px_hsl(var(--moss-500)/0.08),0_18px_40px_hsl(var(--moss-500)/0.14)]">
                <div className="flex items-center gap-2 text-moss-200">
                  <MoonStar size={15} />
                  <p className="shell-eyebrow text-moss-200/80">Rest periods</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-bone">{blueprint.restPeriods.length}</p>
                <div className="mt-2 text-sm leading-6">
                  <AccentCopy
                    text="Recovery windows for consolidation and review"
                    tone="moss"
                    showMarker
                    leadClassName="text-bone"
                    restClassName="text-bone-muted/88"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            {blueprint.quarters.map((quarter) => {
              const tone =
                quarter.quarter === 1
                  ? 'plum'
                  : quarter.quarter === 2
                    ? 'leather'
                    : quarter.quarter === 3
                      ? 'ember'
                      : 'moss'

              return (
                <div
                  key={quarter.quarter}
                  className={`rounded-[1rem] border px-4 py-3 ${
                    quarter.quarter === currentQuarter
                      ? 'border-leather-400/40 bg-leather-500/12 shadow-[0_0_0_1px_hsl(var(--leather-400)/0.1),0_18px_44px_hsl(var(--leather-500)/0.16)]'
                      : quarter.quarter === 1
                        ? 'border-plum-400/18 bg-plum-400/7 shadow-[0_0_0_1px_hsl(var(--plum-400)/0.08),0_16px_36px_hsl(var(--plum-400)/0.12)]'
                        : quarter.quarter === 3
                          ? 'border-ember-400/18 bg-ember-400/7 shadow-[0_0_0_1px_hsl(var(--ember-400)/0.08),0_16px_36px_hsl(var(--ember-400)/0.12)]'
                          : quarter.quarter === 4
                            ? 'border-moss-500/18 bg-moss-500/7 shadow-[0_0_0_1px_hsl(var(--moss-500)/0.08),0_16px_36px_hsl(var(--moss-500)/0.12)]'
                            : 'border-border/65 bg-stone-950/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-bone-muted/65">
                      Q{quarter.quarter}
                    </span>
                    {quarter.quarter === currentQuarter ? (
                      <span className="rounded-full border border-leather-400/35 bg-leather-500/15 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-leather-200">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-display text-[1.08rem] leading-tight text-bone">
                    {quarter.theme}
                  </p>
                  <div className="mt-2 text-sm leading-6">
                    <AccentCopy
                      text={
                        quarter.focusAreas.length > 0
                          ? quarter.focusAreas.slice(0, 2).join(' · ')
                          : quarter.intention
                      }
                      tone={tone}
                      showMarker
                      leadClassName="text-bone"
                      restClassName="text-bone-muted/88"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {hasPushRest && (
            <div className="grid gap-3 border-t border-border/40 pt-4 lg:grid-cols-2">
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
                        <span className="text-bone">{p.startDate} - {p.endDate}</span>
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
                        <span className="text-bone">{p.startDate} - {p.endDate}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
