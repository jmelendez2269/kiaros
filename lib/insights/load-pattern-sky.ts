import 'server-only'

import type { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'
import { skyPresentDates } from './pattern-sky'

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

/**
 * For each pattern, the dates in `year` when its sky was overhead, read from
 * the member's stored ephemeris for that year (the same data their entries
 * are stamped from). Empty when the year has no stored sky.
 */
export async function loadPatternSkyDays(
  supabase: ServerSupabase,
  profileId: string | null | undefined,
  year: number,
  patterns: Array<{ id: string; pattern_type: string; pattern_key: string }>,
): Promise<Record<string, string[]>> {
  if (!profileId || patterns.length === 0) return {}
  const { data, error } = await supabase.from('ephemeris_cache').select('data').eq('user_id', profileId).eq('year', year).maybeSingle()
  if (error || !data) return {}
  const days = (data.data as unknown as YearEphemeris | null)?.days
  if (!Array.isArray(days)) return {}
  return Object.fromEntries(patterns.map(p => [p.id, skyPresentDates(days, p.pattern_type, p.pattern_key)]))
}
