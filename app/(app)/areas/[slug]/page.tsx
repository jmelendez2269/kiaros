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
import { AreaGoalsPanel, type AreaGoal } from '@/components/areas/AreaGoalsPanel'
import { BRAND } from '@/lib/brand'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function statusLabel(activeNow: boolean, windowsCount: number) {
  if (activeNow) return 'Active now'
  if (windowsCount > 0) return `${windowsCount} windows this year`
  return 'Timing still forming'
}

function statusTone(activeNow: boolean, windowsCount: number) {
  if (activeNow) return 'border-leather-400/55 bg-leather-500/18 text-leather-100'
  if (windowsCount > 0) return 'border-moss-500/40 bg-moss-500/12 text-moss-200'
  return 'border-border/60 bg-stone-950/60 text-bone-muted'
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

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
  })
  return `${startStr} — ${endStr}`
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

  // Goals for this area. Lives on a separate table (migration 0020).
  const goalsRes = await supabase
    .from('area_goals')
    .select('id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at')
    .eq('category_id', category.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  const initialGoals = (goalsRes.data ?? []) as AreaGoal[]

  const area = getAreaDefinition(category.name)
  const natalChart = (profileRes.data?.natal_chart as NatalChart | null) ?? null
  const weeks = (blueprintRes.data?.weeks as unknown as WeekBlueprint[]) ?? []
  const months = (blueprintRes.data?.months as unknown as MonthBlueprint[]) ?? []
  const activeWeeks = areaActivationWeeks(category.name, weeks)
  const activeMonths = areaActivationMonths(category.name, months, weeks)
  const activeNow = activeWeeks.some((week) => week.startDate <= today && today <= week.endDate)
  const houseDetails = areaHouseDetails(category.name, natalChart)
  const natalPlacements = areaNatalPlanets(category.name, natalChart)
  const currentWindow = activeWeeks.find((week) => week.startDate <= today && today <= week.endDate) ?? null
  const upcomingWindows = activeWeeks.filter((week) => week !== currentWindow).slice(0, 5)
  const primaryHouse = houseDetails[0] ?? null
  const primaryPlacement = natalPlacements[0] ?? null
  const areaYearNarrative = buildAreaYearNarrative({
    nameOrSlug: category.name,
    blueprintTheme: blueprintRes.data?.year_theme,
    blueprintSummary: blueprintRes.data?.year_summary,
    natalChart,
    weeks,
  })

  return (
    <div className="space-y-10 pb-6">
      {/* HERO */}
      <section className="shell-panel-hero px-7 py-9 md:px-10 md:py-11">
        <div className="relative flex flex-col gap-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="shell-kicker mb-4">Life Area</p>
              <h1 className="shell-hero-title">
                {category.icon_key ? (
                  <span className="mr-3 text-[0.85em] opacity-80">{category.icon_key}</span>
                ) : null}
                {category.name}
              </h1>
              <p className="mt-5 shell-prose-lead">
                {category.description || area.summary}
              </p>
            </div>
            <div
              className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${statusTone(activeNow, activeWeeks.length)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeNow ? 'bg-leather-300' : 'bg-bone-muted/50'}`} />
              {statusLabel(activeNow, activeWeeks.length)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="shell-stat-chip">
              <span className="shell-stat-chip-label">Energy</span>
              <span className="shell-stat-chip-value capitalize">{area.energyMode}</span>
            </div>
            {primaryHouse ? (
              <div className="shell-stat-chip">
                <span className="shell-stat-chip-label">House</span>
                <span className="shell-stat-chip-value">
                  {primaryHouse.house}
                  {primaryHouse.sign ? ` · ${primaryHouse.sign}` : ''}
                </span>
              </div>
            ) : null}
            {primaryPlacement ? (
              <div className="shell-stat-chip">
                <span className="shell-stat-chip-label">Anchor</span>
                <span className="shell-stat-chip-value">
                  {primaryPlacement.planet} in {primaryPlacement.sign}
                </span>
              </div>
            ) : null}
            {currentWindow ? (
              <div className="shell-stat-chip">
                <span className="shell-stat-chip-label">Now</span>
                <span className="shell-stat-chip-value">{currentWindow.theme}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* CURRENT WINDOW — primary action zone */}
      {currentWindow ? (
        <section className="relative overflow-hidden rounded-[1.5rem] border border-leather-400/35 bg-gradient-to-br from-leather-500/14 via-stone-900/60 to-stone-950/80 px-7 py-8 md:px-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="shell-kicker mb-3 text-leather-200/90">This week</p>
              <h2 className="shell-section-title">{currentWindow.theme}</h2>
              <p className="mt-2 text-sm text-bone-muted">
                Week {currentWindow.weekNumber} · {formatDateRange(currentWindow.startDate, currentWindow.endDate)}
              </p>
              <p className="mt-5 shell-prose">{currentWindow.cosmicContext}</p>
            </div>
            {currentWindow.intentions.length > 0 ? (
              <div className="lg:max-w-sm lg:shrink-0">
                <p className="shell-eyebrow mb-3">Start a journal entry</p>
                <div className="flex flex-col gap-2">
                  {currentWindow.intentions.slice(0, 3).map((intention) => (
                    <Link
                      key={intention}
                      href={buildJournalHref({
                        area: category.name,
                        theme: currentWindow.theme,
                        intention,
                        weekNumber: currentWindow.weekNumber,
                        startDate: currentWindow.startDate,
                        endDate: currentWindow.endDate,
                        cosmicContext: currentWindow.cosmicContext,
                      })}
                      className="group flex items-center gap-3 rounded-2xl border border-leather-400/30 bg-stone-950/55 px-4 py-3 text-left transition-all hover:border-leather-300/55 hover:bg-stone-950/80"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-leather-400/30 bg-stone-950/80 text-leather-200 transition-colors group-hover:text-bone">
                        <PenSquare size={14} />
                      </span>
                      <span className="text-[0.9rem] leading-snug text-bone-muted group-hover:text-bone">
                        {intention}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* YEAR NARRATIVE — editorial prose */}
      <section className="px-2 md:px-4">
        <p className="shell-kicker mb-3">This year</p>
        <h2 className="shell-section-title mb-6 max-w-2xl">
          {areaYearNarrative.theme}
        </h2>
        <p className="shell-prose">
          {areaYearNarrative.direction ||
            profileRes.data?.year_vision ||
            `${BRAND.product} will synthesize your natal chart, house rulers, and yearly transits into a focused narrative for this area.`}
        </p>
        <p className="shell-prose mt-4">
          {category.success || area.plannerPrompt}
        </p>
      </section>

      {/* CHART ANCHORS — inline reference */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="shell-kicker">In your chart</p>
            <h2 className="mt-1 shell-subsection-title">Where this area lives</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="shell-eyebrow mb-3">Houses</p>
            <div className="space-y-2">
              {houseDetails.length > 0 ? (
                houseDetails.map((detail) => (
                  <div
                    key={detail.house}
                    className="shell-panel-inline flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-bone">House {detail.house}</p>
                      {detail.ruler ? (
                        <p className="mt-0.5 text-xs text-bone-muted/80">Ruled by {detail.ruler}</p>
                      ) : null}
                    </div>
                    {detail.sign ? <span className="shell-pill">{detail.sign}</span> : null}
                  </div>
                ))
              ) : (
                <p className="shell-panel-inline px-4 py-3 text-sm text-bone-muted">
                  Not mapped to houses yet.
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="shell-eyebrow mb-3">Natal placements</p>
            <div className="space-y-2">
              {natalPlacements.length > 0 ? (
                natalPlacements.map((placement) => (
                  <div
                    key={`${placement.planet}-${placement.house}`}
                    className="shell-panel-inline flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-bone">
                        {placement.planet} in {placement.sign}
                      </p>
                      <p className="mt-0.5 text-xs text-bone-muted/80">
                        House {placement.house} · {placement.degree.toFixed(1)}°
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="shell-panel-inline px-4 py-3 text-sm text-bone-muted">
                  No natal planets live directly in this area&rsquo;s houses. House rulers and transits still activate it.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TIMING WINDOWS */}
      {upcomingWindows.length > 0 ? (
        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="shell-kicker">Ahead</p>
              <h2 className="mt-1 shell-subsection-title">Upcoming timing windows</h2>
            </div>
            <p className="hidden text-xs text-bone-muted/70 md:block">
              {upcomingWindows.length} of {activeWeeks.length}
            </p>
          </div>
          <div className="space-y-3">
            {upcomingWindows.map((week) => (
              <article
                key={`${week.startDate}-${week.weekNumber}`}
                className="shell-panel-inline px-5 py-4 transition-colors hover:border-leather-400/30"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-[0.95rem] font-medium text-bone">{week.theme}</p>
                      <p className="text-xs text-bone-muted/80">
                        Week {week.weekNumber} · {formatDateRange(week.startDate, week.endDate)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-[1.65] text-bone-muted">{week.cosmicContext}</p>
                  </div>
                  {week.intentions.length > 0 ? (
                    <Link
                      href={buildJournalHref({
                        area: category.name,
                        theme: week.theme,
                        intention: week.intentions[0],
                        weekNumber: week.weekNumber,
                        startDate: week.startDate,
                        endDate: week.endDate,
                        cosmicContext: week.cosmicContext,
                      })}
                      className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border/60 bg-stone-950/60 px-3 py-1.5 text-[0.72rem] font-medium text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
                    >
                      <PenSquare size={12} />
                      Journal
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* STRATEGY + BEST MONTHS */}
      <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="shell-kicker mb-3">How to work with the energy</p>
          <h2 className="shell-subsection-title mb-5">Supporting practices</h2>
          <ul className="space-y-3">
            {area.supportStrategies.map((strategy) => (
              <li key={strategy} className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-leather-400/60" />
                <span className="text-[0.95rem] leading-[1.7] text-bone-muted/95">{strategy}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="shell-kicker mb-3">Best months to act</p>
          <h2 className="shell-subsection-title mb-5">Planner lens</h2>
          {activeMonths.length > 0 ? (
            <div className="space-y-2">
              {activeMonths.slice(0, 3).map((month) => (
                <div key={month.month} className="shell-panel-inline px-4 py-3">
                  <p className="text-sm font-medium text-bone">{month.name}</p>
                  <p className="mt-1.5 text-sm leading-[1.6] text-bone-muted/90">{month.energyArc}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="shell-panel-inline px-4 py-3 text-sm text-bone-muted">
              Month-level recommendations appear here once timing windows translate into planner events.
            </p>
          )}
        </div>
      </section>

      {/* GOALS — itemised intentions per area */}
      <AreaGoalsPanel
        slug={slug}
        areaName={category.name}
        initialGoals={initialGoals}
        upcomingWindows={upcomingWindows.map((w) => ({
          weekNumber: w.weekNumber,
          theme: w.theme,
          startDate: w.startDate,
        }))}
      />
    </div>
  )
}
