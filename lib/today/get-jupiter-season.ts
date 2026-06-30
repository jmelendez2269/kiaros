import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  buildSkyTimeline,
  parseStoredHumanDesign,
  computeHumanDesign,
  type HumanDesignBirthInput,
} from '@/lib/human-design'
import {
  getDailyLongitudesForDate,
  lonToSign,
} from '@/lib/ephemeris/astronomia-adapter'
import type { AspectType, Planet, YearEphemeris, ZodiacSign } from '@/types/blueprint'

/**
 * lib/today/get-jupiter-season.ts
 *
 * Jupiter-based seasonal context for /today. Jupiter stays in a sign for
 * roughly 12–13 months, making it the natural astrological "season" —
 * long enough to shape a chapter, short enough to feel like weather
 * changing.
 *
 * Returns:
 *   sign          — Jupiter's current zodiac sign
 *   degreeInSign  — how far through the sign Jupiter is (0–30)
 *   isRetrograde  — whether Jupiter is currently retrograde
 *   activeAspects — Jupiter's live natal contacts from the sky timeline
 *   hd            — Human Design context (if birth time known)
 *   signature     — "jupiter:{sign}:{year}" — cache key; refreshes when
 *                   Jupiter changes sign or year rolls over
 *   cachedRead    — stored AI prose if the signature still matches
 *
 * Returns { status: 'no-chart' } when the user has no natal chart or no
 * ephemeris cached for the year.
 */

export interface JupiterAspect {
  natalPlanet: Planet
  aspect: AspectType
  technical: string
  orb: number
  applying: boolean
}

export interface JupiterSeasonHDContext {
  type: string
  authority: string
  profile: string
  profileName: string
}

export interface JupiterSeasonData {
  status: 'ok'
  sign: ZodiacSign
  degreeInSign: number
  isRetrograde: boolean
  activeAspects: JupiterAspect[]
  hd: JupiterSeasonHDContext | null
  signature: string
  cachedRead: string | null
}

export type JupiterSeasonResult =
  | JupiterSeasonData
  | { status: 'no-chart' }

export async function getJupiterSeason(
  date: string,
  supabaseUserId: string,
): Promise<JupiterSeasonResult> {
  const admin = createAdminSupabase()

  const { data: profile } = await admin
    .from('user_profiles')
    .select(
      'id, natal_chart, human_design, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng',
    )
    .eq('id', supabaseUserId)
    .maybeSingle()

  if (!profile?.id || !profile.natal_chart) {
    return { status: 'no-chart' }
  }

  // Jupiter's current position — computed directly from astronomia, no
  // cache needed since it's a single fast calculation.
  const lons = getDailyLongitudesForDate(date)
  const jupiterLon = lons.jupiter
  const sign = lonToSign(jupiterLon)
  const degreeInSign = jupiterLon % 30

  // Retrograde: compare yesterday's and today's longitude directly.
  const yesterdayStr = (() => {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const lonsYesterday = getDailyLongitudesForDate(yesterdayStr)
  let jupDiff = jupiterLon - lonsYesterday.jupiter
  if (jupDiff > 180) jupDiff -= 360
  if (jupDiff < -180) jupDiff += 360
  const retrograde = jupDiff < 0

  // Active Jupiter natal aspects — from the sky timeline filtered to Jupiter.
  const year = Number.parseInt(date.slice(0, 4), 10)
  const { data: cachedEph } = await admin
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', supabaseUserId)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cachedEph?.data as unknown as YearEphemeris | null) ?? null

  const activeAspects: JupiterAspect[] = []
  if (ephemeris) {
    const timeline = buildSkyTimeline(ephemeris, date)
    const todayTransits = ephemeris.days.find((d) => d.date === date)?.transits ?? []

    for (const entry of timeline) {
      if (entry.planet !== 'Jupiter' || entry.status !== 'active') continue
      const todayHit = todayTransits.find(
        (t) =>
          t.planet === entry.planet &&
          t.natalPlanet === entry.natalPlanet &&
          t.aspect === entry.aspect,
      )
      if (!todayHit) continue
      activeAspects.push({
        natalPlanet: entry.natalPlanet,
        aspect: entry.aspect,
        technical: entry.technical,
        orb: todayHit.orb,
        applying: todayHit.applying,
      })
    }
    activeAspects.sort((a, b) => a.orb - b.orb)
  }

  // Human Design
  let hd: JupiterSeasonHDContext | null = null
  const chart =
    parseStoredHumanDesign(profile.human_design) ??
    (profile.birth_time && !profile.birth_time_unknown
      ? computeHumanDesign(profile as HumanDesignBirthInput)
      : null)
  if (chart && chart.hasKnownBirthTime) {
    hd = {
      type: chart.bodyGraph.type,
      authority: chart.bodyGraph.authority,
      profile: chart.bodyGraph.profile,
      profileName: chart.bodyGraph.profileName,
    }
  }

  const signature = `jupiter:${sign}:${year}`

  // Cached read
  const { data: settings } = await admin
    .from('user_settings')
    .select('jupiter_season_read, jupiter_season_signature')
    .eq('user_id', supabaseUserId)
    .maybeSingle()

  const cachedRead =
    settings?.jupiter_season_read && settings.jupiter_season_signature === signature
      ? (settings.jupiter_season_read as string)
      : null

  return {
    status: 'ok',
    sign,
    degreeInSign: Math.round(degreeInSign * 10) / 10,
    isRetrograde: retrograde,
    activeAspects,
    hd,
    signature,
    cachedRead,
  }
}
