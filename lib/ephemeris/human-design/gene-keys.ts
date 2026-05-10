/**
 * gene-keys.ts
 *
 * The Gene Keys system (Richard Rudd) is built directly on the same 64-gate
 * I Ching wheel as Human Design, but reframes each gate as a contemplative
 * spectrum running from Shadow (low frequency) through Gift (engaged) to
 * Siddhi (transcendent).
 *
 * For the Kiaros spike we expose the four "Prime Gifts" — the Activation
 * Sequence — which together form the spine of the Hologenetic Profile:
 *
 *  - Life's Work (Sphere of Genius)        — Personality Sun
 *  - Evolution  (Sphere of Challenge)      — Personality Earth (Sun + 180°)
 *  - Radiance   (Sphere of Health)         — Design Sun
 *  - Purpose    (Sphere of Pure Purpose)   — Design Earth
 *
 * The full Hologenetic Profile has 11 spheres; the other seven (Attraction,
 * IQ, EQ, SQ, Core, Culture, Vocation) are not implemented in the spike.
 */

import type { ChartActivations } from './design-chart'
import type { GateActivation } from './gate-wheel'

// ─── Shadow / Gift / Siddhi names per Gene Key ───────────────────────────

interface GeneKeyFrequencies {
  shadow: string
  gift: string
  siddhi: string
}

const GENE_KEYS: Record<number, GeneKeyFrequencies> = {
  1:  { shadow: 'Entropy',          gift: 'Freshness',       siddhi: 'Beauty' },
  2:  { shadow: 'Dislocation',      gift: 'Orientation',     siddhi: 'Unity' },
  3:  { shadow: 'Chaos',            gift: 'Innovation',      siddhi: 'Innocence' },
  4:  { shadow: 'Intolerance',      gift: 'Understanding',   siddhi: 'Forgiveness' },
  5:  { shadow: 'Impatience',       gift: 'Patience',        siddhi: 'Timelessness' },
  6:  { shadow: 'Conflict',         gift: 'Diplomacy',       siddhi: 'Peace' },
  7:  { shadow: 'Division',         gift: 'Guidance',        siddhi: 'Virtue' },
  8:  { shadow: 'Mediocrity',       gift: 'Style',           siddhi: 'Exquisiteness' },
  9:  { shadow: 'Inertia',          gift: 'Determination',   siddhi: 'Invincibility' },
  10: { shadow: 'Self-Obsession',   gift: 'Naturalness',     siddhi: 'Being' },
  11: { shadow: 'Obscurity',        gift: 'Idealism',        siddhi: 'Light' },
  12: { shadow: 'Vanity',           gift: 'Discrimination',  siddhi: 'Purity' },
  13: { shadow: 'Discord',          gift: 'Discernment',     siddhi: 'Empathy' },
  14: { shadow: 'Compromise',       gift: 'Competence',      siddhi: 'Bounteousness' },
  15: { shadow: 'Dullness',         gift: 'Magnetism',       siddhi: 'Florescence' },
  16: { shadow: 'Indifference',     gift: 'Versatility',     siddhi: 'Mastery' },
  17: { shadow: 'Opinion',          gift: 'Far-Sightedness', siddhi: 'Omniscience' },
  18: { shadow: 'Judgment',         gift: 'Integrity',       siddhi: 'Perfection' },
  19: { shadow: 'Co-Dependence',    gift: 'Sensitivity',     siddhi: 'Sacrifice' },
  20: { shadow: 'Superficiality',   gift: 'Self-Assurance',  siddhi: 'Presence' },
  21: { shadow: 'Control',          gift: 'Authority',       siddhi: 'Valor' },
  22: { shadow: 'Dishonor',         gift: 'Graciousness',    siddhi: 'Grace' },
  23: { shadow: 'Complexity',       gift: 'Simplicity',      siddhi: 'Quintessence' },
  24: { shadow: 'Addiction',        gift: 'Invention',       siddhi: 'Silence' },
  25: { shadow: 'Constriction',     gift: 'Acceptance',      siddhi: 'Universal Love' },
  26: { shadow: 'Pride',            gift: 'Artfulness',      siddhi: 'Invisibility' },
  27: { shadow: 'Selfishness',      gift: 'Altruism',        siddhi: 'Selflessness' },
  28: { shadow: 'Purposelessness',  gift: 'Totality',        siddhi: 'Immortality' },
  29: { shadow: 'Half-heartedness', gift: 'Commitment',      siddhi: 'Devotion' },
  30: { shadow: 'Desire',           gift: 'Lightness',       siddhi: 'Rapture' },
  31: { shadow: 'Arrogance',        gift: 'Leadership',      siddhi: 'Humility' },
  32: { shadow: 'Failure',          gift: 'Preservation',    siddhi: 'Veneration' },
  33: { shadow: 'Forgetting',       gift: 'Mindfulness',     siddhi: 'Revelation' },
  34: { shadow: 'Force',            gift: 'Strength',        siddhi: 'Majesty' },
  35: { shadow: 'Hunger',           gift: 'Adventure',       siddhi: 'Boundlessness' },
  36: { shadow: 'Turbulence',       gift: 'Humanity',        siddhi: 'Compassion' },
  37: { shadow: 'Weakness',         gift: 'Equality',        siddhi: 'Tenderness' },
  38: { shadow: 'Struggle',         gift: 'Perseverance',    siddhi: 'Honor' },
  39: { shadow: 'Provocation',      gift: 'Dynamism',        siddhi: 'Liberation' },
  40: { shadow: 'Exhaustion',       gift: 'Resolve',         siddhi: 'Divine Will' },
  41: { shadow: 'Fantasy',          gift: 'Anticipation',    siddhi: 'Emanation' },
  42: { shadow: 'Expectation',      gift: 'Detachment',      siddhi: 'Celebration' },
  43: { shadow: 'Deafness',         gift: 'Insight',         siddhi: 'Epiphany' },
  44: { shadow: 'Interference',     gift: 'Teamwork',        siddhi: 'Synarchy' },
  45: { shadow: 'Dominance',        gift: 'Synergy',         siddhi: 'Communion' },
  46: { shadow: 'Seriousness',      gift: 'Delight',         siddhi: 'Ecstasy' },
  47: { shadow: 'Oppression',       gift: 'Transmutation',   siddhi: 'Transfiguration' },
  48: { shadow: 'Inadequacy',       gift: 'Resourcefulness', siddhi: 'Wisdom' },
  49: { shadow: 'Reaction',         gift: 'Revolution',      siddhi: 'Rebirth' },
  50: { shadow: 'Corruption',       gift: 'Equilibrium',     siddhi: 'Harmony' },
  51: { shadow: 'Agitation',        gift: 'Initiative',      siddhi: 'Awakening' },
  52: { shadow: 'Stress',           gift: 'Restraint',       siddhi: 'Stillness' },
  53: { shadow: 'Immaturity',       gift: 'Expansion',       siddhi: 'Superabundance' },
  54: { shadow: 'Greed',            gift: 'Aspiration',      siddhi: 'Ascension' },
  55: { shadow: 'Victimization',    gift: 'Freedom',         siddhi: 'Freedom' },
  56: { shadow: 'Distraction',      gift: 'Enrichment',      siddhi: 'Intoxication' },
  57: { shadow: 'Unease',           gift: 'Intuition',       siddhi: 'Clarity' },
  58: { shadow: 'Dissatisfaction',  gift: 'Vitality',        siddhi: 'Bliss' },
  59: { shadow: 'Dishonesty',       gift: 'Intimacy',        siddhi: 'Transparency' },
  60: { shadow: 'Limitation',       gift: 'Realism',         siddhi: 'Justice' },
  61: { shadow: 'Psychosis',        gift: 'Inspiration',     siddhi: 'Sanctity' },
  62: { shadow: 'Intellect',        gift: 'Precision',       siddhi: 'Impeccability' },
  63: { shadow: 'Doubt',            gift: 'Inquiry',         siddhi: 'Truth' },
  64: { shadow: 'Confusion',        gift: 'Imagination',     siddhi: 'Illumination' },
}

// ─── Sphere mapping ──────────────────────────────────────────────────────

export type SphereName = 'lifesWork' | 'evolution' | 'radiance' | 'purpose'

interface SphereMeta {
  label: string
  description: string
}

const SPHERE_META: Record<SphereName, SphereMeta> = {
  lifesWork: {
    label: "Life's Work",
    description: 'Sphere of Genius — what you are here to do, the contribution your life is structured around.',
  },
  evolution: {
    label: 'Evolution',
    description: 'Sphere of Challenge — the recurring tension that catalyses growth; what you are here to learn.',
  },
  radiance: {
    label: 'Radiance',
    description: 'Sphere of Health — the frequency through which you become luminous; vitality, magnetism.',
  },
  purpose: {
    label: 'Purpose',
    description: 'Sphere of Pure Purpose — your highest destiny, the deepest reason you are here.',
  },
}

export interface PrimeGift {
  sphere: SphereName
  label: string
  description: string
  geneKey: number
  line: number
  shadow: string
  gift: string
  siddhi: string
  shorthand: string                      // e.g. "11.4 — Idealism / Light"
}

export interface ActivationSequence {
  lifesWork: PrimeGift
  evolution: PrimeGift
  radiance: PrimeGift
  purpose: PrimeGift
}

// ─── Public API ──────────────────────────────────────────────────────────

function buildPrimeGift(
  sphere: SphereName,
  activation: GateActivation,
): PrimeGift {
  const freq = GENE_KEYS[activation.gate]
  if (!freq) {
    throw new Error(`gene-keys: missing entry for gate ${activation.gate}`)
  }
  return {
    sphere,
    label: SPHERE_META[sphere].label,
    description: SPHERE_META[sphere].description,
    geneKey: activation.gate,
    line: activation.line,
    shadow: freq.shadow,
    gift: freq.gift,
    siddhi: freq.siddhi,
    shorthand: `${activation.gate}.${activation.line} — ${freq.gift} (Shadow: ${freq.shadow}, Siddhi: ${freq.siddhi})`,
  }
}

export function deriveActivationSequence(
  personality: ChartActivations,
  design: ChartActivations,
): ActivationSequence {
  return {
    lifesWork: buildPrimeGift('lifesWork', personality.activations.sun),
    evolution: buildPrimeGift('evolution', personality.activations.earth),
    radiance:  buildPrimeGift('radiance',  design.activations.sun),
    purpose:   buildPrimeGift('purpose',   design.activations.earth),
  }
}

export function getGeneKeyFrequencies(gate: number): GeneKeyFrequencies {
  const freq = GENE_KEYS[gate]
  if (!freq) throw new Error(`gene-keys: missing entry for gate ${gate}`)
  return freq
}
