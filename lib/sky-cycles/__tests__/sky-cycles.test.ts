/**
 * Run: npx tsx --test lib/sky-cycles/__tests__/sky-cycles.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import collective from '@/lib/sky-cycles/data/collective-cycles.json'
import { detectPersonalTransits, natalPointsFromChart, type SlowLongitudeSeries } from '@/lib/sky-cycles/detect'
import { cycleStatus, relevantCycles, worthShowingToday } from '@/lib/sky-cycles/status'
import type { SkyCycle } from '@/lib/sky-cycles/types'
import type { NatalChart } from '@/types/blueprint'

const cycles = (collective as { cycles: SkyCycle[] }).cycles
const find = (title: string, start: string) => cycles.find((c) => c.title === title && c.startDate === start)

describe('collective cycles match the 2026 sky', () => {
  it('finds the 2026 Mercury retrogrades', () => {
    const merc = cycles.filter((c) => c.title === 'Mercury retrograde' && c.startDate.startsWith('2026'))
    assert.deepEqual(
      merc.map((c) => c.startDate.slice(0, 7)),
      ['2026-02', '2026-06', '2026-10'],
    )
  })
  it('finds Saturn returning to Aries (first entered May 2025) and Jupiter entering Leo', () => {
    assert.ok(find('Saturn enters Aries', '2025-05-25'))
    assert.ok(find('Saturn steps back into Pisces', '2025-09-01'))
    assert.ok(find('Saturn returns to Aries', '2026-02-14'))
    assert.ok(find('Jupiter enters Leo', '2026-06-30'))
  })
  it('finds both 2026 eclipse seasons', () => {
    const seasons = cycles.filter((c) => c.kind === 'eclipse' && c.startDate.startsWith('2026'))
    assert.deepEqual(seasons.map((c) => c.keyDates), [
      ['2026-02-17', '2026-03-03'],
      ['2026-08-12', '2026-08-28'],
    ])
  })
  it('dates the equinoxes and solstices to the right day', () => {
    assert.ok(find('The Sun enters Aries', '2026-03-20'))
    assert.ok(find('The Sun enters Cancer', '2026-06-21'))
    assert.ok(find('The Sun enters Libra', '2026-09-23'))
    assert.ok(find('The Sun enters Capricorn', '2026-12-21'))
  })
})

describe('cycle status', () => {
  const merc = find('Mercury retrograde', '2026-10-25')!
  it('gives a heads-up inside the window only', () => {
    assert.equal(cycleStatus(merc, '2026-10-17'), null)
    assert.equal(cycleStatus(merc, '2026-10-20')?.phase, 'upcoming')
  })
  it('counts days while active', () => {
    const s = cycleStatus(merc, '2026-11-03')!
    assert.equal(s.phase, 'active')
    assert.equal(s.dayCount, 10)
  })
  it('offers a look back for ten days after it ends', () => {
    assert.equal(cycleStatus(merc, '2026-11-16')?.phase, 'ended')
    assert.equal(cycleStatus(merc, '2026-11-30'), null)
  })
  it('keeps long cycles off Today except near their edges', () => {
    const saturnRx = find('Saturn retrograde', '2026-07-27')!
    assert.equal(worthShowingToday(cycleStatus(saturnRx, '2026-09-15')!, '2026-09-15'), false)
    assert.equal(worthShowingToday(cycleStatus(saturnRx, '2026-12-08')!, '2026-12-08'), true)
  })
  it('puts look backs before heads-ups before cycles under way', () => {
    const phases = relevantCycles(cycles, '2026-11-17').map((s) => s.phase)
    const firstActive = phases.indexOf('active')
    assert.ok(phases.indexOf('ended') < (firstActive === -1 ? Infinity : firstActive))
  })
})

describe('personal transits', () => {
  // Synthetic: Saturn moves 0.1°/day and passes 10° of the natal Sun.
  const series: SlowLongitudeSeries = Array.from({ length: 200 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    lons: { jupiter: 200, saturn: 0 + i * 0.1, uranus: 300, neptune: 330, pluto: 250 },
  }))
  const chart = {
    sun: { longitude: 10 },
    moon: { longitude: 140 },
    birthTimeUnknown: true,
  } as unknown as NatalChart

  it('finds a conjunction within 1° and dates the exact hit', () => {
    const found = detectPersonalTransits(series, natalPointsFromChart(chart))
    const conj = found.find((c) => c.planet === 'Saturn' && c.aspect === 'conjunction' && c.natalPoint === 'Sun')
    assert.ok(conj)
    assert.equal(conj.title, 'Saturn meets your Sun')
    assert.equal(conj.keyDates[0], '2026-04-11')
  })
  it('skips rising and midheaven when birth time is unknown', () => {
    assert.deepEqual(natalPointsFromChart(chart).map((p) => p.point), ['Sun', 'Moon'])
  })
})
