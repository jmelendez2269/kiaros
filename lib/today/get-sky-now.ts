import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getDailyLongitudesForDate } from '@/lib/ephemeris'
import type { AspectType, NatalChart, Planet, YearEphemeris } from '@/types/blueprint'

export type PlanetKey =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

export interface SkyNowAspect {
  planet: Planet
  natalPlanet: Planet
  aspect: AspectType
  orb: number
  applying: boolean
}

export interface SkyNowData {
  /** Today's transit longitudes 0–360. */
  transit: Record<PlanetKey, number>
  /** User's natal longitudes 0–360. */
  natal: Record<PlanetKey, number>
  /** Whole-sign houses keyed by planet. */
  natalHouses: Record<PlanetKey, number>
  /** Planets currently in retrograde motion. */
  retrogradePlanets: Planet[]
  /** Active personal aspects (orb ≤ 3°). */
  aspects: SkyNowAspect[]
}

export type SkyNowResult =
  | { status: 'ok'; data: SkyNowData }
  | { status: 'no-chart' }

/**
 * Loads the data the Sky Now wheel needs — today's transit longitudes plus the
 * user's natal chart and the day's active aspects. Returns `no-chart` when the
 * user hasn't completed onboarding or the year's ephemeris hasn't been cached.
 */
export async function getSkyNow(date: string, supabaseUserId: string): Promise<SkyNowResult> {
  const admin = createAdminSupabase()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, natal_chart')
    .eq('id', supabaseUserId)
    .maybeSingle()

  if (!profile?.id || !profile.natal_chart) return { status: 'no-chart' }

  const year = Number.parseInt(date.slice(0, 4), 10)
  const { data: cached } = await admin
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', supabaseUserId)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cached?.data as unknown as YearEphemeris | null) ?? null
  const todayDay = ephemeris?.days.find((d) => d.date === date) ?? null

  const transitLon = getDailyLongitudesForDate(date)
  const transit: Record<PlanetKey, number> = {
    sun: transitLon.sun,
    moon: transitLon.moon,
    mercury: transitLon.mercury,
    venus: transitLon.venus,
    mars: transitLon.mars,
    jupiter: transitLon.jupiter,
    saturn: transitLon.saturn,
    uranus: transitLon.uranus,
    neptune: transitLon.neptune,
    pluto: transitLon.pluto,
  }

  const natalChart = profile.natal_chart as unknown as NatalChart
  const natal: Record<PlanetKey, number> = {
    sun: natalChart.sun.longitude,
    moon: natalChart.moon.longitude,
    mercury: natalChart.mercury.longitude,
    venus: natalChart.venus.longitude,
    mars: natalChart.mars.longitude,
    jupiter: natalChart.jupiter.longitude,
    saturn: natalChart.saturn.longitude,
    uranus: natalChart.uranus.longitude,
    neptune: natalChart.neptune.longitude,
    pluto: natalChart.pluto.longitude,
  }
  const natalHouses: Record<PlanetKey, number> = {
    sun: natalChart.sun.house,
    moon: natalChart.moon.house,
    mercury: natalChart.mercury.house,
    venus: natalChart.venus.house,
    mars: natalChart.mars.house,
    jupiter: natalChart.jupiter.house,
    saturn: natalChart.saturn.house,
    uranus: natalChart.uranus.house,
    neptune: natalChart.neptune.house,
    pluto: natalChart.pluto.house,
  }

  const retrogradePlanets: Planet[] = todayDay ? [...todayDay.retrogrades] : []
  const aspects: SkyNowAspect[] = todayDay
    ? todayDay.transits
        .filter((t) => t.orb <= 3)
        .map((t) => ({
          planet: t.planet,
          natalPlanet: t.natalPlanet,
          aspect: t.aspect,
          orb: t.orb,
          applying: t.applying,
        }))
    : []

  return {
    status: 'ok',
    data: { transit, natal, natalHouses, retrogradePlanets, aspects },
  }
}
