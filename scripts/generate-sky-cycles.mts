/**
 * Regenerates the static sky-cycle data (collective cycles and the daily
 * slow-planet longitude table used for personal transits).
 *
 * Collective happenings are the same for every member, so we compute them
 * once here instead of on every Today render (about 2s of astronomy per
 * request otherwise).
 *
 * Run: npx tsx scripts/generate-sky-cycles.mts
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildLongitudeSeries, buildMoonEvents } from '../lib/sky-cycles/series.ts'
import {
  detectEclipseSeasons,
  detectRetrogrades,
  detectSeasons,
  detectSlowIngresses,
} from '../lib/sky-cycles/detect.ts'

const FROM = '2023-07-01' // buffer so cycles already under way on 2024-01-01 have known starts
const TO = '2033-06-30' // buffer so late-2032 retrogrades have known ends
const KEEP_FROM = '2024-01-01'
const KEEP_TO = '2032-12-31'

const series = buildLongitudeSeries(FROM, TO)
const moon = buildMoonEvents(FROM, TO)

const cycles = [
  ...detectRetrogrades(series),
  ...detectSlowIngresses(series),
  ...detectSeasons(series),
  ...detectEclipseSeasons(moon),
]
  .filter((c) => c.endDate >= KEEP_FROM && c.startDate <= KEEP_TO)
  .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))

const round = (n: number) => Math.round(n * 100) / 100
const slow = {
  from: FROM,
  planets: ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'],
  lons: series.map((d) => [d.lons.jupiter, d.lons.saturn, d.lons.uranus, d.lons.neptune, d.lons.pluto].map(round)),
}

const dir = join(import.meta.dirname, '..', 'lib', 'sky-cycles', 'data')
writeFileSync(join(dir, 'collective-cycles.json'), JSON.stringify({ from: KEEP_FROM, to: KEEP_TO, cycles }) + '\n')
writeFileSync(join(dir, 'slow-longitudes.json'), JSON.stringify(slow) + '\n')
console.log(`collective cycles: ${cycles.length}; slow-longitude days: ${slow.lons.length}`)
