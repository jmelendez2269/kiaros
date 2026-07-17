/**
 * natal-aspects.ts
 *
 * Planet-to-planet aspects within a single natal chart (as opposed to
 * transit-calculator.ts's transiting-planet-to-natal-planet aspects). Reuses
 * the same angle/orb table and angular-separation math rather than
 * re-deriving it.
 */

import { ASPECTS, angularSep } from './transit-calculator'
import type { AspectType, NatalChart, Planet } from '@/types/blueprint'

export interface NatalAspect {
  a: Planet
  b: Planet
  aspect: AspectType
  orb: number
}

const NATAL_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

function longitudeOf(chart: NatalChart, planet: Planet): number {
  return chart[planet.toLowerCase() as Lowercase<Planet>].longitude
}

/**
 * All aspects between distinct natal planet pairs that fall within orb,
 * tightest orb first.
 */
export function computeNatalAspects(chart: NatalChart): NatalAspect[] {
  const results: NatalAspect[] = []

  for (let i = 0; i < NATAL_PLANETS.length; i++) {
    for (let j = i + 1; j < NATAL_PLANETS.length; j++) {
      const a = NATAL_PLANETS[i]
      const b = NATAL_PLANETS[j]
      const sep = angularSep(longitudeOf(chart, a), longitudeOf(chart, b))

      for (const def of ASPECTS) {
        const orb = Math.abs(sep - def.angle)
        if (orb <= def.orb) {
          results.push({ a, b, aspect: def.type, orb })
          break // a pair only forms one aspect at a time
        }
      }
    }
  }

  return results.sort((x, y) => x.orb - y.orb)
}
