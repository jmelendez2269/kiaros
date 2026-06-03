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
  | { status: 'ok'; rows: ActiveTransitRow[] }
  | { status: 'no-chart' }

/**
 * Returns the user's tightest currently-active transits for a given date,
 * enriched with rarity (from the planet's orbital period) and a plain-text
 * description. Sorted by rarity-then-orb so outer-planet transits surface
 * first — those are the ones that actually shape a life.
 *
 * Returns `{ status: 'no-chart' }` when the user hasn't completed their
 * natal chart or the year's ephemeris hasn't been cached yet; UI uses that
 * to render the empty state instead of a stale list.
 */
export async function getActiveTransits(
  date: string,
  supabaseUserId: string,
  limit = 4,
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

  const rows: ActiveTransitRow[] = []
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
    rows.push({
      planet: entry.planet,
      natalPlanet: entry.natalPlanet,
      aspect: entry.aspect,
      technical: entry.technical,
      plain: entry.plain,
      orb: todayHit.orb,
      applying: todayHit.applying,
      rarity: entry.rarity,
      rarityLabel: entry.rarityLabel,
    })
    if (rows.length >= limit) break
  }

  return { status: 'ok', rows }
}
