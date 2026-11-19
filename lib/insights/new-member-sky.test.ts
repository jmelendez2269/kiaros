import assert from 'node:assert/strict'
import test from 'node:test'
import { ESTABLISHED_PATTERN_MIN_SAMPLE } from '../journal/pattern-discoveries'
import { firstPatternProgress, isSkyBeginning, layoutNewMemberSky, MAX_ENTRY_STARS } from './new-member-sky'

test('progress is toward the app threshold, not a fixed number', () => {
  const none = firstPatternProgress([])
  assert.deepEqual(none, { have: 0, of: ESTABLISHED_PATTERN_MIN_SAMPLE, toGo: ESTABLISHED_PATTERN_MIN_SAMPLE })
  const one = firstPatternProgress([1, 1, 1])
  assert.equal(one.have, 1)
  assert.equal(one.of, ESTABLISHED_PATTERN_MIN_SAMPLE)
  assert.equal(one.toGo, ESTABLISHED_PATTERN_MIN_SAMPLE - 1)
})

test('progress follows the sky written under most, and never passes the threshold', () => {
  assert.equal(firstPatternProgress([1, 3, 2]).have, 3)
  const done = firstPatternProgress([ESTABLISHED_PATTERN_MIN_SAMPLE + 5])
  assert.equal(done.have, ESTABLISHED_PATTERN_MIN_SAMPLE)
  assert.equal(done.toGo, 0)
})

test('the new-member sky shows until a pattern has formed', () => {
  assert.equal(isSkyBeginning([]), true)
  assert.equal(isSkyBeginning([ESTABLISHED_PATTERN_MIN_SAMPLE - 1]), true)
  assert.equal(isSkyBeginning([ESTABLISHED_PATTERN_MIN_SAMPLE]), false)
})

test('one star per entry, with outlines for what is still to come', () => {
  const layout = layoutNewMemberSky(1, 1)
  assert.equal(layout.shared.length, 1)
  assert.equal(layout.loose.length, 0)
  assert.equal(layout.ghosts.length, ESTABLISHED_PATTERN_MIN_SAMPLE - 1)
  assert.equal(layout.shared.length + layout.loose.length, 1)
})

test('entries under skies of their own are loose stars', () => {
  const layout = layoutNewMemberSky(5, 2)
  assert.equal(layout.shared.length + layout.loose.length, 5)
  assert.equal(layout.ghosts.length, ESTABLISHED_PATTERN_MIN_SAMPLE - 2)
})

test('no entries yet draws outlines only, and a long record is capped', () => {
  const empty = layoutNewMemberSky(0, 0)
  assert.equal(empty.shared.length + empty.loose.length, 0)
  assert.equal(empty.ghosts.length, ESTABLISHED_PATTERN_MIN_SAMPLE)
  const long = layoutNewMemberSky(200, 3)
  assert.ok(long.shared.length + long.loose.length <= MAX_ENTRY_STARS)
})
