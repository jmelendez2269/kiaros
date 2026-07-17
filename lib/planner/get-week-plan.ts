import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { NatalChart, Transit, YearEphemeris } from '@/types/blueprint'
import type { PlanItemRow } from './get-day-plan'
import { getWeekGoalsForRange, type AreaGoalRow } from './get-week-goals'

const FALLBACK_LAT = 40.7128
const FALLBACK_LNG = -74.006
const FALLBACK_TZ = 'America/New_York'

export interface DaySummary {
  date: string
  planItems: PlanItemRow[]
  windows: EnergyWindow[]
}

export interface WeekPlan {
  days: DaySummary[]
  weekGoals: AreaGoalRow[]
}

/** `weekDates` — 7 consecutive YYYY-MM-DD strings, Monday first. */
export async function getWeekPlan(userId: string, weekDates: string[]): Promise<WeekPlan> {
  const admin = createAdminSupabase()
  const from = weekDates[0]
  const to = weekDates[weekDates.length - 1]

  // A week can span a year boundary (Dec 29 – Jan 4); ephemeris_cache is
  // stored per calendar year, so fetch every year touched by the week.
  const years = [...new Set(weekDates.map((d) => Number.parseInt(d.slice(0, 4), 10)))]

  const [profileRes, planItemsRes, weekGoals, ...ephemerisResults] = await Promise.all([
    admin.from('user_profiles').select('birth_lat, birth_lng, birth_tz, natal_chart').eq('id', userId).maybeSingle(),
    admin
      .from('plan_items')
      .select('id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
      .eq('user_id', userId)
      .gte('item_date', from)
      .lte('item_date', to)
      .order('sort_order', { ascending: true }),
    getWeekGoalsForRange(userId, weekDates),
    ...years.map((year) =>
      admin.from('ephemeris_cache').select('data').eq('user_id', userId).eq('year', year).maybeSingle()
    ),
  ])

  const lat = profileRes.data?.birth_lat ?? FALLBACK_LAT
  const lng = profileRes.data?.birth_lng ?? FALLBACK_LNG
  const timeZone = profileRes.data?.birth_tz ?? FALLBACK_TZ
  const natalChart = (profileRes.data?.natal_chart as unknown as NatalChart | null) ?? null

  const transitsByDate = new Map<string, Transit[]>()
  for (const res of ephemerisResults) {
    const ephemeris = (res.data?.data as unknown as YearEphemeris | null) ?? null
    for (const day of ephemeris?.days ?? []) {
      transitsByDate.set(day.date, day.transits)
    }
  }

  const allPlanItems = planItemsRes.data ?? []
  const itemsByDate = new Map<string, PlanItemRow[]>()
  for (const item of allPlanItems) {
    const bucket = itemsByDate.get(item.item_date)
    if (bucket) bucket.push(item)
    else itemsByDate.set(item.item_date, [item])
  }

  const days: DaySummary[] = weekDates.map((date) => ({
    date,
    planItems: itemsByDate.get(date) ?? [],
    windows: computeTransitWindows({
      date,
      lat,
      lng,
      timeZone,
      natalChart,
      dayTransits: transitsByDate.get(date) ?? [],
    }),
  }))

  return { days, weekGoals }
}
