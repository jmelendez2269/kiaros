import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { NatalChart, Transit, YearEphemeris } from '@/types/blueprint'
import { resolvePlannerLocation } from './resolve-planner-location'

export interface MonthDaySummary {
  date: string
  itemCount: number
  doneCount: number
  /** The day's dominant window (Peak/Steady) — same "day lean" used by the Week board. */
  character: EnergyWindow | null
}

export interface MonthPlan {
  year: number
  /** 1–12 */
  month: number
  days: MonthDaySummary[]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate() // month is 1-indexed; day 0 of next month = last day of this one
}

/**
 * Month overview — read-only density + energy character per day (no full
 * plan_items payload; individual titles don't fit a month cell). Click a
 * day to open the full Day view for editing.
 */
export async function getMonthPlan(userId: string, year: number, month: number): Promise<MonthPlan> {
  const admin = createAdminSupabase()
  const lastDay = daysInMonth(year, month)
  const mm = String(month).padStart(2, '0')
  const from = `${year}-${mm}-01`
  const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  const [profileRes, planItemsRes, ephemerisRes] = await Promise.all([
    admin.from('user_profiles').select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart').eq('id', userId).maybeSingle(),
    admin.from('plan_items').select('item_date, completed_at').eq('user_id', userId).gte('item_date', from).lte('item_date', to),
    admin.from('ephemeris_cache').select('data').eq('user_id', userId).eq('year', year).maybeSingle(),
  ])

  const { lat, lng, timeZone } = resolvePlannerLocation(profileRes.data)
  const natalChart = (profileRes.data?.natal_chart as unknown as NatalChart | null) ?? null

  const ephemeris = (ephemerisRes.data?.data as unknown as YearEphemeris | null) ?? null
  const transitsByDate = new Map<string, Transit[]>()
  for (const day of ephemeris?.days ?? []) transitsByDate.set(day.date, day.transits)

  const countsByDate = new Map<string, { total: number; done: number }>()
  for (const item of planItemsRes.data ?? []) {
    const bucket = countsByDate.get(item.item_date) ?? { total: 0, done: 0 }
    bucket.total += 1
    if (item.completed_at) bucket.done += 1
    countsByDate.set(item.item_date, bucket)
  }

  const days: MonthDaySummary[] = []
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${mm}-${String(d).padStart(2, '0')}`
    const windows = computeTransitWindows({
      date,
      lat,
      lng,
      timeZone,
      natalChart,
      dayTransits: transitsByDate.get(date) ?? [],
    })
    const character = windows.find((w) => w.label === 'Peak' || w.label === 'Steady') ?? null
    const counts = countsByDate.get(date) ?? { total: 0, done: 0 }
    days.push({ date, itemCount: counts.total, doneCount: counts.done, character })
  }

  return { year, month, days }
}
