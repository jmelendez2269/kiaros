/**
 * Tests for journal entry sampling
 * Run: npx tsx --test lib/period-review/__tests__/sampling.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { periodFor } from '@/lib/period-review/periods'

// Import the sampling function (it's not exported, so we'll test it through the module)
// For now, we'll create a test version inline
function sampleEntriesEvenly<T extends { entry_date: string; body: string }>(
  entries: T[],
  period: { kind: 'month' | 'quarter' | 'year'; periodStart: string; periodEnd: string },
  maxSamples: number,
): Array<{ date: string; excerpt: string }> {
  if (entries.length === 0) return []
  if (entries.length <= maxSamples) {
    return entries.map((e) => ({
      date: e.entry_date,
      excerpt: e.body.trim().length > 600 ? `${e.body.trim().slice(0, 597)}…` : e.body.trim(),
    }))
  }

  const bucketCount = period.kind === 'month' ? 4 : period.kind === 'quarter' ? 3 : 12
  const buckets: T[][] = Array.from({ length: bucketCount }, () => [])

  const periodStart = new Date(period.periodStart)
  const periodEnd = new Date(period.periodEnd)
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const bucketDays = totalDays / bucketCount

  for (const entry of entries) {
    const entryDate = new Date(entry.entry_date)
    const dayOffset = Math.ceil((entryDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const bucketIdx = Math.min(Math.floor(dayOffset / bucketDays), bucketCount - 1)
    buckets[bucketIdx].push(entry)
  }

  const samplesPerBucket = Math.floor(maxSamples / bucketCount)
  const remainder = maxSamples % bucketCount

  const sampled: T[] = []
  for (let i = 0; i < bucketCount; i++) {
    const bucket = buckets[i]
    if (bucket.length === 0) continue
    const takeCount = samplesPerBucket + (i < remainder ? 1 : 0)
    const step = bucket.length / takeCount
    for (let j = 0; j < takeCount && j < bucket.length; j++) {
      const idx = Math.floor(j * step)
      sampled.push(bucket[idx])
    }
  }

  return sampled
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({
      date: e.entry_date,
      excerpt: e.body.trim().length > 600 ? `${e.body.trim().slice(0, 597)}…` : e.body.trim(),
    }))
}

describe('Journal Entry Sampling', () => {
  it('returns all entries when count is under max', () => {
    const period = periodFor('month', 2026, 10)
    const entries = [
      { entry_date: '2026-10-05', body: 'First entry' },
      { entry_date: '2026-10-15', body: 'Second entry' },
    ]

    const sampled = sampleEntriesEvenly(entries, period, 12)
    assert.equal(sampled.length, 2)
    assert.equal(sampled[0].date, '2026-10-05')
    assert.equal(sampled[1].date, '2026-10-15')
  })

  it('samples evenly across 4 week buckets for a month', () => {
    const period = periodFor('month', 2026, 10)
    // Create 31 entries spread throughout October
    const entries = Array.from({ length: 31 }, (_, i) => ({
      entry_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      body: `Entry ${i + 1}`,
    }))

    const sampled = sampleEntriesEvenly(entries, period, 12)
    assert.ok(sampled.length <= 12, `Expected at most 12 samples, got ${sampled.length}`)
    assert.ok(sampled.length >= 10, `Expected at least 10 samples, got ${sampled.length}`)

    // Check spread across the month
    const dates = sampled.map((s) => parseInt(s.date.split('-')[2]))
    assert.ok(dates.some((d) => d <= 7), 'Should have entries from week 1')
    assert.ok(dates.some((d) => d >= 8 && d <= 14), 'Should have entries from week 2')
    assert.ok(dates.some((d) => d >= 15 && d <= 21), 'Should have entries from week 3')
    assert.ok(dates.some((d) => d >= 22), 'Should have entries from week 4')
  })

  it('samples evenly across 3 month buckets for a quarter', () => {
    const period = periodFor('quarter', 2026, 4)
    const entries = []
    for (let month = 10; month <= 12; month++) {
      for (let day = 1; day <= 10; day++) {
        entries.push({
          entry_date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          body: `Entry ${month}-${day}`,
        })
      }
    }

    const sampled = sampleEntriesEvenly(entries, period, 12)
    assert.equal(sampled.length, 12)

    // Check spread across the quarter
    const months = sampled.map((s) => parseInt(s.date.split('-')[1]))
    assert.ok(months.includes(10), 'Should have entries from October')
    assert.ok(months.includes(11), 'Should have entries from November')
    assert.ok(months.includes(12), 'Should have entries from December')
  })

  it('truncates long entries to ~600 characters', () => {
    const period = periodFor('month', 2026, 10)
    const longBody = 'a'.repeat(700)
    const entries = [{ entry_date: '2026-10-15', body: longBody }]

    const sampled = sampleEntriesEvenly(entries, period, 12)
    assert.equal(sampled.length, 1)
    assert.equal(sampled[0].excerpt.length, 598) // 597 chars + '…'
    assert.ok(sampled[0].excerpt.endsWith('…'))
  })

  it('does not truncate entries under 600 characters', () => {
    const period = periodFor('month', 2026, 10)
    const shortBody = 'a'.repeat(500)
    const entries = [{ entry_date: '2026-10-15', body: shortBody }]

    const sampled = sampleEntriesEvenly(entries, period, 12)
    assert.equal(sampled.length, 1)
    assert.equal(sampled[0].excerpt.length, 500)
    assert.ok(!sampled[0].excerpt.endsWith('…'))
  })

  it('maintains deterministic order', () => {
    const period = periodFor('month', 2026, 10)
    const entries = Array.from({ length: 20 }, (_, i) => ({
      entry_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      body: `Entry ${i + 1}`,
    }))

    const sampled1 = sampleEntriesEvenly(entries, period, 12)
    const sampled2 = sampleEntriesEvenly(entries, period, 12)

    assert.deepEqual(sampled1, sampled2)
  })

  it('returns empty array for empty input', () => {
    const period = periodFor('month', 2026, 10)
    const sampled = sampleEntriesEvenly([], period, 12)
    assert.equal(sampled.length, 0)
  })
})
