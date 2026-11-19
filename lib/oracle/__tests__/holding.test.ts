import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { rememberedEntriesLine, topThemes } from '../holding'

describe('topThemes', () => {
  it('ranks themes by conversations, ignores other kinds, and honours the limit', () => {
    const t = [
      { capture_id: 'a', kind: 'theme', label: 'rest' }, { capture_id: 'b', kind: 'theme', label: 'rest' },
      { capture_id: 'a', kind: 'theme', label: 'the studio' }, { capture_id: 'c', kind: 'mood', label: 'tender' },
      { capture_id: 'a', kind: 'theme', label: 'sleep' },
    ]
    assert.deepEqual(topThemes(t, 2), ['rest', 'sleep'])
    assert.deepEqual(topThemes([]), [])
  })
})
describe('rememberedEntriesLine', () => {
  it('reads naturally', () => {
    assert.match(rememberedEntriesLine(0), /No journal entries/)
    assert.equal(rememberedEntriesLine(1), '1 journal entry you allowed it to remember')
    assert.equal(rememberedEntriesLine(5), '5 journal entries you allowed it to remember')
  })
})
