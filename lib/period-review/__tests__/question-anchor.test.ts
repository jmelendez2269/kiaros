/**
 * "A question to carry" must name one concrete thing from the period.
 * Run: npx tsx --test lib/period-review/__tests__/question-anchor.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { periodFor } from '@/lib/period-review/periods'
import { checkQuestionToCarry } from '@/lib/period-review/question-anchor'
import { assemblePeriodReviewSystemPrompt, assemblePeriodReviewUserPrompt } from '@/lib/ai/period-review-system-prompt'
import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'

const sources: PeriodReviewSourceBundle = {
  period: periodFor('month', 2026, 10),
  displayName: 'Test User',
  sky: {
    moonPhases: [],
    retrogradePeriods: [],
    significantTransits: [],
    ingresses: [{ planet: 'Sun' as const, sign: 'Scorpio', date: '2026-10-23' }],
    eclipseCount: 0,
    signChangeCount: 1,
    text: 'Saturn trine natal Jupiter and Pluto square natal Moon, Oct 15 to 18. Venus retrograde from Oct 25.',
  },
  planTasksCompleted: [{ title: 'Finish the garden bed', date: '2026-10-12' }],
  planTasksOpen: [{ title: 'Call the landlord', date: '2026-10-28' }],
  planTasksCompletedCount: 1,
  planTasksOpenCount: 1,
  planTasksTotal: 2,
  dailyLogDays: 4,
  checkIns: [],
  goalsActive: 1,
  goalsCompletedInPeriod: 0,
  goalsCompletedApproximate: false,
  intentions: ['Rest before deadlines'],
  journalEntryCount: 1,
  journalExcerpts: [{ date: '2026-10-16', excerpt: 'Felt stretched thin by the move.' }],
  quarterBlueprintTheme: null,
  monthBlueprintTheme: null,
}

describe('Period Review: question to carry anchor', () => {
  it('rejects the generic question from the Oct 2026 prod review', () => {
    const r = checkQuestionToCarry('What from October, if anything, would you like to carry into November?', sources)
    assert.deepEqual(r, { ok: false, reason: 'no-anchor' })
  })

  it('rejects other unanchored questions', () => {
    for (const q of [
      'What would you like to carry into November?',
      'Looking back, what stands out most to you?',
      'What do you want more of next month?',
    ]) {
      assert.equal(checkQuestionToCarry(q, sources).ok, false, q)
    }
  })

  it('accepts a dated sky overlap', () => {
    const r = checkQuestionToCarry(
      'Your entry on the 16th fell during the Saturn and Jupiter trine; what do you notice about that week now?',
      sources,
    )
    assert.equal(r.ok, true)
  })

  it('accepts a journal theme, an intention, or a task', () => {
    for (const q of [
      'What does feeling stretched thin by the move look like from here?',
      'How would you like resting before deadlines to look in November?',
      'Calling the landlord is still open; what would make it feel lighter?',
      'What did finishing the garden bed teach you about pacing?',
    ]) {
      assert.equal(checkQuestionToCarry(q, sources).ok, true, q)
    }
  })

  it('rejects prediction or causal wording even when anchored', () => {
    assert.deepEqual(
      checkQuestionToCarry('Will Venus retrograde bring change to the move?', sources),
      { ok: false, reason: 'predictive' },
    )
    assert.deepEqual(
      checkQuestionToCarry('Did the Saturn trine cause the stretched thin feeling?', sources),
      { ok: false, reason: 'predictive' },
    )
  })

  it('rejects a statement that is not a question', () => {
    assert.deepEqual(checkQuestionToCarry('Carry the garden bed into November.', sources), {
      ok: false,
      reason: 'not-a-question',
    })
  })

  it('prompts ask for one concrete anchor, Stella rules intact', () => {
    const system = assemblePeriodReviewSystemPrompt()
    assert.ok(system.includes('You are Stella'))
    assert.ok(system.includes('Pattern, not prophecy'))
    assert.ok(system.includes('must name one concrete thing from this period'))
    assert.ok(!system.includes('&'))
    assert.ok(!/weird/i.test(system))
    const user = assemblePeriodReviewUserPrompt(sources)
    assert.ok(user.includes('It must name one concrete thing listed above'))
    assert.ok(!user.includes('what they would like to carry into November'))
  })
})
