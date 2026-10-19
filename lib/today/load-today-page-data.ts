import { createAdminSupabase } from '@/lib/supabase/admin'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getShapeOfToday } from '@/lib/today/shape-of-today'
import { getActiveTransits } from '@/lib/today/get-active-transits'
import { getJournalStreak } from '@/lib/today/get-journal-streak'
import { getTodayIntention } from '@/lib/today/get-today-intention'
import { getTodayCurriculum } from '@/lib/today/get-today-curriculum'
import { getDueCurriculumSessions } from '@/lib/today/get-due-curriculum-sessions'
import { getSkyNow } from '@/lib/today/get-sky-now'
import { getLifeArc } from '@/lib/today/get-life-arc'
import { getJupiterSeason } from '@/lib/today/get-jupiter-season'
import { getNowEnergyWindows } from '@/lib/today/get-now-energy'
import { getHumanDesignWeather } from '@/lib/today/get-human-design-weather'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import type { YearEphemeris } from '@/types/blueprint'
import type { TodayContext } from '@/lib/today/get-today-context'
import type { ShapeOfToday } from '@/lib/today/shape-of-today'
import type { TodayIntentionResult } from '@/lib/today/get-today-intention'
import type { TodayCurriculumResult } from '@/lib/today/get-today-curriculum'
import type { Tables } from '@/types/database'

type PlanItemRow = Pick<
  Tables<'plan_items'>,
  | 'id'
  | 'item_date'
  | 'title'
  | 'sort_order'
  | 'completed_at'
  | 'created_at'
  | 'updated_at'
  | 'user_id'
  | 'start_minute'
  | 'duration_minutes'
  | 'area_goal_id'
  | 'source'
>

export type TodayPageData = {
  context: TodayContext
  shape: ShapeOfToday
  activeTransits: Awaited<ReturnType<typeof getActiveTransits>>
  journalStreak: number
  intention: TodayIntentionResult
  curriculum: TodayCurriculumResult
  skyNow: Awaited<ReturnType<typeof getSkyNow>>
  lifeArc: Awaited<ReturnType<typeof getLifeArc>>
  jupiterSeason: Awaited<ReturnType<typeof getJupiterSeason>>
  nowEnergyWindows: Awaited<ReturnType<typeof getNowEnergyWindows>>
  humanDesignWeather: Awaited<ReturnType<typeof getHumanDesignWeather>>
  todayPlanItems: PlanItemRow[]
  todayCurriculumSessions: Awaited<ReturnType<typeof getDueCurriculumSessions>>
  blueprintLoaded: Awaited<ReturnType<typeof loadCurrentBlueprint>>
  yearEphemeris: YearEphemeris | null
  currentWeekTheme: string | null
  deeperOpenByDefault: boolean
}

export async function loadTodayPageData(
  supabaseUserId: string,
  onboardingCompletedAt: string | null
): Promise<TodayPageData> {
  const admin = createAdminSupabase()
  const context = getTodayContext()
  const shape = getShapeOfToday({
    moonPhase: context.today.moonPhase,
    moonSign: context.today.moon.sign,
  })

  const accountAgeDays = onboardingCompletedAt
    ? (Date.now() - new Date(onboardingCompletedAt).getTime()) / 86_400_000
    : 0
  const deeperOpenByDefault = accountAgeDays >= 7

  const [
    activeTransits,
    journalStreak,
    intention,
    curriculum,
    skyNow,
    lifeArc,
    jupiterSeason,
    nowEnergyWindows,
    humanDesignWeather,
    todayPlanItemsRes,
    todayCurriculumSessions,
  ] = await Promise.all([
    getActiveTransits(context.today.date, supabaseUserId),
    getJournalStreak(context.today.date, supabaseUserId),
    getTodayIntention(context.today.date, supabaseUserId),
    getTodayCurriculum(context.today.date, supabaseUserId),
    getSkyNow(context.today.date, supabaseUserId),
    getLifeArc(context.today.date, supabaseUserId),
    getJupiterSeason(context.today.date, supabaseUserId),
    getNowEnergyWindows(supabaseUserId, context.today.date),
    getHumanDesignWeather(supabaseUserId),
    admin
      .from('plan_items')
      .select(
        'id, item_date, title, sort_order, completed_at, created_at, updated_at, user_id, start_minute, duration_minutes, area_goal_id, source'
      )
      .eq('user_id', supabaseUserId)
      .eq('item_date', context.today.date)
      .order('sort_order', { ascending: true }),
    getDueCurriculumSessions(supabaseUserId, context.today.date),
  ])

  const blueprintLoaded = await loadCurrentBlueprint(supabaseUserId)
  let yearEphemeris: YearEphemeris | null = null
  if (blueprintLoaded) {
    const { data: ephemerisRow } = await admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', supabaseUserId)
      .eq('year', blueprintLoaded.planYear)
      .maybeSingle()
    yearEphemeris = (ephemerisRow?.data as YearEphemeris | null) ?? null
  }

  const currentWeek =
    blueprintLoaded?.blueprint.weeks.find((w) => w.weekNumber === context.meta.isoWeek) ?? null

  return {
    context,
    shape,
    activeTransits,
    journalStreak,
    intention,
    curriculum,
    skyNow,
    lifeArc,
    jupiterSeason,
    nowEnergyWindows,
    humanDesignWeather,
    todayPlanItems: todayPlanItemsRes.data ?? [],
    todayCurriculumSessions,
    blueprintLoaded,
    yearEphemeris,
    currentWeekTheme: currentWeek?.theme ?? null,
    deeperOpenByDefault,
  }
}
