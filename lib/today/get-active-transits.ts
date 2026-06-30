import { createAdminSupabase } from '@/lib/supabase/admin'
import { buildSkyTimeline, type TransitRarity } from '@/lib/human-design'
import type { AspectType, Planet, Transit, YearEphemeris } from '@/types/blueprint'

export interface ActiveTransitRow {
  planet: Planet
  natalPlanet: Planet
  aspect: AspectType
  /** "Mercury square natal Sun" */
  technical: string
  /** One-sentence plain-English description. */
  plain: string
  /** Today's orb in degrees. */
  orb: number
  /** True = approaching exact, false = separating. */
  applying: boolean
  rarity: TransitRarity
  rarityLabel: string
}

export type ActiveTransitsResult =
  | { status: 'ok'; current: ActiveTransitRow[]; lifetime: ActiveTransitRow[] }
  | { status: 'no-chart' }

/**
 * Returns the user's currently-active transits for a given date split into
 * two buckets:
 *   current  — common/frequent/uncommon planets (Moon → Jupiter): change
 *              week to week and are the "weather" of the day.
 *   lifetime — rare/once-in-lifetime (Saturn → Pluto): slow tectonic waves
 *              that last months or years; shown collapsed in the UI.
 *
 * Returns `{ status: 'no-chart' }` when the user hasn't completed their
 * natal chart or the year's ephemeris hasn't been cached yet.
 */
export async function getActiveTransits(
  date: string,
  supabaseUserId: string,
): Promise<ActiveTransitsResult> {
  const admin = createAdminSupabase()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, natal_chart')
    .eq('id', supabaseUserId)
    .maybeSingle()

  if (!profile?.id || !profile.natal_chart) {
    return { status: 'no-chart' }
  }

  const year = Number.parseInt(date.slice(0, 4), 10)
  const { data: cached } = await admin
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', supabaseUserId)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cached?.data as unknown as YearEphemeris | null) ?? null
  if (!ephemeris) return { status: 'no-chart' }

  const todayDay = ephemeris.days.find((d) => d.date === date) ?? null
  const todayTransits = todayDay?.transits ?? []

  const timeline = buildSkyTimeline(ephemeris, date)
  const active = timeline.filter((e) => e.status === 'active')

  const current: ActiveTransitRow[] = []
  const lifetime: ActiveTransitRow[] = []

  for (const entry of active) {
    // Match the window back to today's per-day Transit to get applying state
    // and current orb. If the per-day list dropped the row (orb widened off
    // the day's snapshot), skip — the window will return next pass.
    const todayHit = todayTransits.find(
      (t: Transit) =>
        t.planet === entry.planet &&
        t.natalPlanet === entry.natalPlanet &&
        t.aspect === entry.aspect,
    )
    if (!todayHit) continue

    const row: ActiveTransitRow = {
      planet: entry.planet,
      natalPlanet: entry.natalPlanet,
      aspect: entry.aspect,
      technical: entry.technical,
      plain: entry.plain,
      orb: todayHit.orb,
      applying: todayHit.applying,
      rarity: entry.rarity,
      rarityLabel: entry.rarityLabel,
    }

    if (entry.rarity === 'rare' || entry.rarity === 'once-in-lifetime') {
      lifetime.push(row)
    } else {
      current.push(row)
    }
  }

  // Within each bucket sort tightest orb first — rarity ordering already
  // handled by the bucket split.
  current.sort((a, b) => a.orb - b.orb)
  lifetime.sort((a, b) => a.orb - b.orb)

  return { status: 'ok', current, lifetime }
}
