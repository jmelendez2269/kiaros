/**
 * Run: node --test lib/journal/__tests__/recent-entries.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { entryConsentLabel, entryExcerpt, entrySkyLabel, recentEntryRow } from '../recent-entries.ts'

const entry = {
  id: 'e1',
  title: 'Renewal terms',
  body: 'I read the renewal terms again tonight and felt less cornered than last month. I don’t need to answer this week.',
  entry_date: '2026-11-12',
  lunar_phase: 'waxing-crescent',
  lunar_sign: 'Sagittarius',
  include_in_insights: true,
  include_in_stelloquy: false,
}

describe('recent entry rows', () => {
  it('reads as the board does: date, sky, title, excerpt, who may read it', () => {
    assert.deepEqual(recentEntryRow(entry), {
      id: 'e1',
      dateLabel: 'Thu 12 Nov',
      sky: 'Waxing Crescent · Sagittarius',
      title: 'Renewal terms',
      excerpt: entry.body,
      consent: 'In Insights',
    })
  })
  it('names an untitled entry and leaves out a sky that was never stored', () => {
    const row = recentEntryRow({ ...entry, title: '  ', lunar_phase: null, lunar_sign: null })
    assert.equal(row.title, 'Untitled')
    assert.equal(row.sky, null)
    assert.equal(entrySkyLabel({ lunar_phase: null, lunar_sign: 'Leo' }), 'Leo')
  })
  it('says who may read it for each mix of consent', () => {
    assert.equal(entryConsentLabel({ include_in_insights: false, include_in_stelloquy: false }), 'Only you')
    assert.equal(entryConsentLabel({ include_in_insights: true, include_in_stelloquy: true }), 'In Insights · Stelloquy remembers')
    assert.equal(entryConsentLabel({ include_in_insights: null, include_in_stelloquy: true }), 'Stelloquy remembers')
  })
  it('cuts a long entry at a word', () => {
    const long = 'word '.repeat(60)
    const out = entryExcerpt(long, 40)
    assert.ok(out.length <= 40)
    assert.ok(out.endsWith('word…'))
  })
})
