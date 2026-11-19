import 'server-only'

import type { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'
import { buildSkyStamp, type SkyStamp } from './sky-stamp'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

/** The sky for one date, with the note on skies the member has written under. null when that year has no stored sky. */
export async function loadSkyStamp(supabase: ServerSupabase, profileId: string | null | undefined, dateISO: string): Promise<SkyStamp | null> {
  if (!profileId) return null
  const [ephemerisRes, patternsRes] = await Promise.all([
    supabase.from('ephemeris_cache').select('data').eq('user_id', profileId).eq('year', Number(dateISO.slice(0, 4))).maybeSingle(),
    supabase.from('user_pattern_insights').select('id, pattern_type, pattern_key, sample_size').eq('user_id', profileId),
  ])
  const days = (ephemerisRes.data?.data as unknown as YearEphemeris | null)?.days
  if (!Array.isArray(days)) return null
  const day = days.find((d) => d.date === dateISO)
  return buildSkyStamp(day, (patternsRes.data ?? []) as Array<{ id: string; pattern_type: string; pattern_key: string; sample_size: number }>)
}
