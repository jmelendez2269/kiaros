import type { LunarPhase, ZodiacSign } from '@/types/blueprint'

export interface ShapeTone {
  /** Label shown in the kicker (e.g. "Energy") */
  label: string
  /** Headline value in serif italic (e.g. "review") */
  value: string
  /** Glyph color hint key — consumed via K palette. */
  toneKey: 'sage' | 'plum' | 'copper' | 'ember' | 'brick'
  /** Glyph character. */
  glyph: string
  /** One-line subtitle. */
  note: string
}

export interface ShapeOfToday {
  energy: ShapeTone
  voice: ShapeTone
  body: ShapeTone
}

// Moon phases drive the dominant energy of the day. The cadence — push,
// review, edit, rest — comes from the lunar arc more reliably than the Sun.
const ENERGY_BY_PHASE: Record<LunarPhase, ShapeTone> = {
  new: {
    label: 'Energy',
    value: 'seed',
    toneKey: 'sage',
    glyph: '○',
    note: 'plant the small thing',
  },
  'waxing-crescent': {
    label: 'Energy',
    value: 'tend',
    toneKey: 'sage',
    glyph: '◑',
    note: 'water what you started',
  },
  'first-quarter': {
    label: 'Energy',
    value: 'commit',
    toneKey: 'copper',
    glyph: '◐',
    note: 'choose, then move',
  },
  'waxing-gibbous': {
    label: 'Energy',
    value: 'refine',
    toneKey: 'copper',
    glyph: '◐',
    note: 'edit, don’t add',
  },
  full: {
    label: 'Energy',
    value: 'reveal',
    toneKey: 'ember',
    glyph: '●',
    note: 'show what’s ready',
  },
  'waning-gibbous': {
    label: 'Energy',
    value: 'release',
    toneKey: 'brick',
    glyph: '◐',
    note: 'let what’s done be done',
  },
  'last-quarter': {
    label: 'Energy',
    value: 'cull',
    toneKey: 'brick',
    glyph: '◑',
    note: 'cut what no longer serves',
  },
  'waning-crescent': {
    label: 'Energy',
    value: 'rest',
    toneKey: 'plum',
    glyph: '◯',
    note: 'compost before the next seed',
  },
}

// The Moon's sign element governs the voice — how today wants to be spoken,
// or whether it wants you to listen more than you speak.
const VOICE_BY_SIGN: Record<ZodiacSign, ShapeTone> = {
  Aries: { label: 'Voice', value: 'direct', toneKey: 'ember', glyph: '☿', note: 'say it once' },
  Taurus: { label: 'Voice', value: 'measured', toneKey: 'sage', glyph: '☿', note: 'speak when settled' },
  Gemini: { label: 'Voice', value: 'curious', toneKey: 'copper', glyph: '☿', note: 'ask, then ask again' },
  Cancer: { label: 'Voice', value: 'tender', toneKey: 'plum', glyph: '☾', note: 'listen first' },
  Leo: { label: 'Voice', value: 'warm', toneKey: 'ember', glyph: '☉', note: 'lead with heart' },
  Virgo: { label: 'Voice', value: 'precise', toneKey: 'sage', glyph: '☿', note: 'less, said clearly' },
  Libra: { label: 'Voice', value: 'balanced', toneKey: 'copper', glyph: '♀', note: 'name the tension' },
  Scorpio: { label: 'Voice', value: 'quieter', toneKey: 'plum', glyph: '☽', note: 'listen first' },
  Sagittarius: { label: 'Voice', value: 'expansive', toneKey: 'copper', glyph: '♃', note: 'reach a little further' },
  Capricorn: { label: 'Voice', value: 'spare', toneKey: 'sage', glyph: '♄', note: 'state the structure' },
  Aquarius: { label: 'Voice', value: 'unusual', toneKey: 'plum', glyph: '♅', note: 'don’t apologise for odd' },
  Pisces: { label: 'Voice', value: 'porous', toneKey: 'plum', glyph: '♆', note: 'soften the edges' },
}

// Body is the most somatic of the three. We pair phase intensity with sign
// element to land on a felt-sense word — soft, sharp, fluid, anchored.
const BODY_BY_PHASE_AND_SIGN: Record<LunarPhase, ShapeTone> = {
  new: { label: 'Body', value: 'still', toneKey: 'plum', glyph: '✺', note: 'low and slow' },
  'waxing-crescent': { label: 'Body', value: 'curious', toneKey: 'sage', glyph: '✺', note: 'move easily' },
  'first-quarter': { label: 'Body', value: 'ready', toneKey: 'copper', glyph: '✺', note: 'use the lift' },
  'waxing-gibbous': { label: 'Body', value: 'soft', toneKey: 'copper', glyph: '✺', note: 'pace yourself' },
  full: { label: 'Body', value: 'tender', toneKey: 'ember', glyph: '✺', note: 'mind your edges' },
  'waning-gibbous': { label: 'Body', value: 'releasing', toneKey: 'brick', glyph: '✺', note: 'let the day unwind' },
  'last-quarter': { label: 'Body', value: 'cleansing', toneKey: 'brick', glyph: '✺', note: 'lighten the load' },
  'waning-crescent': { label: 'Body', value: 'porous', toneKey: 'plum', glyph: '✺', note: 'sleep is strategy' },
}

export function getShapeOfToday(args: { moonPhase: LunarPhase; moonSign: ZodiacSign }): ShapeOfToday {
  return {
    energy: ENERGY_BY_PHASE[args.moonPhase],
    voice: VOICE_BY_SIGN[args.moonSign],
    body: BODY_BY_PHASE_AND_SIGN[args.moonPhase],
  }
}
