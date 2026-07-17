/**
 * lib/human-design.ts
 *
 * Service layer over the locked math layer at lib/ephemeris/human-design/*.
 *
 * Responsibilities:
 *  - Compute a fresh BodyGraph + Gene Keys chart from BirthData
 *  - Serialize / reconstitute the chart against the user_profiles.human_design
 *    JSONB column
 *  - Decide when a stored chart needs to be recomputed (methodology version
 *    bump, missing fields, birth-data drift)
 *
 * Voice principle (carry forward from feedback_hd_voice.md): nothing in this
 * file should imply HD authority. It's a tool the user is using to think with.
 * Edge cases stay first-class because silent disagreement with MyBodyGraph
 * would erode trust on first contact.
 */

import { computeDesignAndPersonality } from '@/lib/ephemeris/human-design/design-chart'
import { deriveBodyGraph } from '@/lib/ephemeris/human-design/bodygraph'
import { deriveActivationSequence } from '@/lib/ephemeris/human-design/gene-keys'
import type { BirthData } from '@/lib/ephemeris'
import type {
  ChartActivations,
  EdgeCase,
} from '@/lib/ephemeris/human-design/design-chart'
import type { BodyGraph } from '@/lib/ephemeris/human-design/bodygraph'
import type { ActivationSequence } from '@/lib/ephemeris/human-design/gene-keys'
import type {
  AspectType,
  EphemerisDay,
  LunarPhase,
  MoonPhaseEvent,
  Planet,
  Transit,
  YearEphemeris,
  ZodiacSign,
} from '@/types/blueprint'

/**
 * Methodology version. Bump whenever the math layer changes in a way that
 * could move a user's gates (anchor longitude, lunar-node calc, Pluto source,
 * gate-wheel ordering). Stored charts with `version < CURRENT_VERSION` are
 * treated as stale and recomputed on next access.
 *
 * Version history:
 *  1 — 2026-05-10. Anchor 302.25°, true lunar node (Meeus 47.7 first 5 terms),
 *      Pluto via astronomia.pluto.astrometric, canonical Rave Mandala wheel,
 *      edge-proximity flag at 0.2° threshold.
 */
export const HUMAN_DESIGN_METHODOLOGY_VERSION = 1

export interface HumanDesignChart {
  version: number
  computedAt: string
  hasKnownBirthTime: boolean
  personality: ChartActivations
  design: ChartActivations
  bodyGraph: BodyGraph
  activationSequence: ActivationSequence
  edgeCases: EdgeCase[]
}

/**
 * Inputs needed to compute HD. Mirrors the shape stored on user_profiles so
 * the call site can pass the row directly.
 */
export interface HumanDesignBirthInput {
  birth_date: string | null
  birth_time: string | null
  birth_time_unknown: boolean | null
  birth_tz: string | null
  birth_lat: number | null
  birth_lng: number | null
}

/**
 * Returns null when the profile lacks the minimum data to compute HD
 * (date + coords). Time may be unknown — we still produce a chart, but the
 * caller is responsible for surfacing the heavy uncertainty banner (see A5).
 */
export function computeHumanDesign(
  input: HumanDesignBirthInput,
): HumanDesignChart | null {
  if (!input.birth_date || input.birth_lat == null || input.birth_lng == null) {
    return null
  }

  const timeUnknown = input.birth_time_unknown ?? false
  const birth: BirthData = {
    date: input.birth_date,
    time: input.birth_time ?? null,
    timezone: input.birth_tz ?? null,
    lat: input.birth_lat,
    lng: input.birth_lng,
    timeUnknown,
  }

  const { personality, design, edgeCases } = computeDesignAndPersonality(birth)
  const bodyGraph = deriveBodyGraph(personality, design)
  const activationSequence = deriveActivationSequence(personality, design)

  return {
    version: HUMAN_DESIGN_METHODOLOGY_VERSION,
    computedAt: new Date().toISOString(),
    hasKnownBirthTime: !timeUnknown && !!input.birth_time,
    personality,
    design,
    bodyGraph,
    activationSequence,
    edgeCases,
  }
}

/**
 * Type guard for a stored JSON payload. Treats anything missing a known
 * structural field as invalid (forces recompute).
 */
export function parseStoredHumanDesign(value: unknown): HumanDesignChart | null {
  if (!value || typeof value !== 'object') return null
  const chart = value as Partial<HumanDesignChart>
  if (
    typeof chart.version !== 'number' ||
    typeof chart.computedAt !== 'string' ||
    !chart.personality ||
    !chart.design ||
    !chart.bodyGraph ||
    !chart.activationSequence ||
    !Array.isArray(chart.edgeCases)
  ) {
    return null
  }
  return chart as HumanDesignChart
}

/**
 * True when the stored chart should be re-derived: either it's missing
 * outright, malformed, or computed under an older methodology version.
 */
export function isHumanDesignStale(value: unknown): boolean {
  const chart = parseStoredHumanDesign(value)
  if (!chart) return true
  return chart.version < HUMAN_DESIGN_METHODOLOGY_VERSION
}

// ─── Display helpers ─────────────────────────────────────────────────────

const CENTER_LABELS: Record<string, string> = {
  head: 'Head',
  ajna: 'Ajna',
  throat: 'Throat',
  g: 'G / Identity',
  heart: 'Heart / Will',
  spleen: 'Spleen',
  sacral: 'Sacral',
  solarPlexus: 'Solar Plexus',
  root: 'Root',
}

export function centerLabel(center: string): string {
  return CENTER_LABELS[center] ?? center
}

/**
 * Human-readable summary for a single edge-case activation. Used by the
 * nudge UI — phrased as a soft "double-check" not a "we got it wrong."
 */
export function describeEdgeCase(edge: EdgeCase): string {
  const sideLabel = edge.side === 'personality' ? 'Personality' : 'Design'
  return `${sideLabel} ${edge.key} — Gate ${edge.gate}.${edge.line} (within ${edge.boundaryDistance.toFixed(2)}° of a boundary)`
}

// ─── Plain-English daily summary ─────────────────────────────────────────
//
// Goal: a dashboard hero anyone can read without knowing astrology or HD.
// Every technical concept is paired with a 1-line layman's translation so
// the user can pick up the language gradually instead of being blocked by
// it. Voice rule (feedback_hd_voice.md): we're a tool the user is using to
// think with, not an oracle proving its expertise.

const MOON_PHASE_PLAIN: Record<LunarPhase, { mood: string; verb: string }> = {
  new: { mood: 'fresh and quiet', verb: 'plant something small' },
  'waxing-crescent': { mood: 'early momentum', verb: 'give the new thing traction' },
  'first-quarter': { mood: 'push through resistance', verb: 'commit to the harder yes' },
  'waxing-gibbous': { mood: 'refining and almost there', verb: 'tighten what is already moving' },
  full: { mood: 'peak and visible', verb: 'see clearly, then release' },
  'waning-gibbous': { mood: 'harvest and integrate', verb: 'gather what worked' },
  'last-quarter': { mood: 'clearing and editing', verb: 'cut what is no longer useful' },
  'waning-crescent': { mood: 'low and resting', verb: 'rest, do not start' },
}

const MOON_PHASE_DAILY_MOVES: Record<LunarPhase, string[]> = {
  new: [
    'name the intention before you try to act on it',
    'protect one clean beginning from too many opinions',
    'start with the smallest version that still feels true',
  ],
  'waxing-crescent': [
    'give one new thread enough attention to catch',
    'feed the thing that is already showing a little life',
    'choose traction over a perfect plan',
  ],
  'first-quarter': [
    'take the step that proves the intention is real',
    'meet resistance directly, then simplify the next move',
    'commit to the useful challenge, not the dramatic one',
  ],
  'waxing-gibbous': [
    'refine what is working before asking it to carry more',
    'tighten the draft, system, or promise already in motion',
    'make one practical improvement instead of reopening the whole question',
  ],
  full: [
    'let the obvious thing be obvious before you respond',
    'notice what has become visible, then decide what deserves your energy',
    'separate real clarity from emotional volume',
  ],
  'waning-gibbous': [
    'turn what you learned into something usable',
    'share the lesson without forcing a conclusion',
    'integrate the result before chasing the next signal',
  ],
  'last-quarter': [
    'edit the plan where it has become heavier than helpful',
    'release one obligation that no longer matches the direction',
    'make the clean cut that gives the next week more room',
  ],
  'waning-crescent': [
    'close one small loop and leave the rest unforced',
    'protect recovery before adding anything new',
    'let quiet be productive by noticing what has lost charge',
  ],
}

const SIGN_PLAIN: Record<ZodiacSign, string> = {
  Aries: 'direct and action-oriented',
  Taurus: 'steady, sensory, slow',
  Gemini: 'mental, social, scattered',
  Cancer: 'emotional and inward',
  Leo: 'expressive and warm',
  Virgo: 'practical, detail-focused',
  Libra: 'relational and balancing',
  Scorpio: 'intense and depth-seeking',
  Sagittarius: 'expansive and big-picture',
  Capricorn: 'structured and disciplined',
  Aquarius: 'cool, future-leaning',
  Pisces: 'dreamy and emotional',
}

export const ASPECT_PLAIN: Record<AspectType, { tone: 'tense' | 'easy' | 'neutral'; plain: string }> = {
  conjunction: { tone: 'neutral', plain: 'merging — energies intensify together' },
  square: { tone: 'tense', plain: 'friction — something needs working through' },
  opposition: { tone: 'tense', plain: 'polarity — two sides asking to be seen' },
  trine: { tone: 'easy', plain: 'flowing — easy support, almost too easy to notice' },
  sextile: { tone: 'easy', plain: 'opportunity — a small opening worth taking' },
}

// ─── Placement explanations (Sky Portrait click panel) ──────────────────

const PLANET_MEANING: Record<Planet, { short: string; long: string }> = {
  Sun: {
    short: 'core identity, vitality',
    long: 'Your core identity. The version of you most alive when you feel like yourself.',
  },
  Moon: {
    short: 'emotional needs, what feels like home',
    long: 'Your emotional needs and what makes you feel safe. The inner weather underneath everything.',
  },
  Mercury: {
    short: 'how your mind moves',
    long: 'How your mind moves — the way you think, learn, write, talk, and decide.',
  },
  Venus: {
    short: 'how you love, what you find beautiful',
    long: 'How you love and what you find beautiful. Your taste, your closeness, the way you receive.',
  },
  Mars: {
    short: 'how you act, what you fight for',
    long: 'The engine of action and desire — how you push, fight, want, pursue.',
  },
  Jupiter: {
    short: 'how you grow, what you believe',
    long: 'How you grow and what you have faith in. Where life feels expansive and generous.',
  },
  Saturn: {
    short: 'how you structure your life, where you face limits',
    long: 'Where you build mastery the hard way. The structure, the limits, the work that earns it.',
  },
  Uranus: {
    short: 'how you break free, what makes you different',
    long: 'Where you break the mold. The part of you that refuses to fit and brings something new.',
  },
  Neptune: {
    short: 'where you dissolve, what calls you upward',
    long: 'Where you dissolve into something bigger than yourself — dreams, art, mystery, longing.',
  },
  Pluto: {
    short: 'where you transform',
    long: 'Where the deepest cycles of death and rebirth play out across years and decades.',
  },
}

export const HOUSE_MEANING: Record<number, { short: string; long: string }> = {
  1:  { short: 'self, body, first impression',                long: 'How you show up — your body, your style, the way you enter a room.' },
  2:  { short: 'values, resources, self-worth',               long: 'What you value, your resources, your relationship to money and worth.' },
  3:  { short: 'daily mind, siblings, neighborhood',          long: 'Your everyday mind — siblings, short trips, how you communicate at ground level.' },
  4:  { short: 'home, roots, family of origin',               long: 'Your home, your roots, the inner private world you return to.' },
  5:  { short: 'creativity, play, romance',                   long: 'Creativity, play, romance, children — what you make for the joy of making.' },
  6:  { short: 'daily work, health, service',                 long: 'Daily work, health, the routines and craft of refining things.' },
  7:  { short: 'partnerships, one-on-one relationships',      long: 'Partnerships and the people you mirror yourself in — close one-on-one ties.' },
  8:  { short: 'shared resources, depth, transformation',     long: 'Shared resources, deep intimacy, and what only becomes visible underneath the surface.' },
  9:  { short: 'beliefs, philosophy, long journeys',          long: 'Beliefs, big-picture thinking, travel, education — what expands your worldview.' },
  10: { short: 'public role, career, reputation',             long: 'Your public role and reputation — what you become known for in the world.' },
  11: { short: 'community, friends, future vision',           long: 'Community, friendships, the groups you belong to, the future you imagine.' },
  12: { short: 'solitude, dreams, behind the scenes',         long: 'Solitude, dreams, the unconscious — where you slip behind the curtain.' },
}

export interface PlacementExplanation {
  kind: 'natal' | 'transit'
  planet: Planet
  sign: ZodiacSign
  degreeInSign: number
  house?: number
  isRetrograde?: boolean
  planetMeaning: { short: string; long: string }
  signMeaning: string
  houseMeaning?: { short: string; long: string }
  activeAspects: Array<{
    label: string
    plain: string
    aspectColor: 'tense' | 'easy' | 'neutral'
    orb: number
    applying: boolean
  }>
}

interface PlacementExplanationInputs {
  planet: Planet
  sign: ZodiacSign
  degreeInSign: number
  house?: number
  isRetrograde?: boolean
  aspects: Array<{
    planet: Planet
    natalPlanet: Planet
    aspect: AspectType
    orb: number
    applying: boolean
  }>
}

export function buildNatalPlacementExplanation(input: PlacementExplanationInputs): PlacementExplanation {
  const related = input.aspects.filter((a) => a.natalPlanet === input.planet)
  return {
    kind: 'natal',
    planet: input.planet,
    sign: input.sign,
    degreeInSign: input.degreeInSign,
    house: input.house,
    planetMeaning: PLANET_MEANING[input.planet],
    signMeaning: SIGN_PLAIN[input.sign],
    houseMeaning: input.house ? HOUSE_MEANING[input.house] : undefined,
    activeAspects: related.map((a) => ({
      label: `${a.planet} ${a.aspect}`,
      plain: ASPECT_PLAIN[a.aspect].plain,
      aspectColor: ASPECT_PLAIN[a.aspect].tone,
      orb: a.orb,
      applying: a.applying,
    })),
  }
}

export function buildTransitPlacementExplanation(input: PlacementExplanationInputs): PlacementExplanation {
  const related = input.aspects.filter((a) => a.planet === input.planet)
  return {
    kind: 'transit',
    planet: input.planet,
    sign: input.sign,
    degreeInSign: input.degreeInSign,
    isRetrograde: input.isRetrograde,
    planetMeaning: PLANET_MEANING[input.planet],
    signMeaning: SIGN_PLAIN[input.sign],
    activeAspects: related.map((a) => ({
      label: `${a.aspect} natal ${a.natalPlanet}`,
      plain: ASPECT_PLAIN[a.aspect].plain,
      aspectColor: ASPECT_PLAIN[a.aspect].tone,
      orb: a.orb,
      applying: a.applying,
    })),
  }
}

function tightestTransit(day: EphemerisDay) {
  if (day.transits.length === 0) return null
  return [...day.transits].sort((a, b) => a.orb - b.orb)[0]
}

function dailyMoveForMoon(day: EphemerisDay) {
  const moves = MOON_PHASE_DAILY_MOVES[day.moon.lunarPhase]
  const dayNumber = Number.parseInt(day.date.slice(8, 10), 10)
  const moonDegree = Math.floor(day.moon.degree)
  return moves[(dayNumber + moonDegree) % moves.length]
}

function moonDegreeBand(degree: number) {
  if (degree < 10) return 'early'
  if (degree < 20) return 'mid'
  return 'late'
}

function lunarDayNumber(today: string, moonPhases: MoonPhaseEvent[]): number | null {
  const prior = moonPhases
    .filter((p) => p.phase === 'new' && p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!prior) return null
  const t = new Date(`${today}T12:00:00Z`).getTime()
  const n = new Date(`${prior.date}T12:00:00Z`).getTime()
  return Math.max(0, Math.min(27, Math.round((t - n) / 86_400_000)))
}

/**
 * Plain-English 2–3 sentence summary of today, anchored to:
 *   1. The Moon (phase + sign) → mood of the day
 *   2. The tightest transit if any → qualifier (tense / easy / neutral)
 *   3. The user's Type → one-line "so for you that means..."
 *
 * No astrology jargon in the body — sign and phase names appear only as
 * adjectives ("dreamy Pisces Moon") so the user picks up the words
 * organically without needing a glossary.
 */
export function buildPlainDailySummary(
  day: EphemerisDay,
): string {
  const moon = MOON_PHASE_PLAIN[day.moon.lunarPhase]
  const signMood = SIGN_PLAIN[day.moon.sign]
  const moonMoveClause = ` At ${Math.round(day.moon.illumination * 100)}% light and ${moonDegreeBand(day.moon.degree)} in the sign, the practical move is to ${dailyMoveForMoon(day)}.`
  const moonClause = `The day's mood is ${moon.mood} — a ${signMood} ${day.moon.sign} Moon.`

  const tt = tightestTransit(day)
  const transitClause = (() => {
    if (!tt) return ''
    const meta = ASPECT_PLAIN[tt.aspect]
    if (tt.orb > 1.5) return ''
    if (meta.tone === 'tense') return ` There's some friction in the background (your natal ${tt.natalPlanet} is being pressed by ${tt.planet}).`
    if (meta.tone === 'easy') return ` A quiet support is in the background (${tt.planet} is in flow with your natal ${tt.natalPlanet}).`
    return ` A long, slow current is active (${tt.planet} merging with your natal ${tt.natalPlanet}).`
  })()

  return `${moonClause}${moonMoveClause}${transitClause}`
}

/**
 * Structured "signals" for a chip strip below the summary. Each signal
 * carries the technical value (what astrology/HD says it is) *and* the
 * plain-English translation (what it means for the user's day).
 *
 * The user sees both — technical line as a small heading, plain line as
 * the readable body — so over time the vocabulary clicks without ever
 * being a comprehension blocker today.
 */
export interface DailySignal {
  key: string
  label: string
  technical: string
  plain: string
}

// ─── Sky timeline (rarity + active/upcoming transits) ───────────────────
//
// The dashboard hero answers "what's happening today?" The timeline below
// answers "how rare is this, and when do similar moments arrive next?"
// Rarity is classified by the transiting planet's orbital period: a Pluto
// aspect to one of your natal points repeats once in centuries, a Mercury
// aspect repeats a few times a year. That single label re-anchors a user's
// attention toward outer-planet transits that actually shape a life.

export type TransitRarity = 'common' | 'frequent' | 'uncommon' | 'rare' | 'once-in-lifetime'

const PLANET_RARITY: Record<Planet, { rarity: TransitRarity; periodLabel: string }> = {
  Sun: { rarity: 'frequent', periodLabel: 'about once a year' },
  Moon: { rarity: 'common', periodLabel: 'every few weeks' },
  Mercury: { rarity: 'frequent', periodLabel: '2–4 times a year' },
  Venus: { rarity: 'frequent', periodLabel: '2–4 times a year' },
  Mars: { rarity: 'uncommon', periodLabel: 'every year or two' },
  Jupiter: { rarity: 'uncommon', periodLabel: 'roughly every 12 years' },
  Saturn: { rarity: 'rare', periodLabel: 'roughly every 29 years' },
  Uranus: { rarity: 'once-in-lifetime', periodLabel: 'once or twice in a lifetime' },
  Neptune: { rarity: 'once-in-lifetime', periodLabel: 'once in a lifetime' },
  Pluto: { rarity: 'once-in-lifetime', periodLabel: 'once in a lifetime' },
}

const RARITY_LABEL: Record<TransitRarity, string> = {
  common: 'Common',
  frequent: 'Frequent',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'once-in-lifetime': 'Once in a lifetime',
}

export interface SkyTimelineEntry {
  status: 'active' | 'upcoming'
  planet: Planet
  natalPlanet: Planet
  aspect: AspectType
  startDate: string             // YYYY-MM-DD — first day in orb-of-influence window
  endDate: string               // YYYY-MM-DD — last day in window
  peakDate: string              // YYYY-MM-DD — day of exact (tightest orb)
  peakOrb: number               // degrees
  durationDays: number          // total days the window spans
  daysFromTodayToStart: number  // 0 for active (already started), positive for upcoming
  daysFromTodayToEnd: number    // positive while window is still active
  technical: string             // "Pluto opposition natal Moon"
  plain: string
  rarity: TransitRarity
  rarityLabel: string
  periodLabel: string
}

function transitKey(t: Pick<Transit, 'planet' | 'natalPlanet' | 'aspect'>): string {
  return `${t.planet}|${t.natalPlanet}|${t.aspect}`
}

function plainTransitMeaning(t: Pick<Transit, 'planet' | 'natalPlanet' | 'aspect'>): string {
  const aspect = ASPECT_PLAIN[t.aspect]
  const rare = PLANET_RARITY[t.planet].rarity
  const heavy = rare === 'rare' || rare === 'once-in-lifetime'
  const subject = heavy ? 'A long, slow' : 'A'
  const action = aspect.tone === 'tense'
    ? `tension between ${t.planet} and your natal ${t.natalPlanet}`
    : aspect.tone === 'easy'
      ? `support flowing from ${t.planet} to your natal ${t.natalPlanet}`
      : `merging of ${t.planet} with your natal ${t.natalPlanet}`
  return `${subject} ${action}. ${aspect.plain.charAt(0).toUpperCase()}${aspect.plain.slice(1)}.`
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(`${a}T12:00:00Z`).getTime()
  const tb = new Date(`${b}T12:00:00Z`).getTime()
  return Math.round((tb - ta) / 86_400_000)
}

/**
 * Builds the dashboard's "Sky timeline" — outer-planet transit *windows*
 * grouped from per-day data within the orb of influence (default ≤ 3°).
 *
 * Each unique (transit planet, natal planet, aspect) triple produces one
 * window with start/peak/end dates and duration in days. A "transit" in
 * the astrological sense is a window of months for outer planets — Pluto
 * across a natal point can take 2+ years — and that duration is the unit
 * that actually matters for planning.
 *
 * Status:
 *  - 'active'   — window contains today (start ≤ today ≤ end)
 *  - 'upcoming' — start > today, but window still falls inside the plan year
 *  - past windows are dropped
 *
 * Limitations:
 *  - Windows are bounded by the plan year, so a Pluto transit that began
 *    last year shows its in-year start (Jan 1) not its real start.
 *  - Retrograde double/triple-passes are merged into one window if the
 *    orb never widens past the threshold between passes — generally true
 *    for the slowest planets, exactly the cases where this matters.
 *  - Multi-year past/future occurrence lookup is still v2.
 */
export function buildSkyTimeline(
  ephemeris: YearEphemeris,
  today: string,
  options: { orbThreshold?: number } = {},
): SkyTimelineEntry[] {
  const orbThreshold = options.orbThreshold ?? 3

  // Collect every per-day (planet, natalPlanet, aspect) hit inside orb
  const groups = new Map<string, Transit[]>()
  for (const day of ephemeris.days) {
    for (const t of day.transits) {
      if (t.orb > orbThreshold) continue
      const key = transitKey(t)
      const arr = groups.get(key) ?? []
      arr.push(t)
      groups.set(key, arr)
    }
  }

  const entries: SkyTimelineEntry[] = []
  for (const transits of groups.values()) {
    if (transits.length === 0) continue
    const byDate = [...transits].sort((a, b) => a.date.localeCompare(b.date))
    const start = byDate[0].date
    const end = byDate[byDate.length - 1].date
    const peak = [...transits].sort((a, b) => a.orb - b.orb)[0]

    let status: 'active' | 'upcoming' | 'past'
    if (start <= today && today <= end) status = 'active'
    else if (start > today) status = 'upcoming'
    else status = 'past'
    if (status === 'past') continue

    const first = byDate[0]
    entries.push({
      status,
      planet: first.planet,
      natalPlanet: first.natalPlanet,
      aspect: first.aspect,
      startDate: start,
      endDate: end,
      peakDate: peak.date,
      peakOrb: peak.orb,
      durationDays: daysBetween(start, end) + 1,
      daysFromTodayToStart: Math.max(0, daysBetween(today, start)),
      daysFromTodayToEnd: daysBetween(today, end),
      technical: `${first.planet} ${first.aspect} natal ${first.natalPlanet}`,
      plain: plainTransitMeaning(first),
      rarity: PLANET_RARITY[first.planet].rarity,
      rarityLabel: RARITY_LABEL[PLANET_RARITY[first.planet].rarity],
      periodLabel: PLANET_RARITY[first.planet].periodLabel,
    })
  }

  const rarityWeight: Record<TransitRarity, number> = {
    'once-in-lifetime': 0,
    rare: 1,
    uncommon: 2,
    frequent: 3,
    common: 4,
  }
  return entries.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    const rw = rarityWeight[a.rarity] - rarityWeight[b.rarity]
    if (rw !== 0) return rw
    if (a.status === 'active') return a.daysFromTodayToEnd - b.daysFromTodayToEnd
    return a.daysFromTodayToStart - b.daysFromTodayToStart
  })
}

export function buildDailySignals(
  chart: HumanDesignChart | null,
  day: EphemerisDay,
  moonPhases: MoonPhaseEvent[],
): DailySignal[] {
  const signals: DailySignal[] = []

  // Moon
  const moon = MOON_PHASE_PLAIN[day.moon.lunarPhase]
  signals.push({
    key: 'moon',
    label: 'Moon',
    technical: `${day.moon.lunarPhase.replace(/-/g, ' ')} in ${day.moon.sign} (${Math.round(day.moon.illumination * 100)}%)`,
    plain: `${moon.mood.charAt(0).toUpperCase() + moon.mood.slice(1)}: ${dailyMoveForMoon(day)}.`,
  })

  // Tightest transit (if any inside meaningful orb)
  const tt = tightestTransit(day)
  if (tt && tt.orb <= 2) {
    const meta = ASPECT_PLAIN[tt.aspect]
    signals.push({
      key: 'transit',
      label: 'Sky',
      technical: `${tt.planet} ${tt.aspect} natal ${tt.natalPlanet} (${tt.orb.toFixed(1)}°)`,
      plain: meta.plain,
    })
  }

  // Reflectors get a lunar-day counter because it changes with the Moon.
  if (chart?.bodyGraph.type === 'Reflector') {
    const ld = lunarDayNumber(day.date, moonPhases)
    if (ld !== null) {
      signals.push({
        key: 'lunar-day',
        label: 'Lunar day',
        technical: `Day ${ld + 1} of 28`,
        plain: ld < 7
          ? 'Early in your cycle — sample energy, do not commit.'
          : ld < 14
            ? 'Building phase — notice what consistently feels true.'
            : ld < 21
              ? 'Past the full moon — you have most of the information now.'
              : 'Closing phase — clarity may surface before the next new moon.',
      })
    }
  }

  return signals
}
