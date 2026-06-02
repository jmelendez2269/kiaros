import { createServerSupabase } from '@/lib/supabase/server'
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
 * lib/today/get-season.ts
 *
 * Gathers everything the /today "season" card needs: the user's
 * currently-active *heavy* transit windows (Saturn + the once-in-a-
 * lifetime outer planets), their Human Design Type, and their Gene
 * Keys spine. The card answers a question the per-day surfaces can't:
 * "what season am I in, and what do you mean I have four once-in-a-
 * lifetime transits at once?"
 *
 * The deterministic half (counts, window list, headline, fallback
 * sentence) always renders. The AI synthesis is generated separately
 * (lib/ai/season-synthesis.ts) and cached on user_settings, keyed by
 * `signature` — the set of active heavy windows. When the live
 * signature matches the stored one, `cachedRead` is returned and no
 * model call is needed; when it drifts, the card refetches.
 */

// Only rare / once-in-a-lifetime windows define a "season". Mars and
// faster planets churn too often to anchor one.
const HEAVY_RARITIES: ReadonlySet<TransitRarity> = new Set(['rare', 'once-in-lifetime'])

export interface SeasonHeavyWindow {
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

export interface SeasonHDContext {
  type: string
  authority: string
  profile: string
  profileName: string
  lifesWork: string
  evolution: string
  radiance: string
  purpose: string
}

export interface SeasonData {
  status: 'ok'
  onceInLifetimeCount: number
  rareCount: number
  heavy: SeasonHeavyWindow[]
  hd: SeasonHDContext | null
  signature: string
  /** Present iff the stored read's signature matches the live one. */
  cachedRead: string | null
  /** Deterministic headline — always safe to render without the model. */
  headline: string
  /** Deterministic one-liner shown until/if the AI read arrives. */
  fallback: string
}

export type SeasonResult =
  | SeasonData
  | { status: 'no-chart' }
  | { status: 'quiet' } // chart present, but no heavy windows active right now

function buildSignature(heavy: SeasonHeavyWindow[]): string {
  // Set membership already changes when a window ends (it drops out of
  // the active list), so the technical names alone are a stable
  // fingerprint of "this configuration".
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
  // rareCount > 0 only
  return `${spell(rareCount)} rare ${pluralCurrents(rareCount)} ${rareCount === 1 ? 'is' : 'are'} active right now`
}

function spell(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  return words[n] ?? String(n)
}

function buildFallback(heavy: SeasonHeavyWindow[]): string {
  const planets = Array.from(new Set(heavy.map((h) => h.planet)))
  const planetList =
    planets.length === 1
      ? planets[0]
      : planets.length === 2
        ? `${planets[0]} and ${planets[1]}`
        : `${planets.slice(0, -1).join(', ')}, and ${planets[planets.length - 1]}`
  return `${planetList} ${planets.length === 1 ? 'is' : 'are'} each touching your chart at once. These are the slowest movers in the sky — this exact configuration won't return in your lifetime.`
}

export async function getSeason(date: string): Promise<SeasonResult> {
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'id, natal_chart, human_design, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng',
    )
    .maybeSingle()

  if (!profile?.id || !profile.natal_chart) {
    return { status: 'no-chart' }
  }

  const year = Number.parseInt(date.slice(0, 4), 10)
  const { data: cached } = await supabase
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', profile.id)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cached?.data as unknown as YearEphemeris | null) ?? null
  if (!ephemeris) return { status: 'no-chart' }

  const timeline = buildSkyTimeline(ephemeris, date)
  const heavy: SeasonHeavyWindow[] = timeline
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

  // Human Design context — reuse the stored chart; only recompute when we
  // have a known birth time (HD is unreliable without one, so we skip the
  // HD layer entirely rather than feed the synthesis a shaky Type).
  let hd: SeasonHDContext | null = null
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

  // Cached read — only valid if the stored signature still matches.
  const { data: settings } = await supabase
    .from('user_settings')
    .select('season_read, season_read_signature')
    .eq('user_id', profile.id)
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
