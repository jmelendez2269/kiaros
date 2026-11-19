import assert from 'node:assert/strict'
import test from 'node:test'
import { MIN_PER_PHASE, phaseOverview, type CheckInRow } from './check-in-rhythms'

const row = (phase: string, energy: number | null, mood: string | null = null): CheckInRow => ({ log_date: '2026-01-01', energy_level: energy, mood_tag: mood, lunar_phase: phase })

test('every phase appears, and a thin phase says nothing yet', () => {
  const out = phaseOverview([row('Full', 2, 'tired'), row('Full', 3, 'tired')])
  assert.equal(out.length, 8)
  const full = out.find((p) => p.phase === 'Full')!
  assert.equal(full.checkIns, 2)
  assert.equal(full.energy, null)
  assert.equal(full.mood, null)
})

test('a phase with enough check-ins gets its average and clear top mood', () => {
  const rows = Array.from({ length: MIN_PER_PHASE }, (_, i) => row('New', i % 2 ? 2 : 4, 'tender'))
  const news = phaseOverview(rows).find((p) => p.phase === 'New')!
  assert.equal(news.energy, 3)
  assert.equal(news.mood, 'tender')
  assert.equal(news.verb, 'seed')
})
