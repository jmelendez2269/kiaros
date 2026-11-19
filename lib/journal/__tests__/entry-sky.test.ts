import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { EphemerisDay, YearEphemeris } from '@/types/blueprint'
import { collectRpcErrors, localDateInTimeZone, resolveEntrySkyDay } from '../entry-sky'

const day = (date: string) => ({ date }) as unknown as EphemerisDay
const cache = (dates: string[]) => ({ days: dates.map(day) }) as unknown as YearEphemeris

describe('resolveEntrySkyDay', () => {
  it('uses the cache when it has the date, without computing', () => {
    let computed = 0
    const result = resolveEntrySkyDay({
      cached: cache(['2026-11-19']),
      entryDate: '2026-11-19',
      compute: () => (computed++, null),
    })
    assert.equal(result.source, 'cache')
    assert.equal(computed, 0)
  })

  it('computes the day when there is no cache at all', () => {
    const result = resolveEntrySkyDay({
      cached: null,
      entryDate: '2026-11-19',
      compute: () => day('2026-11-19'),
    })
    assert.equal(result.source, 'computed')
    assert.equal(result.day?.date, '2026-11-19')
  })

  it('computes the day when the cache does not reach the date', () => {
    const result = resolveEntrySkyDay({
      cached: cache(['2026-12-01']),
      entryDate: '2026-11-19',
      compute: () => day('2026-11-19'),
    })
    assert.equal(result.source, 'computed')
  })

  it('reports missing with a reason when computing throws or returns the wrong date', () => {
    const thrown = resolveEntrySkyDay({
      cached: null,
      entryDate: '2026-11-19',
      compute: () => {
        throw new Error('no natal chart')
      },
    })
    assert.equal(thrown.source, 'missing')
    assert.equal(thrown.source === 'missing' && thrown.reason, 'no natal chart')

    const wrong = resolveEntrySkyDay({
      cached: null,
      entryDate: '2026-11-19',
      compute: () => day('2026-11-20'),
    })
    assert.equal(wrong.source, 'missing')
  })
})

describe('collectRpcErrors', () => {
  it('returns only the messages of results that carry an error', () => {
    assert.deepEqual(
      collectRpcErrors([{ error: null }, { error: { message: 'boom' } }, { error: { message: 'bang' } }]),
      ['boom', 'bang'],
    )
    assert.deepEqual(collectRpcErrors([{ error: null }]), [])
  })
})

describe('localDateInTimeZone', () => {
  const instant = new Date('2026-11-20T03:30:00Z')
  it('uses the member timezone', () => {
    assert.equal(localDateInTimeZone(instant, 'America/Los_Angeles'), '2026-11-19')
    assert.equal(localDateInTimeZone(instant, 'Pacific/Auckland'), '2026-11-20')
  })
  it('falls back for a missing or invalid zone', () => {
    assert.equal(localDateInTimeZone(instant, null), '2026-11-19')
    assert.equal(localDateInTimeZone(instant, 'Not/AZone'), '2026-11-19')
  })
})
