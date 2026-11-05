/**
 * Mind map star chart helpers.
 * Run: npx tsx --test lib/insights/__tests__/star-chart.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { describeStar, layoutStarChart, linesFrom, magnitude, rangeStart, type ChartNode } from '@/lib/insights/star-chart'

const node = (id: string, kind: ChartNode['kind'], count: number): ChartNode => ({ id, kind, label: id, count })
const nodes: ChartNode[] = [
  node('Rest', 'theme', 18), node('Work', 'theme', 14), node('Mother', 'theme', 11), node('Money', 'theme', 6),
  node('Tired', 'mood', 9), node('Relieved', 'mood', 5), node('Moon square Saturn', 'natal_aspect', 6),
  node('Saturn square Moon', 'transit_aspect', 8), node('Generator', 'hd_element', 6),
  ...Array.from({ length: 10 }, (_, i) => node(`mood-${i}`, 'mood', 1)),
]
const cx = 366, cy = 350, radius = 292

describe('star chart layout', () => {
  const stars = layoutStarChart(nodes, { cx, cy, radius })
  const dist = (s: { x: number; y: number }) => Math.hypot(s.x - cx, s.y - cy)

  it('keeps themes in the inner disc and other tags in the outer band', () => {
    for (const s of stars.filter(s => s.kind === 'theme')) assert.ok(dist(s) < radius * 0.62, `${s.id} at ${dist(s)}`)
    for (const s of stars.filter(s => s.kind !== 'theme')) assert.ok(dist(s) > radius * 0.6 && dist(s) < radius, `${s.id} at ${dist(s)}`)
  })

  it('puts the brightest theme nearest the centre', () => {
    const themes = stars.filter(s => s.kind === 'theme')
    assert.equal(themes[0].id, 'Rest')
    assert.ok(themes.slice(1).every(t => dist(t) > dist(themes[0])))
  })

  it('places each kind in its own sector', () => {
    const angle = (s: { x: number; y: number }) => (Math.atan2(s.y - cy, s.x - cx) * 180) / Math.PI
    const mood = stars.find(s => s.id === 'Tired')!, natal = stars.find(s => s.id === 'Moon square Saturn')!
    assert.ok(angle(mood) > 90 && angle(mood) < 180, 'moods sit lower left')
    assert.ok(angle(natal) < -90, 'natal aspects sit upper left')
  })

  it('caps how many stars each kind gets', () => {
    assert.equal(stars.filter(s => s.kind === 'mood').length, 7)
  })

  it('sets magnitude by how often a tag comes up', () => {
    assert.equal(magnitude(18), 1); assert.equal(magnitude(5), 2); assert.equal(magnitude(4), 3)
    assert.equal(stars.find(s => s.id === 'Rest')!.magnitude, 1)
  })
})

describe('lines and wording', () => {
  const edges = [
    { source: 'Rest', target: 'Tired', weight: 9 }, { source: 'Rest', target: 'Work', weight: 7 },
    { source: 'Money', target: 'Rest', weight: 2 }, { source: 'Rest', target: 'Hidden', weight: 20 },
  ]
  it('lists the heaviest visible lines first', () => {
    const lines = linesFrom('Rest', edges, new Set(['Rest', 'Tired', 'Work', 'Money']))
    assert.deepEqual(lines.map(l => l.other), ['Tired', 'Work', 'Money'])
  })

  it('states facts without reading into them', () => {
    assert.equal(describeStar(nodes[0], 0, 64, ['Tired', 'Work']),
      'Rest is the theme you return to most, in 18 of your 64 saved conversations. It most often comes up alongside Tired and Work.')
    assert.equal(describeStar(nodes[4], -1, 64, []), 'Tired came up in 9 of your 64 saved conversations.')
    assert.match(describeStar(nodes[1], 1, 64, ['A', 'B', 'C']), /alongside A, B and C\.$/)
  })
})

describe('time ranges', () => {
  it('starts 30 days back, at the quarter, or at the year', () => {
    assert.equal(rangeStart('30d', '2026-11-05'), '2026-10-07')
    assert.equal(rangeStart('quarter', '2026-11-05'), '2026-10-01')
    assert.equal(rangeStart('quarter', '2026-02-10'), '2026-01-01')
    assert.equal(rangeStart('year', '2026-11-05'), '2026-01-01')
  })
})
