import { GATE_TO_CENTER, type Center } from './ephemeris/human-design/bodygraph.ts'

export const TRANSIT_PLANETS = [
  'sun',
  'earth',
  'moon',
  'northNode',
  'southNode',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const

export type TransitPlanet = (typeof TRANSIT_PLANETS)[number]

// "fast" planets change gate every few days and drive the daily card.
// "slow" planets can sit on a single gate for weeks to months — they
// drive the separate "holding" card instead, so a months-long Saturn
// transit doesn't get re-announced as if it were news every morning.
export const TRANSIT_PLANET_META: Record<
  TransitPlanet,
  { label: string; glyph: string; weight: number; cadence: 'fast' | 'slow' }
> = {
  sun: { label: 'Sun', glyph: '☉', weight: 100, cadence: 'fast' },
  earth: { label: 'Earth', glyph: '⊕', weight: 96, cadence: 'fast' },
  moon: { label: 'Moon', glyph: '☽', weight: 54, cadence: 'fast' },
  northNode: { label: 'North Node', glyph: '☊', weight: 82, cadence: 'slow' },
  southNode: { label: 'South Node', glyph: '☋', weight: 80, cadence: 'slow' },
  mercury: { label: 'Mercury', glyph: '☿', weight: 64, cadence: 'fast' },
  venus: { label: 'Venus', glyph: '♀', weight: 68, cadence: 'fast' },
  mars: { label: 'Mars', glyph: '♂', weight: 70, cadence: 'fast' },
  jupiter: { label: 'Jupiter', glyph: '♃', weight: 92, cadence: 'slow' },
  saturn: { label: 'Saturn', glyph: '♄', weight: 90, cadence: 'slow' },
  uranus: { label: 'Uranus', glyph: '♅', weight: 88, cadence: 'slow' },
  neptune: { label: 'Neptune', glyph: '♆', weight: 86, cadence: 'slow' },
  pluto: { label: 'Pluto', glyph: '♇', weight: 84, cadence: 'slow' },
}

const CENTER_LABEL: Record<Center, string> = {
  head: 'Head',
  ajna: 'Ajna',
  throat: 'Throat',
  g: 'G Center',
  heart: 'Heart',
  spleen: 'Spleen',
  sacral: 'Sacral',
  solarPlexus: 'Solar Plexus',
  root: 'Root',
}

export interface HumanDesignChannelDefinition {
  gates: readonly [number, number]
  name: string
}

/**
 * Transit-side channel lookup. The locked natal BodyGraph engine keeps its
 * channel table private, so this read-only mirror lets us compare a current
 * gate with a natal hanging gate without changing the chart math.
 */
export const HUMAN_DESIGN_CHANNELS: readonly HumanDesignChannelDefinition[] = [
  { gates: [1, 8], name: 'Inspiration' },
  { gates: [2, 14], name: 'Beat / Keeper of the Keys' },
  { gates: [3, 60], name: 'Mutation' },
  { gates: [4, 63], name: 'Logic' },
  { gates: [5, 15], name: 'Rhythm' },
  { gates: [6, 59], name: 'Mating' },
  { gates: [7, 31], name: 'Alpha' },
  { gates: [9, 52], name: 'Concentration' },
  { gates: [10, 20], name: 'Awakening' },
  { gates: [10, 34], name: 'Exploration' },
  { gates: [10, 57], name: 'Perfected Form' },
  { gates: [11, 56], name: 'Curiosity' },
  { gates: [12, 22], name: 'Openness' },
  { gates: [13, 33], name: 'The Prodigal' },
  { gates: [16, 48], name: 'Wavelength' },
  { gates: [17, 62], name: 'Acceptance' },
  { gates: [18, 58], name: 'Judgment' },
  { gates: [19, 49], name: 'Synthesis' },
  { gates: [20, 34], name: 'Charisma' },
  { gates: [20, 57], name: 'Brain Wave' },
  { gates: [21, 45], name: 'Money' },
  { gates: [23, 43], name: 'Structuring' },
  { gates: [24, 61], name: 'Awareness' },
  { gates: [25, 51], name: 'Initiation' },
  { gates: [26, 44], name: 'Surrender' },
  { gates: [27, 50], name: 'Preservation' },
  { gates: [28, 38], name: 'Struggle' },
  { gates: [29, 46], name: 'Discovery' },
  { gates: [30, 41], name: 'Recognition' },
  { gates: [32, 54], name: 'Transformation' },
  { gates: [34, 57], name: 'Power' },
  { gates: [35, 36], name: 'Transitoriness' },
  { gates: [37, 40], name: 'Community' },
  { gates: [39, 55], name: 'Emoting' },
  { gates: [42, 53], name: 'Maturation' },
  { gates: [47, 64], name: 'Abstraction' },
] as const

export interface LiveHumanDesignGate {
  planet: TransitPlanet
  planetLabel: string
  planetGlyph: string
  gate: number
  line: number
  longitude: number
  zodiacSign: string
  degreeInSign: number
  theme: string
  shadow: string
  boundarySensitive: boolean
}

export interface NatalDesignForTransits {
  hasKnownBirthTime: boolean
  type: string
  authority: string
  activatedGates: number[]
  definedCenters: Center[]
}

export type HumanDesignWeatherConnectionKind =
  | 'channel-completion'
  | 'natal-resonance'
  | 'collective-weather'

export interface HumanDesignWeatherFocus {
  kind: HumanDesignWeatherConnectionKind
  activation: LiveHumanDesignGate
  natalGate?: number
  channel?: HumanDesignChannelDefinition
}

export type HumanDesignWeatherPersonalization =
  | 'personalized'
  | 'missing-chart'
  | 'unknown-birth-time'

export interface HumanDesignWeatherCard {
  focus: HumanDesignWeatherFocus
  headline: string
  detail: string
  technicalDetail: string
  boundaryNote: string | null
}

export interface HumanDesignTransitWeather {
  generatedAt: string
  personalization: HumanDesignWeatherPersonalization
  activations: LiveHumanDesignGate[]
  body: {
    type: string
    authority: string
  } | null
  guidance: string
  // The fast-moving (Sun/Earth/Moon/Mercury/Venus/Mars) signal — this is
  // what should change day to day.
  today: HumanDesignWeatherCard
  // A slow planet (Jupiter..Pluto, the Nodes) currently completing or
  // repeating a natal gate. Null when there's no personal slow-planet
  // connection worth surfacing separately from `today` — collective
  // slow-planet weather isn't differentiated enough to earn its own card.
  holding: HumanDesignWeatherCard | null
}

interface RankedFocus extends HumanDesignWeatherFocus {
  score: number
}

function partnerGate(channel: HumanDesignChannelDefinition, gate: number): number | null {
  if (channel.gates[0] === gate) return channel.gates[1]
  if (channel.gates[1] === gate) return channel.gates[0]
  return null
}

function focusScore(
  kind: HumanDesignWeatherConnectionKind,
  activation: LiveHumanDesignGate,
): number {
  const kindWeight =
    kind === 'channel-completion' ? 2_000 : kind === 'natal-resonance' ? 1_000 : 0
  const boundaryPenalty = activation.boundarySensitive ? 300 : 0
  return kindWeight + TRANSIT_PLANET_META[activation.planet].weight - boundaryPenalty
}

/**
 * Selects one legible signal from the full current transit field.
 *
 * Priority:
 *  1. A transit gate that completes a natal hanging gate.
 *  2. A transit gate that repeats/amplifies a natal gate.
 *  3. The current Sun gate as collective weather.
 */
export function selectHumanDesignWeatherFocus(
  activations: LiveHumanDesignGate[],
  natal: NatalDesignForTransits | null,
): HumanDesignWeatherFocus {
  const sun = activations.find((activation) => activation.planet === 'sun') ?? activations[0]
  if (!sun) throw new Error('Human Design transit weather requires at least one activation.')

  if (!natal?.hasKnownBirthTime) {
    return { kind: 'collective-weather', activation: sun }
  }

  const natalGates = new Set(natal.activatedGates)
  const candidates: RankedFocus[] = []

  for (const activation of activations) {
    for (const channel of HUMAN_DESIGN_CHANNELS) {
      const natalGate = partnerGate(channel, activation.gate)
      if (
        natalGate !== null &&
        natalGates.has(natalGate) &&
        !natalGates.has(activation.gate)
      ) {
        candidates.push({
          kind: 'channel-completion',
          activation,
          natalGate,
          channel,
          score: focusScore('channel-completion', activation),
        })
      }
    }

    if (natalGates.has(activation.gate)) {
      candidates.push({
        kind: 'natal-resonance',
        activation,
        score: focusScore('natal-resonance', activation),
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  if (!best) return { kind: 'collective-weather', activation: sun }

  const { score: _score, ...focus } = best
  return focus
}

function centerNote(natal: NatalDesignForTransits | null, gate: number): string | null {
  if (!natal) return null
  const center = GATE_TO_CENTER[gate]
  if (!center) return null
  const label = CENTER_LABEL[center]
  const defined = natal.definedCenters.includes(center)
  return defined
    ? `It lands in your defined ${label}, a center you're built to hold steady.`
    : `It lands in your open ${label}, where you don't carry a fixed setting.`
}

function buildDetail(
  focus: HumanDesignWeatherFocus,
  natal: NatalDesignForTransits | null,
  register: 'today' | 'holding',
): string {
  const { activation } = focus
  const note = centerNote(natal, activation.gate)
  const timeWord = register === 'today' ? 'right now' : 'this stretch'

  if (focus.kind === 'channel-completion' && focus.channel && focus.natalGate) {
    const base = `${activation.planetLabel} is completing a channel with your natal design, moving out of ${activation.shadow.toLowerCase()} toward ${activation.theme.toLowerCase()} ${timeWord}.`
    return note ? `${base} ${note}` : base
  }

  if (focus.kind === 'natal-resonance') {
    const base = `${activation.planetLabel} is repeating a pattern already active in your natal design — ${activation.theme.toLowerCase()} may feel familiar rather than new.`
    return note ? `${base} ${note}` : base
  }

  return `${activation.planetLabel} is moving through Gate ${activation.gate} for everyone ${timeWord} — ${activation.shadow.toLowerCase()} to ${activation.theme.toLowerCase()} is today's shared pattern, not a statement about your chart.`
}

function buildHeadline(focus: HumanDesignWeatherFocus, register: 'today' | 'holding'): string {
  if (focus.kind === 'channel-completion') {
    return register === 'today'
      ? `${focus.activation.theme} may feel more available right now`
      : `${focus.activation.theme} has been building in the background`
  }
  if (focus.kind === 'natal-resonance') {
    return register === 'today'
      ? `${focus.activation.theme} may feel louder right now`
      : `${focus.activation.theme} has been echoing for a while`
  }
  return register === 'today'
    ? `Today’s shared theme: ${focus.activation.theme}`
    : `The shared backdrop: ${focus.activation.theme}`
}

function buildTechnicalDetail(focus: HumanDesignWeatherFocus, natal: NatalDesignForTransits | null): string {
  const { activation } = focus
  const placement = `${activation.planetGlyph} ${activation.planetLabel} at ${activation.degreeInSign.toFixed(1)}° ${activation.zodiacSign} · Gate ${activation.gate}.${activation.line}`
  const center = GATE_TO_CENTER[activation.gate]
  const centerTag = center
    ? ` · ${CENTER_LABEL[center]}${natal ? ` (${natal.definedCenters.includes(center) ? 'defined' : 'open'} in your chart)` : ''}`
    : ''

  if (focus.kind === 'channel-completion' && focus.channel && focus.natalGate) {
    return `${placement} · connects with your Gate ${focus.natalGate} · Channel ${focus.channel.gates[0]}–${focus.channel.gates[1]}, ${focus.channel.name}${centerTag}`
  }
  if (focus.kind === 'natal-resonance') {
    return `${placement} · repeats a gate in your natal design${centerTag}`
  }
  return `${placement}${centerTag}`
}

function buildCard(
  focus: HumanDesignWeatherFocus,
  natal: NatalDesignForTransits | null,
  register: 'today' | 'holding',
): HumanDesignWeatherCard {
  return {
    focus,
    headline: buildHeadline(focus, register),
    detail: buildDetail(focus, natal, register),
    technicalDetail: buildTechnicalDetail(focus, natal),
    boundaryNote: focus.activation.boundarySensitive
      ? 'This activation is close to a gate boundary; treat the gate and line as provisional.'
      : null,
  }
}

function authorityGuidance(authority: string): string {
  const guidance: Record<string, string> = {
    Emotional:
      'Let your emotional wave settle before deciding; clarity does not have to arrive in the moment.',
    Sacral: 'Notice your immediate gut yes or no before your mind starts explaining it.',
    Splenic: 'Listen for the quiet first instinct; it may be subtle and may not repeat.',
    'Ego-Manifested':
      'Check whether you truly have the will and desire, then inform the people your choice affects.',
    'Ego-Projected':
      'Hear what you genuinely want as you speak it aloud with people you trust.',
    'Self-Projected':
      'Talk it through and listen for the direction that sounds most like you.',
    Mental:
      'Use trusted people and supportive environments as sounding boards; clarity is not meant to happen alone.',
    Lunar: 'Sample the decision across a full lunar cycle before making a lasting commitment.',
  }
  return guidance[authority] ?? `Let your ${authority} Authority—not the intensity of the moment—set the timing.`
}

export function buildHumanDesignTransitWeather(input: {
  generatedAt: Date
  activations: LiveHumanDesignGate[]
  natal: NatalDesignForTransits | null
}): HumanDesignTransitWeather {
  const { generatedAt, activations, natal } = input

  const fastActivations = activations.filter(
    (activation) => TRANSIT_PLANET_META[activation.planet].cadence === 'fast',
  )
  const slowActivations = activations.filter(
    (activation) => TRANSIT_PLANET_META[activation.planet].cadence === 'slow',
  )

  const todayFocus = selectHumanDesignWeatherFocus(
    fastActivations.length ? fastActivations : activations,
    natal,
  )
  const today = buildCard(todayFocus, natal, 'today')

  let holding: HumanDesignWeatherCard | null = null
  if (natal?.hasKnownBirthTime && slowActivations.length) {
    const holdingFocus = selectHumanDesignWeatherFocus(slowActivations, natal)
    // Only worth a separate card when it's a real personal connection, and
    // not just a restatement of what `today` is already showing.
    if (
      holdingFocus.kind !== 'collective-weather' &&
      holdingFocus.activation.gate !== todayFocus.activation.gate
    ) {
      holding = buildCard(holdingFocus, natal, 'holding')
    }
  }

  const personalization: HumanDesignWeatherPersonalization = natal
    ? natal.hasKnownBirthTime
      ? 'personalized'
      : 'unknown-birth-time'
    : 'missing-chart'

  let guidance: string
  if (personalization === 'personalized' && natal) {
    guidance = authorityGuidance(natal.authority)
  } else if (personalization === 'unknown-birth-time') {
    guidance =
      'Because your birth time is uncertain, Kairos is showing the shared weather without making a personal comparison.'
  } else {
    guidance = 'Add your birth details to compare the shared weather with your natal Human Design.'
  }

  return {
    generatedAt: generatedAt.toISOString(),
    personalization,
    activations,
    body:
      personalization === 'personalized' && natal
        ? { type: natal.type, authority: natal.authority }
        : null,
    guidance,
    today,
    holding,
  }
}
