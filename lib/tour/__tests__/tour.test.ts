/**
 * The sidebar tour and the on-page hints: the stops, their order, and how a
 * page's hints step and are remembered.
 * Run: npx tsx --test lib/tour/__tests__/tour.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TOUR_STEPS, tourTargets } from '../config'
import { nextHint, pageHintIds, PAGE_HINTS, parseSeenHints, type HintPage } from '../hints'

const sidebar = readFileSync(new URL('../../../components/almanac/AlmanacSidebar.tsx', import.meta.url), 'utf8')

describe('the sidebar tour', () => {
  it('visits every top-level item in sidebar order, then Curriculum', () => {
    assert.deepEqual(TOUR_STEPS.map(s => s.id), ['today', 'journal', 'stelloquy', 'insights', 'year', 'blueprint', 'self', 'curriculum'])
    const navKeys = [...sidebar.matchAll(/^    key: '(\w+)',$/gm)].map(m => m[1])
    assert.deepEqual(TOUR_STEPS.slice(0, navKeys.length).map(s => s.id), navKeys, 'tour order follows the NAV list')
  })
  it('points each stop at a sidebar item that exists', () => {
    for (const step of TOUR_STEPS.filter(s => s.id !== 'curriculum')) {
      assert.equal(step.tourTarget, `nav-${step.id}`)
      assert.ok(sidebar.includes(`key: '${step.id}'`), step.id)
    }
  })
  it('falls back to the section when Curriculum is tucked inside a closed one', () => {
    const curriculum = TOUR_STEPS.find(s => s.id === 'curriculum')!
    assert.deepEqual(tourTargets(curriculum), ['nav-curriculum', 'nav-goalsStudy', 'nav-self'])
    assert.deepEqual(tourTargets(TOUR_STEPS[0]), ['nav-today'])
  })
  it('sends each stop somewhere, with something to say', () => {
    for (const step of TOUR_STEPS) {
      assert.match(step.requiredRoute, /^\/[a-z]/)
      assert.ok(step.body.length > 40 && step.body.length < 330, `${step.id} body length`)
      assert.doesNotMatch(step.body, /[—&]|optimi[sz]e|level up|grind/i, step.id)
    }
  })
})

describe('on-page hints', () => {
  const pages = Object.keys(PAGE_HINTS) as HintPage[]
  it('gives every hint its own id and keeps each one short', () => {
    const ids = pages.flatMap(pageHintIds)
    assert.equal(new Set(ids).size, ids.length)
    for (const page of pages) {
      assert.ok(PAGE_HINTS[page].length >= 1 && PAGE_HINTS[page].length <= 3, `${page}: one to three hints`)
      for (const hint of PAGE_HINTS[page]) {
        assert.ok(hint.body.length < 300, `${hint.id} is brief`)
        assert.doesNotMatch(`${hint.title} ${hint.body}`, /[—&]|optimi[sz]e|level up|grind|should/i, hint.id)
      }
    }
  })
  it('steps through a page one hint at a time', () => {
    assert.deepEqual(nextHint('today', []), { hint: PAGE_HINTS.today[0], position: 1, total: 3 })
    assert.equal(nextHint('today', ['today-check-in'])?.hint.id, 'today-written-under')
    assert.equal(nextHint('today', ['today-check-in', 'today-written-under'])?.position, 3)
  })
  it('is done once every hint on the page is seen, whatever else is', () => {
    assert.equal(nextHint('today', pageHintIds('today')), null)
    assert.equal(nextHint('reviews', pageHintIds('today'))?.hint.id, 'reviews-year')
  })
  it('reads what was remembered, and shrugs off anything malformed', () => {
    assert.deepEqual(parseSeenHints('["a","b"]'), ['a', 'b'])
    assert.deepEqual(parseSeenHints('["a",3,null]'), ['a'])
    assert.deepEqual(parseSeenHints('{"a":1}'), [])
    assert.deepEqual(parseSeenHints('not json'), [])
    assert.deepEqual(parseSeenHints(null), [])
  })
})
