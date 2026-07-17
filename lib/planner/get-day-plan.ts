import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { NatalChart, YearEphemeris } from '@/types/blueprint'
import type { Tables } from '@/types/database'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { getWeekGoalsForDate, type AreaGoalRow } from './get-week-goals'

export type PlanItemRow = Tables<'plan_items'>

// Fallback location/timezone when the user hasn't completed onboarding's
// birth-location step yet — matches the app-wide default used for the
// Today dashboard's ephemeris snapshot.
const FALLBACK_LAT = 40.7128
const FALLBACK_LNG = -74.006
const FALLBACK_TZ = 'America/New_York'

export interface DayPlan {
  date: string
  planItems: PlanItemRow[]
  curriculumSessions: CurriculumSessionRow[]
  windows: EnergyWindow[]
  weekGoals: AreaGoalRow[]
}

export async function getDayPlan(userId: string, date: string): Promise<DayPlan> {
  const admin = createAdminSupabase()
  const year = Number.parseInt(date.slice(0, 4), 10)

  const [profileRes, planItemsRes, curriculumRes, ephemerisRes, weekGoals] = await Promise.all([
    admin
      .from('user_profiles')
      .select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('plan_items')
      .select('id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
      .eq('user_id', userId)
      .eq('item_date', date)
      .order('sort_order', { ascending: true }),
    admin
      .from('curriculum_sessions')
      .select('id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status')
      .eq('user_id', userId)
      .eq('scheduled_for', date),
    admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle(),
    getWeekGoalsForDate(userId, date),
  ])

  const lat = profileRes.data?.planner_lat ?? profileRes.data?.birth_lat ?? FALLBACK_LAT
  const lng = profileRes.data?.planner_lng ?? profileRes.data?.birth_lng ?? FALLBACK_LNG
  const timeZone = profileRes.data?.planner_tz ?? profileRes.data?.birth_tz ?? FALLBACK_TZ
  const natalChart = (profileRes.data?.natal_chart as unknown as NatalChart | null) ?? null

  const ephemeris = (ephemerisRes.data?.data as unknown as YearEphemeris | null) ?? null
  const dayTransits = ephemeris?.days?.find((d) => d.date === date)?.transits ?? []

  const windows = computeTransitWindows({ date, lat, lng, timeZone, natalChart, dayTransits })

  return {
    date,
    planItems: planItemsRes.data ?? [],
    curriculumSessions: (curriculumRes.data ?? []) as CurriculumSessionRow[],
    windows,
    weekGoals,
  }
}
