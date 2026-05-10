/**
 * bodygraph.ts
 *
 * Derives the Human Design BodyGraph summary from the 26 activations
 * (13 Personality + 13 Design):
 *
 *  - Defined Centers (which of the 9 centers are "defined" — coloured-in)
 *  - Activated Channels (which of the 36 channels have both gates activated)
 *  - Type (Manifestor / Generator / Manifesting Generator / Projector / Reflector)
 *  - Authority (Emotional / Sacral / Splenic / Ego-Manifested / Ego-Projected /
 *               Self-Projected / Mental / Lunar)
 *  - Profile (Personality Sun line / Design Sun line — e.g. "5/1")
 *
 * Conventions and notes:
 *
 *  - "Center is defined" iff at least one channel touching that center has
 *    BOTH of its two gates activated (anywhere across the 26 activations).
 *  - The "motors" (Sacral, Solar Plexus, Heart, Root) are required for type
 *    classification; a "motor-to-Throat" connection is what makes a chart
 *    Manifestor-flavoured.
 *  - Reflectors have zero defined centers — extremely rare (~1% of charts).
 */

import type { ChartActivations } from './design-chart'

// ─── Centers ─────────────────────────────────────────────────────────────

export const CENTERS = [
  'head',
  'ajna',
  'throat',
  'g',
  'heart',
  'spleen',
  'sacral',
  'solarPlexus',
  'root',
] as const

export type Center = (typeof CENTERS)[number]

const GATE_TO_CENTER: Record<number, Center> = {
  // Head (3)
  64: 'head', 61: 'head', 63: 'head',
  // Ajna (6)
  47: 'ajna', 24: 'ajna', 4: 'ajna', 17: 'ajna', 43: 'ajna', 11: 'ajna',
  // Throat (11)
  62: 'throat', 23: 'throat', 56: 'throat', 35: 'throat', 12: 'throat',
  45: 'throat', 33: 'throat', 8: 'throat', 31: 'throat', 20: 'throat', 16: 'throat',
  // G (8)
  7: 'g', 1: 'g', 13: 'g', 25: 'g', 10: 'g', 15: 'g', 46: 'g', 2: 'g',
  // Heart (4)
  21: 'heart', 40: 'heart', 26: 'heart', 51: 'heart',
  // Spleen (7)
  48: 'spleen', 57: 'spleen', 44: 'spleen', 50: 'spleen', 32: 'spleen', 28: 'spleen', 18: 'spleen',
  // Sacral (9)
  5: 'sacral', 14: 'sacral', 29: 'sacral', 59: 'sacral', 9: 'sacral',
  3: 'sacral', 42: 'sacral', 27: 'sacral', 34: 'sacral',
  // Solar Plexus (7)
  6: 'solarPlexus', 37: 'solarPlexus', 22: 'solarPlexus', 36: 'solarPlexus',
  30: 'solarPlexus', 55: 'solarPlexus', 49: 'solarPlexus',
  // Root (9)
  53: 'root', 60: 'root', 52: 'root', 19: 'root', 39: 'root',
  41: 'root', 58: 'root', 38: 'root', 54: 'root',
}

// ─── Channels (36 total) ─────────────────────────────────────────────────

interface ChannelDef {
  gates: [number, number]
  name: string
}

const CHANNELS: readonly ChannelDef[] = [
  { gates: [1, 8],   name: 'Inspiration' },
  { gates: [2, 14],  name: 'Beat / Keeper of the Keys' },
  { gates: [3, 60],  name: 'Mutation' },
  { gates: [4, 63],  name: 'Logic' },
  { gates: [5, 15],  name: 'Rhythm' },
  { gates: [6, 59],  name: 'Mating' },
  { gates: [7, 31],  name: 'Alpha' },
  { gates: [9, 52],  name: 'Concentration' },
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

// ─── Types ───────────────────────────────────────────────────────────────

export type HumanDesignType =
  | 'Manifestor'
  | 'Generator'
  | 'Manifesting Generator'
  | 'Projector'
  | 'Reflector'

export type HumanDesignAuthority =
  | 'Emotional'
  | 'Sacral'
  | 'Splenic'
  | 'Ego-Manifested'
  | 'Ego-Projected'
  | 'Self-Projected'
  | 'Mental'
  | 'Lunar'

export interface BodyGraph {
  type: HumanDesignType
  strategy: string
  authority: HumanDesignAuthority
  profile: string                       // e.g. "5/1"
  profileName: string                   // e.g. "Heretic / Investigator"
  signature: string                     // satisfaction / success / peace / surprise
  notSelf: string                       // anger / frustration / bitterness / disappointment
  definedCenters: Center[]
  undefinedCenters: Center[]
  activatedGates: number[]              // sorted unique
  activatedChannels: { gates: [number, number]; name: string }[]
}

// ─── Profile names ───────────────────────────────────────────────────────

const LINE_NAMES = [
  '',                  // 0 placeholder
  'Investigator',      // 1
  'Hermit',            // 2
  'Martyr',            // 3
  'Opportunist',       // 4
  'Heretic',           // 5
  'Role Model',        // 6
] as const

// ─── Type / strategy / signature / not-self ──────────────────────────────

const TYPE_ATTRIBUTES: Record<HumanDesignType, { strategy: string; signature: string; notSelf: string }> = {
  'Manifestor':            { strategy: 'Inform before you act',           signature: 'Peace',        notSelf: 'Anger' },
  'Generator':             { strategy: 'Wait to respond',                  signature: 'Satisfaction', notSelf: 'Frustration' },
  'Manifesting Generator': { strategy: 'Wait to respond, then inform',     signature: 'Satisfaction', notSelf: 'Frustration & Anger' },
  'Projector':             { strategy: 'Wait for the invitation',          signature: 'Success',      notSelf: 'Bitterness' },
  'Reflector':             { strategy: 'Wait a lunar cycle (~28 days)',    signature: 'Surprise',     notSelf: 'Disappointment' },
}

// ─── Public API ──────────────────────────────────────────────────────────

export function deriveBodyGraph(
  personality: ChartActivations,
  design: ChartActivations,
): BodyGraph {
  // Collect all activated gates from both charts
  const activatedGateSet = new Set<number>()
  for (const a of Object.values(personality.activations)) activatedGateSet.add(a.gate)
  for (const a of Object.values(design.activations)) activatedGateSet.add(a.gate)
  const activatedGates = [...activatedGateSet].sort((a, b) => a - b)

  // Activated channels = both gates present
  const activatedChannels = CHANNELS.filter(
    (c) => activatedGateSet.has(c.gates[0]) && activatedGateSet.has(c.gates[1]),
  ).map((c) => ({ gates: c.gates, name: c.name }))

  // A center is defined iff at least one activated channel touches it
  const definedSet = new Set<Center>()
  for (const ch of activatedChannels) {
    definedSet.add(GATE_TO_CENTER[ch.gates[0]]!)
    definedSet.add(GATE_TO_CENTER[ch.gates[1]]!)
  }
  const definedCenters = CENTERS.filter((c) => definedSet.has(c))
  const undefinedCenters = CENTERS.filter((c) => !definedSet.has(c))

  // Type
  const sacralDefined = definedSet.has('sacral')
  const motorToThroat = hasMotorToThroatConnection(activatedChannels, definedSet)
  const anyDefined = definedCenters.length > 0

  let type: HumanDesignType
  if (!anyDefined) type = 'Reflector'
  else if (sacralDefined && motorToThroat) type = 'Manifesting Generator'
  else if (sacralDefined) type = 'Generator'
  else if (motorToThroat) type = 'Manifestor'
  else type = 'Projector'

  // Authority (priority order)
  let authority: HumanDesignAuthority
  if (definedSet.has('solarPlexus')) authority = 'Emotional'
  else if (definedSet.has('sacral')) authority = 'Sacral'
  else if (definedSet.has('spleen')) authority = 'Splenic'
  else if (definedSet.has('heart') && definedSet.has('throat') && motorToThroat)
    authority = 'Ego-Manifested'
  else if (definedSet.has('heart')) authority = 'Ego-Projected'
  else if (definedSet.has('g')) authority = 'Self-Projected'
  else if (type === 'Reflector') authority = 'Lunar'
  else authority = 'Mental'

  // Profile = Personality Sun line / Design Sun line
  const persLine = personality.activations.sun.line
  const desLine = design.activations.sun.line
  const profile = `${persLine}/${desLine}`
  const profileName = `${LINE_NAMES[persLine]} / ${LINE_NAMES[desLine]}`

  return {
    type,
    strategy: TYPE_ATTRIBUTES[type].strategy,
    authority,
    profile,
    profileName,
    signature: TYPE_ATTRIBUTES[type].signature,
    notSelf: TYPE_ATTRIBUTES[type].notSelf,
    definedCenters,
    undefinedCenters,
    activatedGates,
    activatedChannels,
  }
}

// ─── Motor-to-throat connection check ────────────────────────────────────

const MOTOR_CENTERS: ReadonlySet<Center> = new Set(['sacral', 'solarPlexus', 'heart', 'root'])

/**
 * Walks the graph of defined centers (via activated channels) to determine
 * whether any motor center is connected to the Throat. This handles indirect
 * paths (e.g. Root → Spleen → Throat via two channels).
 */
function hasMotorToThroatConnection(
  activatedChannels: { gates: [number, number] }[],
  definedSet: Set<Center>,
): boolean {
  if (!definedSet.has('throat')) return false
  // Build adjacency between centers via activated channels
  const adj = new Map<Center, Set<Center>>()
  for (const ch of activatedChannels) {
    const a = GATE_TO_CENTER[ch.gates[0]]!
    const b = GATE_TO_CENTER[ch.gates[1]]!
    if (a === b) continue
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }
  // BFS from Throat — does it reach any motor?
  const seen = new Set<Center>(['throat'])
  const queue: Center[] = ['throat']
  while (queue.length) {
    const c = queue.shift()!
    if (MOTOR_CENTERS.has(c) && c !== 'throat') return true
    for (const n of adj.get(c) ?? []) {
      if (!seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }
  return false
}
