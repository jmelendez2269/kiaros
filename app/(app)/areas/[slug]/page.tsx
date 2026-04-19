import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PenSquare } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  areaActivationMonths,
  areaActivationWeeks,
  areaHouseDetails,
  areaNatalPlanets,
  buildAreaYearNarrative,
  getAreaDefinition,
  slugifyAreaName,
} from '@/lib/areas'
import type { MonthBlueprint, NatalChart, WeekBlueprint } from '@/types/blueprint'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function energyTone(activeNow: boolean, windowsCount: number) {
  if (activeNow) return 'border-leather-400/45 bg-leather-500/12 text-leather-200'
  if (windowsCount > 0) return 'border-moss-500/35 bg-moss-500/10 text-moss-200'
  return 'border-border/70 bg-stone-950/60 text-bone-muted'
}

function buildJournalHref({
  area,
  theme,
  intention,
  weekNumber,
  startDate,
  endDate,
  cosmicContext,
}: {
  area: string
  theme: string
  intention: string
  weekNumber: number
  startDate: string
  endDate: string
  cosmicContext: string
}) {
  const params = new URLSearchParams({
    area,
    theme,
    prompt: intention,
    week: String(weekNumber),
    start: startDate,
    end: endDate,
    context: cosmicContext,
  })

  return `/journal?${params.toString()}`
}

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()
  const today = todayISO()

  const [categoryRes, blueprintRes, profileRes] = await Promise.all([
    supabase
      .from('goal_categories')
      .select('id, name, icon_key, success, description'),
    supabase
      .from('blueprints')
      .select('year_theme, year_summary, quarters, months, weeks')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('natal_chart, year_vision, word_of_year')
      .maybeSingle(),
  ])

  const category = (categoryRes.data ?? []).find((item) => slugifyAreaName(item.name) === slug)
  if (!category || slugifyAreaName(category.name) !== slug) {
    notFound()
  }

  const area = getAreaDefinition(category.name)
  const natalChart = (profileRes.data?.natal_chart as NatalChart | null) ?? null
  const weeks = (blueprintRes.data?.weeks as unknown as WeekBlueprint[]) ?? []
  const months = (blueprintRes.data?.months as unknown as MonthBlueprint[]) ?? []
  const activeWeeks = areaActivationWeeks(category.name, weeks)
  const activeMonths = areaActivationMonths(category.name, months, weeks)
  const activeNow = activeWeeks.some((week) => week.startDate <= today && today <= week.endDate)
  const houseDetails = areaHouseDetails(category.name, natalChart)
  const natalPlacements = areaNatalPlanets(category.name, natalChart)
  const currentWindow = activeWeeks.find((week) => week.startDate <= today && today <= week.endDate) ?? activeWeeks[0] ?? null
  const nextWindows = activeWeeks.slice(0, 6)
  const areaYearNarrative = buildAreaYearNarrative({
    nameOrSlug: category.name,
    blueprintTheme: blueprintRes.data?.year_theme,
    blueprintSummary: blueprintRes.data?.year_summary,
    natalChart,
    weeks,
  })

  return (
    <div className="space-y-8">
      <section className="shell-panel px-6 py-7 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">Life Area</p>
            <h1 className="shell-section-title">
              {category.icon_key ? `${category.icon_key} ${category.name}` : category.name}
            </h1>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              {category.description || area.summary}
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${energyTone(activeNow, activeWeeks.length)}`}>
            {activeNow ? 'Active now' : activeWeeks.length > 0 ? `${activeWeeks.length} timing windows this year` : 'Area timing still generating'}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">This Year</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">How this area is moving</h2>
          <p className="mt-4 text-sm leading-7 text-bone-muted">
            {category.success || area.plannerPrompt}
          </p>
          <div className="mt-5 space-y-4 rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">Year theme</p>
              <p className="mt-2 text-sm leading-7 text-bone">
                {areaYearNarrative.theme}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">Interpretation direction</p>
              <p className="mt-2 text-sm leading-7 text-bone-muted">
                {areaYearNarrative.direction || profileRes.data?.year_vision || 'Kiaros will synthesize your natal chart, house rulers, and yearly transits into a focused narrative for this area.'}
              </p>
            </div>
          </div>
        </article>

        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">Planner Strategy</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">How to work with the energy</h2>
          <div className="mt-5 space-y-3">
            {area.supportStrategies.map((strategy) => (
              <div key={strategy} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
                {strategy}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">Houses</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Where this lives in the chart</h2>
          <div className="mt-5 grid gap-3">
            {houseDetails.length > 0 ? (
              houseDetails.map((detail) => (
                <div key={detail.house} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-bone">House {detail.house}</p>
                    {detail.sign ? <span className="shell-pill">{detail.sign}</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-bone-muted">
                    {detail.ruler ? `Ruled by ${detail.ruler}.` : 'The chart-specific house sign will appear here once birth data is complete.'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm text-bone-muted">
                This custom area is not mapped to houses yet. The next phase can let you assign or generate that mapping.
              </div>
            )}
          </div>
        </article>

        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">Natal Placements</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Planets already living here</h2>
          <div className="mt-5 grid gap-3">
            {natalPlacements.length > 0 ? (
              natalPlacements.map((placement) => (
                <div key={`${placement.planet}-${placement.house}`} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
                  <p className="text-sm font-semibold text-bone">
                    {placement.planet} in {placement.sign}
                  </p>
                  <p className="mt-2 text-sm text-bone-muted">
                    House {placement.house} at {placement.degree.toFixed(1)} deg. This placement should become one of the anchors for future area-specific transit interpretation.
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm text-bone-muted">
                No natal planets fall directly inside the primary houses for this area. House rulers and yearly transits can still make it active.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="shell-panel px-6 py-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="shell-kicker">Timeline</p>
            <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Yearly timing windows</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-bone-muted">
              These windows are being derived from the existing blueprint focus weeks for this area. The next phase can deepen them with exact transit-to-house-ruler interpretations and planner event generation.
            </p>
          </div>
          {currentWindow ? (
            <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
              Current emphasis: {currentWindow.theme}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {nextWindows.length > 0 ? (
            nextWindows.map((week) => (
              <article key={`${week.startDate}-${week.weekNumber}`} className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-bone">{week.theme}</p>
                  <span className="shell-pill">Week {week.weekNumber}</span>
                </div>
                <p className="mt-2 text-sm text-bone-muted">
                  {week.startDate} to {week.endDate}
                </p>
                <p className="mt-4 text-sm leading-7 text-bone-muted">{week.cosmicContext}</p>
                {week.intentions.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                      Click a prompt to start a journal entry
                    </p>
                    <div className="flex flex-wrap gap-2">
                    {week.intentions.map((intention) => (
                      <Link
                        key={intention}
                        href={buildJournalHref({
                          area: category.name,
                          theme: week.theme,
                          intention,
                          weekNumber: week.weekNumber,
                          startDate: week.startDate,
                          endDate: week.endDate,
                          cosmicContext: week.cosmicContext,
                        })}
                        className="group inline-flex min-h-[3rem] max-w-full items-center gap-2 rounded-full border border-leather-400/25 bg-leather-500/8 px-3 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-bone-muted transition-all hover:border-leather-400/50 hover:bg-leather-500/14 hover:text-bone"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-leather-400/20 bg-stone-950/75 text-leather-200 transition-colors group-hover:border-leather-300/40 group-hover:text-bone">
                          <PenSquare size={13} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.6rem] tracking-[0.2em] text-leather-200/85">
                            Journal this
                          </span>
                          <span className="block text-bone-muted group-hover:text-bone">{intention}</span>
                        </span>
                      </Link>
                    ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 px-5 py-5 text-sm text-bone-muted xl:col-span-2">
              No dedicated timing windows have been generated for this area yet.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">Goals</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">What you want to build here</h2>
          <div className="mt-5 rounded-[1.1rem] border border-dashed border-leather-400/35 bg-leather-500/6 px-5 py-5 text-sm leading-7 text-bone-muted">
            Goal storage is the next build slice. This section is where users will create area-specific goals and link them to timing windows that then appear in the planner.
          </div>
        </article>

        <article className="shell-panel px-6 py-6">
          <p className="shell-kicker">Planner Lens</p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Best times to act</h2>
          <div className="mt-5 space-y-3">
            {activeMonths.slice(0, 3).map((month) => (
              <div key={month.month} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
                <p className="text-sm font-semibold text-bone">{month.name}</p>
                <p className="mt-2 text-sm text-bone-muted">{month.energyArc}</p>
              </div>
            ))}
            {activeMonths.length === 0 ? (
              <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm text-bone-muted">
                Planner recommendations will appear here as soon as area timing windows are translated into event suggestions.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  )
}
