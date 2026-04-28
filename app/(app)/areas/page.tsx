import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { areaActivationWeeks, areaHouseDetails, getAreaDefinition, slugifyAreaName } from '@/lib/areas'
import type { NatalChart, WeekBlueprint } from '@/types/blueprint'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function AreasPage() {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()
  const today = todayISO()

  const [categoriesRes, blueprintRes, profileRes] = await Promise.all([
    supabase
      .from('goal_categories')
      .select('id, name, icon_key, success, description, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('blueprints')
      .select('weeks')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('natal_chart')
      .maybeSingle(),
  ])

  const categories = categoriesRes.data ?? []
  const weeks = (blueprintRes.data?.weeks as unknown as WeekBlueprint[]) ?? []
  const natalChart = (profileRes.data?.natal_chart as NatalChart | null) ?? null

  return (
    <div className="space-y-8">
      <section className="shell-panel px-6 py-7 md:px-8">
        <p className="shell-kicker mb-3">Areas</p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="shell-section-title">Your life areas, interpreted through the chart</h1>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Each area becomes its own workspace with houses, natal placements, timing windows, and planner guidance. This is where
              Kiaros starts feeling less like a tracker and more like a chart-specific planning system.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
            {natalChart ? `Whole-sign houses anchored by ${natalChart.rising} rising` : 'Birth chart details will deepen these area readings once the natal chart is ready.'}
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const area = getAreaDefinition(category.name)
            const slug = slugifyAreaName(category.name)
            const activationWeeks = areaActivationWeeks(category.name, weeks)
            const currentWindow = activationWeeks.find((week) => week.startDate <= today && today <= week.endDate) ?? activationWeeks[0] ?? null
            const houseDetails = areaHouseDetails(category.name, natalChart)

            return (
              <Link
                key={category.id}
                href={`/areas/${slug}`}
                className="shell-panel group flex h-full flex-col justify-between px-6 py-6 transition-colors hover:border-leather-400/35 hover:bg-leather-500/8"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="shell-kicker mb-3">Life Area</p>
                      <h2 className="text-[1.9rem] font-semibold leading-tight text-bone">
                        {category.icon_key ? `${category.icon_key} ${category.name}` : category.name}
                      </h2>
                    </div>
                    <span className="shell-pill">{area.energyMode}</span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-bone-muted">
                    {category.description || area.summary}
                  </p>

                  {houseDetails.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {houseDetails.map((detail) => (
                        <span key={detail.house} className="shell-pill">
                          House {detail.house}
                          {detail.sign ? ` - ${detail.sign}` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 rounded-[1rem] border border-border/70 bg-stone-950/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">Current timing</p>
                    <p className="mt-3 text-sm font-semibold text-bone">
                      {currentWindow ? currentWindow.theme : 'No dedicated area window yet'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-bone-muted">
                      {currentWindow
                        ? `${currentWindow.startDate} to ${currentWindow.endDate}. ${currentWindow.cosmicContext}`
                        : 'This page will surface area-specific active windows as soon as they are generated from your yearly blueprint.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-border/70 pt-4">
                  <p className="text-sm text-leather-200">
                    {category.success || area.plannerPrompt}
                  </p>
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <section className="shell-panel px-6 py-10 text-center md:px-8">
          <p className="text-sm text-bone-muted">
            Your selected areas will appear here after onboarding.
          </p>
        </section>
      )}
    </div>
  )
}
