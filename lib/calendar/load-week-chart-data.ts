import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { getWeekDates } from '@/components/calendar/utils'
import type { YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { Tables } from '@/types/database'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { NatalChart } from '@/types/blueprint'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import { resolvePlannerLocation } from '@/lib/planner/resolve-planner-location'
import { appProfileId, getAppProfile } from '@/lib/app/get-app-profile'
import { auth } from '@clerk/nextjs/server'

type PlanItemRow = Tables<'plan_items'>
type AreaGoalRow = Tables<'area_goals'>
type PlannerContextRow = Pick<
  Tables<'user_profiles'>,
  'birth_lat' | 'birth_lng' | 'birth_tz' | 'planner_lat' | 'planner_lng' | 'planner_tz' | 'natal_chart'
>

async function loadSupabaseUserId() {
  const { userId } = await auth()
  if (!userId) return null
  return appProfileId(await getAppProfile(userId))
}

export function shiftDate(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function weekOverlapsPlanYear(dateIso: string, planYear: number): boolean {
  const dates = getWeekDates(dateIso)
  return dates[6] >= `${planYear}-01-01` && dates[0] <= `${planYear}-12-31`
}

export function clampWeekToPlanYear(dateIso: string, planYear: number): string {
  const dates = getWeekDates(dateIso)
  if (dates[6] < `${planYear}-01-01`) return `${planYear}-01-01`
  if (dates[0] > `${planYear}-12-31`) return `${planYear}-12-31`
  return dateIso
}

export function buildDayCharacters(
  dates: string[],
  ephemeris: YearEphemeris | null,
  plannerContext: PlannerContextRow | null
): Map<string, EnergyWindow> {
  const characters = new Map<string, EnergyWindow>()
  if (!ephemeris) return characters

  const { lat, lng, timeZone } = resolvePlannerLocation(plannerContext)
  const natalChart = (plannerContext?.natal_chart as unknown as NatalChart | null) ?? null
  const ephemerisByDate = new Map(ephemeris.days.map((day) => [day.date, day]))

  for (const date of dates) {
    const windows = computeTransitWindows({
      date,
      lat,
      lng,
      timeZone,
      natalChart,
      dayTransits: ephemerisByDate.get(date)?.transits ?? [],
    })
    const character = windows.find((window) => window.label === 'Peak' || window.label === 'Steady')
    if (character) characters.set(date, character)
  }

  return characters
}

export async function loadWeekChartData(selectedDate: string) {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) {
    return {
      loaded: null,
      yearEphemeris: null,
      curriculumSessions: [] as CurriculumSessionRow[],
      planItems: [] as PlanItemRow[],
      areaGoals: [] as AreaGoalRow[],
      plannerContext: null,
      supabaseUserId: null,
    }
  }

  const weekDates = getWeekDates(selectedDate)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const years = [...new Set(weekDates.map((date) => Number(date.slice(0, 4))))]
  const admin = createAdminSupabase()
  const blueprintPromise = loadCurrentBlueprint(supabaseUserId)
  const areaGoalsPromise = blueprintPromise.then(async (loaded) => {
    if (!loaded) return [] as AreaGoalRow[]
    const overlappingWeekNumbers = loaded.blueprint.weeks
      .filter((week) => week.startDate <= weekEnd && week.endDate >= weekStart)
      .map((week) => week.weekNumber)
    if (overlappingWeekNumbers.length === 0) return [] as AreaGoalRow[]

    const { data } = await admin
      .from('area_goals')
      .select(
        'id, category_id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at, user_id'
      )
      .eq('user_id', supabaseUserId)
      .in('linked_week_number', overlappingWeekNumbers)
      .order('sort_order', { ascending: true })
    return (data ?? []) as AreaGoalRow[]
  })

  const [loaded, ephemerisResults, sessionsRes, planItemsRes, areaGoals, plannerContextRes] = await Promise.all([
    blueprintPromise,
    Promise.all(
      years.map((year) =>
        admin.from('ephemeris_cache').select('data').eq('user_id', supabaseUserId).eq('year', year).maybeSingle()
      )
    ),
    admin
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .eq('user_id', supabaseUserId)
      .gte('scheduled_for', weekStart)
      .lte('scheduled_for', weekEnd)
      .order('scheduled_for', { ascending: true })
      .order('session_order', { ascending: true }),
    admin
      .from('plan_items')
      .select(
        'id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source'
      )
      .eq('user_id', supabaseUserId)
      .gte('item_date', weekStart)
      .lte('item_date', weekEnd)
      .order('item_date', { ascending: true })
      .order('sort_order', { ascending: true }),
    areaGoalsPromise,
    admin
      .from('user_profiles')
      .select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart')
      .eq('id', supabaseUserId)
      .maybeSingle(),
  ])

  const ephemerides = ephemerisResults
    .map((result) => (result.data?.data as YearEphemeris | null) ?? null)
    .filter((ephemeris): ephemeris is YearEphemeris => ephemeris !== null)
  const primaryEphemeris = ephemerides[0] ?? null

  return {
    loaded,
    yearEphemeris: primaryEphemeris
      ? { ...primaryEphemeris, days: ephemerides.flatMap((ephemeris) => ephemeris.days) }
      : null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
    planItems: (planItemsRes.data ?? []) as PlanItemRow[],
    areaGoals,
    plannerContext: plannerContextRes.data as PlannerContextRow | null,
    supabaseUserId,
  }
}
