import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { NatalChart, YearEphemeris } from '@/types/blueprint'
import { resolvePlannerLocation } from '@/lib/planner/resolve-planner-location'

/**
 * Today's transit-shaped energy windows for the "right now" card — same
 * engine the Planner's Day grid uses (lib/planetary/transit-windows.ts),
 * scoped down to just the windows (no plan items / curriculum).
 */
export async function getNowEnergyWindows(userId: string, date: string): Promise<EnergyWindow[]> {
  const admin = createAdminSupabase()
  const year = Number.parseInt(date.slice(0, 4), 10)

  const [profileRes, ephemerisRes] = await Promise.all([
    admin.from('user_profiles').select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart').eq('id', userId).maybeSingle(),
    admin.from('ephemeris_cache').select('data').eq('user_id', userId).eq('year', year).maybeSingle(),
  ])

  const { lat, lng, timeZone } = resolvePlannerLocation(profileRes.data)
  const natalChart = (profileRes.data?.natal_chart as unknown as NatalChart | null) ?? null

  const ephemeris = (ephemerisRes.data?.data as unknown as YearEphemeris | null) ?? null
  const dayTransits = ephemeris?.days?.find((d) => d.date === date)?.transits ?? []

  return computeTransitWindows({ date, lat, lng, timeZone, natalChart, dayTransits })
}
