import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  computeHumanDesign,
  isHumanDesignStale,
  parseStoredHumanDesign,
  type HumanDesignBirthInput,
  type HumanDesignChart,
} from '@/lib/human-design'
import { getLifeArc } from '@/lib/today/get-life-arc'
import { computeNatalAspects } from '@/lib/ephemeris/natal-aspects'
import { areaActivationWeeks, areaHouseDetails, getAreaDefinition, slugifyAreaName } from '@/lib/areas'
import { SelfView, type AreaPreview } from '@/components/self/SelfView'
import type { NatalChart, WeekBlueprint } from '@/types/blueprint'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function findCurrentQuarterTheme(quarters: unknown, quarterNumber: number): string | null {
  if (!Array.isArray(quarters)) return null
  const match = quarters.find(
    (q): q is { quarter: number; theme: string } =>
      typeof q === 'object' && q !== null && (q as Record<string, unknown>).quarter === quarterNumber,
  )
  return typeof match?.theme === 'string' && match.theme ? match.theme : null
}

async function resolveHumanDesign(
  birthInput: HumanDesignBirthInput,
  storedHumanDesign: unknown,
  clerkUserId: string | null,
): Promise<HumanDesignChart | null> {
  let chart: HumanDesignChart | null = parseStoredHumanDesign(storedHumanDesign)

  if (!chart || isHumanDesignStale(storedHumanDesign)) {
    chart = computeHumanDesign(birthInput)
    if (chart && clerkUserId) {
      // Backfill on read so the next visit is a pure DB fetch. Best-effort —
      // ignore failures here; the page still renders the freshly computed
      // chart even if the persist round-trip fails.
      try {
        const admin = createAdminSupabase()
        await admin
          .from('user_profiles')
          .update({ human_design: chart as unknown as Record<string, unknown> })
          .eq('clerk_user_id', clerkUserId)
      } catch (err) {
        console.error('[self] human design backfill persist failed:', err)
      }
    }
  }

  return chart
}

export default async function SelfPage() {
  const { userId } = await auth()
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()
  const today = todayISO()

  const [profileRes, categoriesRes, blueprintRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select(
        'id, display_name, natal_chart, human_design, birth_date, birth_time, birth_time_unknown, birth_city, birth_tz, birth_lat, birth_lng',
      )
      .maybeSingle(),
    supabase
      .from('goal_categories')
      .select('id, name, icon_key, success, description, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('blueprints')
      .select('weeks, quarters')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const natalChart = (profile?.natal_chart as NatalChart | null) ?? null

  if (!profile?.birth_date || profile.birth_lat == null || profile.birth_lng == null || !natalChart) {
    return <NoBirthDataState />
  }

  const birthTimeKnown = !profile.birth_time_unknown && !!profile.birth_time

  const [lifeArc, hdChart] = await Promise.all([
    getLifeArc(today, profile.id),
    birthTimeKnown
      ? resolveHumanDesign(
          {
            birth_date: profile.birth_date,
            birth_time: profile.birth_time,
            birth_time_unknown: profile.birth_time_unknown,
            birth_tz: profile.birth_tz,
            birth_lat: profile.birth_lat,
            birth_lng: profile.birth_lng,
          },
          profile.human_design,
          userId,
        )
      : Promise.resolve(null),
  ])

  const natalAspects = computeNatalAspects(natalChart)

  const categories = categoriesRes.data ?? []
  const weeks = (blueprintRes.data?.weeks as unknown as WeekBlueprint[]) ?? []
  const currentQuarterNumber = Math.ceil((new Date().getMonth() + 1) / 3)
  const currentQuarterTheme = findCurrentQuarterTheme(blueprintRes.data?.quarters, currentQuarterNumber)
  const currentQuarter = currentQuarterTheme
    ? { number: currentQuarterNumber, theme: currentQuarterTheme }
    : null
  const areaPreviews: AreaPreview[] = categories.map((category) => {
    const area = getAreaDefinition(category.name)
    const slug = slugifyAreaName(category.name)
    const activationWeeks = areaActivationWeeks(category.name, weeks)
    const currentWindow =
      activationWeeks.find((week) => week.startDate <= today && today <= week.endDate) ?? activationWeeks[0] ?? null
    const houseDetails = birthTimeKnown ? areaHouseDetails(category.name, natalChart) : []
    return {
      id: category.id,
      name: category.name,
      iconKey: category.icon_key,
      summary: category.description || area.summary,
      slug,
      energyMode: area.energyMode,
      currentWindow,
      houseDetails,
    }
  })

  return (
    <SelfView
      displayName={profile.display_name}
      birthCity={profile.birth_city}
      natalChart={natalChart}
      natalAspects={natalAspects}
      hdChart={hdChart}
      birthTimeKnown={birthTimeKnown}
      lifeArc={lifeArc}
      areaPreviews={areaPreviews}
      currentQuarter={currentQuarter}
    />
  )
}

function NoBirthDataState() {
  return (
    <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
      <div className="text-4xl text-bone-muted">✺</div>
      <h1 className="font-serif text-3xl text-bone">Your reading needs birth data</h1>
      <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
        Self is drawn from the moment and place of your birth. Finish onboarding so this reading
        can be built from real ephemeris data, not a generic template.
      </p>
      <Link
        href="/onboarding"
        className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
      >
        Complete Setup
      </Link>
    </div>
  )
}
