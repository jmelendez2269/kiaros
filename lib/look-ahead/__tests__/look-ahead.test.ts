/**
 * Run: npx tsx --test lib/look-ahead/__tests__/look-ahead.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import collective from '@/lib/sky-cycles/data/collective-cycles.json'
import slow from '@/lib/sky-cycles/data/slow-longitudes.json'
import { addDays, detectPersonalTransits, natalPointsFromChart } from '@/lib/sky-cycles/detect'
import type { SkyCycle } from '@/lib/sky-cycles/types'
import { getCurrentPlannerYear } from '@/lib/commerce/planner-year'
import { lookAheadWindow, lookAheadWindowAt } from '@/lib/look-ahead/window'
import { eligibleForLookAhead } from '@/lib/look-ahead/eligibility'
import { parseGoalChoice } from '@/lib/look-ahead/goals'
import { buildYearSky, cyclesInYear, eclipsesOf, wholeSignHouse, yearPosition } from '@/lib/look-ahead/sky'
import type { NatalChart, PlanetPosition, ZodiacSign } from '@/types/blueprint'

const COLLECTIVE = (collective as { cycles: SkyCycle[] }).cycles
const SLOW = slow as { from: string; lons: number[][] }

describe('look-ahead window (America/New_York calendar days)', () => {
  it('is closed on Oct 31', () => {
    const w = lookAheadWindow('2026-10-31')
    assert.equal(w.open, false)
    assert.equal(w.year, null)
    assert.equal(w.currentPlannerYear, 2026)
  })
  it('opens 2027 on Nov 1, while 2026 stays the current year', () => {
    const w = lookAheadWindow('2026-11-01')
    assert.equal(w.open, true)
    assert.equal(w.year, 2027)
    assert.equal(w.currentPlannerYear, 2026)
    assert.equal(w.opensOn, '2026-11-01')
    assert.equal(w.rollsOn, '2026-12-01')
  })
  it('is still open on Nov 30', () => {
    assert.equal(lookAheadWindow('2026-11-30').open, true)
  })
  it('closes on Dec 1, when 2027 becomes the current year', () => {
    const w = lookAheadWindow('2026-12-01')
    assert.equal(w.open, false)
    assert.equal(w.currentPlannerYear, 2027)
  })
  it('flips at midnight New York time, not UTC', () => {
    // Nov 1 2026 00:00 EDT is 04:00 UTC.
    assert.equal(lookAheadWindowAt({ now: new Date('2026-11-01T03:59:00Z') }).open, false)
    assert.equal(lookAheadWindowAt({ now: new Date('2026-11-01T04:00:00Z') }).open, true)
    // Dec 1 2026 00:00 EST is 05:00 UTC.
    assert.equal(lookAheadWindowAt({ now: new Date('2026-12-01T04:59:00Z') }).open, true)
    assert.equal(lookAheadWindowAt({ now: new Date('2026-12-01T05:00:00Z') }).open, false)
  })
  it('agrees with the planner year roll at every edge', () => {
    for (const iso of ['2026-11-01T03:59:00Z', '2026-11-01T04:00:00Z', '2026-12-01T04:59:00Z', '2026-12-01T05:00:00Z']) {
      const now = new Date(iso)
      assert.equal(lookAheadWindowAt({ now }).currentPlannerYear, getCurrentPlannerYear(now), iso)
    }
  })
  it('uses a preview mock day when given', () => {
    assert.equal(lookAheadWindowAt({ now: new Date('2026-06-01T12:00:00Z'), mockToday: '2026-11-15' }).year, 2027)
    assert.equal(lookAheadWindowAt({ now: new Date('2026-11-15T12:00:00Z'), mockToday: '2026-10-31' }).open, false)
  })
})

describe('2027 cycle selection', () => {
  const in2027 = cyclesInYear(COLLECTIVE, 2027)

  it('keeps only cycles touching 2027, including ones carried over from 2026', () => {
    assert.ok(in2027.length > 0)
    for (const c of in2027) assert.ok(c.endDate >= '2027-01-01' && c.startDate <= '2027-12-31', c.id)
    assert.ok(in2027.some((c) => c.startDate < '2027-01-01'), 'a retrograde that began in 2026')
    assert.ok(!COLLECTIVE.filter((c) => c.endDate < '2027-01-01').some((c) => in2027.includes(c)))
  })

  it('builds the year-at-a-glance rows from the ephemeris', () => {
    const sky = buildYearSky({ year: 2027, collective: COLLECTIVE, personal: [], chart: null, goals: [] })
    const byKey = new Map(sky.rows.map((r) => [r.key, r]))
    const mercury = byKey.get('retrograde:Mercury')
    assert.ok(mercury)
    assert.equal(mercury.bands.length, 3)
    assert.equal(mercury.note, 'Three times: Feb 10, Jun 11, Oct 8')
    assert.equal(byKey.get('retrograde:Mars')?.note, 'Jan 11 to Apr 2')
    assert.equal(byKey.has('retrograde:Venus'), false, 'no Venus retrograde in 2027')
    const eclipses = byKey.get('eclipses')
    assert.equal(eclipses?.title, 'Eclipses in February and August')
    assert.equal(eclipses?.marks.length, 3)
    const jupiter = byKey.get('ingress:Jupiter')
    assert.equal(jupiter?.title, 'Jupiter in Leo, then Virgo')
    assert.equal(jupiter?.note, 'Changes sign Jul 26')
    assert.match(sky.slowRetrogrades ?? '', /Jupiter Dec 14, 2026 to Apr 14, 2027/)
    for (const r of sky.rows) {
      for (const b of r.bands) assert.ok(b.left >= 0 && b.left + b.width <= 100.5, r.key)
      for (const m of r.marks) assert.ok(m >= 0 && m <= 100, r.key)
    }
  })

  it('clips a band that began the year before to Jan 1', () => {
    assert.equal(yearPosition('2026-12-14', 2027), 0)
    assert.equal(yearPosition('2027-01-01', 2027), 0)
    assert.ok(yearPosition('2027-12-31', 2027) > 99)
  })

  it('splits an eclipse season into single eclipses', () => {
    const feb = in2027.find((c) => c.kind === 'eclipse' && c.startDate === '2027-02-06')
    assert.ok(feb)
    assert.deepEqual(eclipsesOf(feb), [
      { date: '2027-02-06', type: 'solar', sign: 'Aquarius' },
      { date: '2027-02-20', type: 'lunar', sign: 'Virgo' },
    ])
  })

  it('places eclipses and sign changes in the member’s houses, and finds their own transits', () => {
    const lonOn = (date: string, planet: number) => {
      const idx = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${SLOW.from}T12:00:00Z`)) / 86_400_000)
      return SLOW.lons[idx][planet]
    }
    const pos = (longitude: number, house: number): PlanetPosition =>
      ({ longitude, sign: 'Aries', degree: 0, house, retrograde: false }) as unknown as PlanetPosition
    // Rising Aries: Leo is the 5th house, Virgo the 6th. Ascendant set where Saturn stands mid-2027.
    const chart = {
      sun: pos(100, 4), moon: pos(200, 7), mercury: pos(0, 1), venus: pos(0, 1), mars: pos(0, 1),
      jupiter: pos(0, 1), saturn: pos(0, 1), uranus: pos(0, 1), neptune: pos(0, 1), pluto: pos(0, 1),
      rising: 'Aries' as ZodiacSign,
      birthTimeUnknown: false,
      houseSystem: 'whole_sign',
      ascendantLongitude: lonOn('2027-06-01', 1),
      midheavenLongitude: 270,
    } as NatalChart
    assert.equal(wholeSignHouse('Leo', chart), 5)
    assert.equal(wholeSignHouse('Leo', { ...chart, birthTimeUnknown: true }), null)

    const series = []
    for (let d = '2026-01-01'; d <= '2028-06-30'; d = addDays(d, 1)) {
      const [jupiter, saturn, uranus, neptune, pluto] = SLOW.lons[
        Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${SLOW.from}T12:00:00Z`)) / 86_400_000)
      ]
      series.push({ date: d, lons: { jupiter, saturn, uranus, neptune, pluto } })
    }
    const personal = detectPersonalTransits(series, natalPointsFromChart(chart))
    const sky = buildYearSky({
      year: 2027,
      collective: COLLECTIVE,
      personal,
      chart,
      goals: [{ title: 'Evenings that are mine', areaName: 'Health & Wellness' }],
    })
    assert.ok(sky.housesKnown)
    // Personal transits lead, before any collective event.
    assert.ok(sky.meetings.some((m) => m.title === 'Saturn meets your rising'))
    assert.ok(sky.meetings[0].id.startsWith('personal:'))
    const leo = sky.meetings.find((m) => m.id === 'eclipse:2027-08-02')
    assert.equal(leo?.title, 'A solar eclipse in your 5th house')
    const jupiter = sky.meetings.find((m) => m.title.startsWith('Jupiter moves into'))
    assert.equal(jupiter?.title, 'Jupiter moves into your 6th house')
    assert.match(jupiter?.body ?? '', /Evenings that are mine/)
  })
})

describe('who sees the look-ahead', () => {
  it('opens for active monthly or yearly members', () => {
    assert.equal(eligibleForLookAhead({ hasPlannerAccess: true, activeEntitlements: [{ source: 'stripe' }] }), true)
    assert.equal(eligibleForLookAhead({ hasPlannerAccess: true, activeEntitlements: [{ source: 'activation_code' }] }), true)
  })
  it('stays closed without active access, or with Etsy access only', () => {
    assert.equal(eligibleForLookAhead({ hasPlannerAccess: false, activeEntitlements: [{ source: 'stripe' }] }), false)
    assert.equal(eligibleForLookAhead({ hasPlannerAccess: true, activeEntitlements: [{ source: 'etsy' }] }), false)
  })
  it('lets admins in', () => {
    assert.equal(eligibleForLookAhead({ isAdmin: true, hasPlannerAccess: false, activeEntitlements: [] }), true)
  })
})

describe('goal choice requests', () => {
  const goalId = '0f8b5a7e-1c2d-4e3f-8a9b-0c1d2e3f4a5b'
  it('accepts carry and release without words', () => {
    assert.deepEqual(parseGoalChoice({ goalId, year: 2027, choice: 'release', reshapedTitle: 'ignored' }),
      { ok: true, value: { goalId, year: 2027, choice: 'release', reshapedTitle: null } })
  })
  it('keeps reshaped words, trimmed', () => {
    const r = parseGoalChoice({ goalId, year: 2027, choice: 'reshape', reshapedTitle: '  Quieter evenings  ' })
    assert.ok(r.ok && r.value.reshapedTitle === 'Quieter evenings')
  })
  it('refuses unknown choices, ids and over-long words', () => {
    assert.equal(parseGoalChoice({ goalId, year: 2027, choice: 'drop' }).ok, false)
    assert.equal(parseGoalChoice({ goalId: 'x', year: 2027, choice: 'carry' }).ok, false)
    assert.equal(parseGoalChoice({ goalId, year: 2027, choice: 'reshape', reshapedTitle: 'a'.repeat(201) }).ok, false)
  })
})
