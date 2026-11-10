import 'server-only'

import { createServerSupabase } from '@/lib/supabase/server'
import { humanizeLunarPhase } from '@/lib/journal/intelligence'
import { resolvePlannerLocation } from '@/lib/planner/resolve-planner-location'
import { getTodayContext } from '@/lib/today/get-today-context'
import { resolveTodayDateISO } from '@/lib/today/mock-today-date'
import { checkInFromRow, type CheckIn } from './check-in-options'

export type CheckInResult = { success: true; data: CheckIn } | { success: false; error: string }

/** Today's check-in for the signed-in member, or an empty one. Read through their own row-level access. */
export async function loadCheckIn(date: string): Promise<CheckIn> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('daily_logs').select('energy_level, mood_tag').eq('log_date', date).maybeSingle()
  return checkInFromRow(data)
}

/**
 * Saves today's check-in for the signed-in member, stamped with the moon it
 * was made under (the same labels journal entries carry). One row per day:
 * a second save replaces the first. The day follows the member's planner
 * timezone, as the Today page does.
 */
export async function saveCheckIn(checkIn: CheckIn): Promise<CheckInResult> {
  const supabase = await createServerSupabase()
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz')
    .maybeSingle()
  if (profileError || !profile) return { success: false, error: 'Could not load your profile.' }

  const { timeZone } = resolvePlannerLocation(profile)
  const date = resolveTodayDateISO({ timeZone })
  const sky = getTodayContext({ dateISO: date, timeZone }).today

  const { error } = await supabase.from('daily_logs').upsert(
    {
      user_id: profile.id,
      log_date: date,
      energy_level: checkIn.energy,
      mood_tag: checkIn.mood,
      lunar_phase: humanizeLunarPhase(sky.moonPhase),
      lunar_sign: sky.moon.sign,
    },
    { onConflict: 'user_id,log_date' },
  )
  if (error) return { success: false, error: 'Could not save your check-in.' }
  return { success: true, data: checkIn }
}
