import { computeDesignAndPersonality } from '@/lib/ephemeris/human-design/design-chart'
import { getGeneKeyFrequencies } from '@/lib/ephemeris/human-design/gene-keys'
import type { HumanDesignChart } from '@/lib/human-design'
import {
  buildHumanDesignTransitWeather,
  TRANSIT_PLANETS,
  TRANSIT_PLANET_META,
  type LiveHumanDesignGate,
  type NatalDesignForTransits,
  type HumanDesignTransitWeather,
} from '@/lib/human-design-transit-model'

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

function currentMomentBirthInput(instant: Date) {
  const iso = instant.toISOString()
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    timezone: 'UTC',
    lat: 0,
    lng: 0,
    timeUnknown: false,
  }
}

function zodiacFor(longitude: number): {
  zodiacSign: string
  degreeInSign: number
} {
  const normalized = ((longitude % 360) + 360) % 360
  return {
    zodiacSign: ZODIAC_SIGNS[Math.floor(normalized / 30)] ?? 'Aries',
    degreeInSign: normalized % 30,
  }
}

function natalContext(chart: HumanDesignChart | null): NatalDesignForTransits | null {
  if (!chart) return null
  return {
    hasKnownBirthTime: chart.hasKnownBirthTime,
    type: chart.bodyGraph.type,
    authority: chart.bodyGraph.authority,
    activatedGates: chart.bodyGraph.activatedGates,
    definedCenters: chart.bodyGraph.definedCenters,
  }
}

/**
 * Calculates the 13 standard Human Design activations for the current moment,
 * then compares that shared field with one natal BodyGraph.
 *
 * The chart engine's current-moment Personality layer is the transit chart.
 * We intentionally ignore its calculated Design layer here.
 */
export function calculateHumanDesignTransitWeather(
  instant: Date,
  chart: HumanDesignChart | null,
): HumanDesignTransitWeather {
  const { personality } = computeDesignAndPersonality(currentMomentBirthInput(instant))

  const activations: LiveHumanDesignGate[] = TRANSIT_PLANETS.map((planet) => {
    const activation = personality.activations[planet]
    const frequencies = getGeneKeyFrequencies(activation.gate)
    const zodiac = zodiacFor(activation.longitude)
    const meta = TRANSIT_PLANET_META[planet]

    return {
      planet,
      planetLabel: meta.label,
      planetGlyph: meta.glyph,
      gate: activation.gate,
      line: activation.line,
      longitude: activation.longitude,
      zodiacSign: zodiac.zodiacSign,
      degreeInSign: zodiac.degreeInSign,
      theme: frequencies.gift,
      shadow: frequencies.shadow,
      boundarySensitive: activation.boundaryDistance < 0.2,
    }
  })

  return buildHumanDesignTransitWeather({
    generatedAt: instant,
    activations,
    natal: natalContext(chart),
  })
}
