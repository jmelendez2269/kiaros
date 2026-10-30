/**
 * Week Arc station-direct headline uses the last retrograde day (Rx end), not the first direct day.
 */

import assert from 'node:assert/strict'
import {
  buildDayMap,
  buildWeekArcStationPatternCopy,
  findStationDirectInRange,
} from '../lib/today/week-arc-station-pattern.ts'
import type { EphemerisDay } from '../types/blueprint.ts'

function day(date: string, retrogrades: EphemerisDay['retrogrades']): EphemerisDay {
  return {
    date,
    retrogrades,
    moonPhase: null,
    transits: [],
    sunSign: 'Scorpio',
    energy: 'reflect',
  } as EphemerisDay
}

const mercuryRxSpan: EphemerisDay[] = []
for (let dayNum = 20; dayNum <= 31; dayNum++) {
  mercuryRxSpan.push(day(`2026-10-${String(dayNum).padStart(2, '0')}`, ['Mercury']))
}
for (let dayNum = 1; dayNum <= 14; dayNum++) {
  mercuryRxSpan.push(day(`2026-11-${String(dayNum).padStart(2, '0')}`, ['Mercury']))
}
mercuryRxSpan.push(day('2026-11-15', []))
mercuryRxSpan.push(day('2026-11-16', []))

const dayByDate = buildDayMap(mercuryRxSpan)
const station = findStationDirectInRange('2026-10-20', '2026-11-20', dayByDate)
assert.ok(station)
assert.equal(station.planet, 'Mercury')
assert.equal(station.date, '2026-11-14')

const copy = buildWeekArcStationPatternCopy(
  station,
  '2026-11-10',
  '2026-11-16',
  dayByDate,
)
assert.equal(copy.headline, 'Mercury stations direct Nov 14')

console.log('All week-arc station pattern tests passed.')
