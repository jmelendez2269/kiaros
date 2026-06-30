import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  buildSkyTimeline,
  parseStoredHumanDesign,
  computeHumanDesign,
  type SkyTimelineEntry,
  type TransitRarity,
  type HumanDesignBirthInput,
} from '@/lib/human-design'
import type { AspectType, Planet, YearEphemeris } from '@/types/blueprint'

/**
 * lib/today/get-life-arc.ts
 *
 * Gathers everything the /today "life arc" card needs: the user's
 * currently-active *heavy* transit windows (Saturn + the once-in-a-
 * lifetime outer planets), their Human Design Type, and their Gene
 * Keys spine. The card answers: "what multi-year era am I in right now?"
 *
 * Formerly called "season" — renamed because Saturn/Uranus/Neptune/Pluto
 * transits last years or decades, not seasons. The true seasonal card is
 * the Jupiter Season card (get-jupiter-season.ts).
 *
 * The deterministic half always renders. The AI synthesis is cached on
 * user_settings keyed by `signature` (the set of active heavy windows).
 */

const HEAVY_RARITIES: ReadonlySet<TransitRarity> = new Set(['rare', 'once-in-lifetime'])

export interface LifeArcHeavyWindow {
  technical: string
  planet: Planet
  natalPlanet: Planet
  aspect: AspectType
  rarity: TransitRarity
  rarityLabel: string
  periodLabel: string
  durationDays: number
  peakDate: string
  daysFromTodayToEnd: number
}

export interface LifeArcHDContext {
  type: string
  authority: string
  profile: string
  profileName: string
  lifesWork: string
  evolution: string
  radiance: string
  purpose: string
}

export interface LifeArcData {
  status: 'ok'
  onceInLifetimeCount: number
  rareCount: number
  heavy: LifeArcHeavyWindow[]
  hd: LifeArcHDContext | null
  signature: string
  /** Present iff the stored read's signature matches the live one. */
  cachedRead: string | null
  headline: string
  fallback: string
}

export type LifeArcResult =
  | LifeArcData
  | { status: 'no-chart' }
  | { status: 'quiet' }

function buildSignature(heavy: LifeArcHeavyWindow[]): string {
  return heavy.map((h) => h.technical).sort().join('|')
}

function pluralCurrents(n: number): string {
  return n === 1 ? 'current' : 'currents'
}

function buildHeadline(onceCount: number, rareCount: number): string {
  if (onceCount > 0 && rareCount > 0) {
    const rarePart =
      rareCount === 1
        ? 'a rare one'
        : `${spell(rareCount).toLowerCase()} rare ${pluralCurrents(rareCount)}`
    return `${spell(onceCount)} once-in-a-lifetime ${pluralCurrents(onceCount)} and ${rarePart} are active at once`
  }
  if (onceCount > 0) {
    return `${spell(onceCount)} once-in-a-lifetime ${pluralCurrents(onceCount)} ${onceCount === 1 ? 'is' : 'are'} active right now`
  }
  return `${spell(rareCount)} rare ${pluralCurrents(rareCount)} ${rareCount === 1 ? 'is' : 'are'} active right now`
}

function spell(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  return words[n] ?? String(n)
}

function buildFallback(heavy: LifeArcHeavyWindow[]): string {
  const planets = Array.from(new Set(heavy.map((h) => h.planet)))
  const planetList =
    planets.length === 1
      ? planets[0]
      : planets.length === 2
        ? `${planets[0]} and ${planets[1]}`
        : `${planets.slice(0, -1).join(', ')}, and ${planets[planets.length - 1]}`
  return `${planetList} ${planets.length === 1 ? 'is' : 'are'} each touching your chart at once. These are the slowest movers in the sky — this exact configuration won't return in your lifetime.`
}

export async function getLifeArc(date: string, supabaseUserId: string): Promise<LifeArcResult> {
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

  const year = Number.parseInt(date.slice(0, 4), 10)
  const { data: cached } = await admin
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', supabaseUserId)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cached?.data as unknown as YearEphemeris | null) ?? null
  if (!ephemeris) return { status: 'no-chart' }

  const timeline = buildSkyTimeline(ephemeris, date)
  const heavy: LifeArcHeavyWindow[] = timeline
    .filter((e: SkyTimelineEntry) => e.status === 'active' && HEAVY_RARITIES.has(e.rarity))
    .map((e) => ({
      technical: e.technical,
      planet: e.planet,
      natalPlanet: e.natalPlanet,
      aspect: e.aspect,
      rarity: e.rarity,
      rarityLabel: e.rarityLabel,
      periodLabel: e.periodLabel,
      durationDays: e.durationDays,
      peakDate: e.peakDate,
      daysFromTodayToEnd: e.daysFromTodayToEnd,
    }))

  if (heavy.length === 0) return { status: 'quiet' }

  const onceInLifetimeCount = heavy.filter((h) => h.rarity === 'once-in-lifetime').length
  const rareCount = heavy.filter((h) => h.rarity === 'rare').length
  const signature = buildSignature(heavy)

  let hd: LifeArcHDContext | null = null
  const chart =
    parseStoredHumanDesign(profile.human_design) ??
    (profile.birth_time && !profile.birth_time_unknown
      ? computeHumanDesign(profile as HumanDesignBirthInput)
      : null)
  if (chart && chart.hasKnownBirthTime) {
    const seq = chart.activationSequence
    hd = {
      type: chart.bodyGraph.type,
      authority: chart.bodyGraph.authority,
      profile: chart.bodyGraph.profile,
      profileName: chart.bodyGraph.profileName,
      lifesWork: seq.lifesWork.shorthand,
      evolution: seq.evolution.shorthand,
      radiance: seq.radiance.shorthand,
      purpose: seq.purpose.shorthand,
    }
  }

  const { data: settings } = await admin
    .from('user_settings')
    .select('season_read, season_read_signature')
    .eq('user_id', supabaseUserId)
    .maybeSingle()

  const cachedRead =
    settings?.season_read && settings.season_read_signature === signature
      ? (settings.season_read as string)
      : null

  return {
    status: 'ok',
    onceInLifetimeCount,
    rareCount,
    heavy,
    hd,
    signature,
    cachedRead,
    headline: buildHeadline(onceInLifetimeCount, rareCount),
    fallback: buildFallback(heavy),
  }
}
