/**
 * The "What it was about" thread section and the transit meaning lines.
 * Run: npx tsx --test lib/period-review/__tests__/thread-sections.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { flattenPeriodReviewSections, parseLegacySummarySections, periodReviewSectionsSchema } from '@/lib/period-review/report-schema'
import { assemblePeriodReviewSystemPrompt } from '@/lib/ai/period-review-system-prompt'
import { transitLens } from '@/lib/sky-cycles/copy'
import type { SkyCycle } from '@/lib/sky-cycles/types'

describe('Look back thread section', () => {
  it('leads with the thread and renames the sky section beside it', () => {
    const text = flattenPeriodReviewSections({ thread: 'The month circled one question.', sky: 'Saturn pressed on it.', questionToCarry: 'What steadied you?' })
    assert.ok(text.startsWith('What it was about\n\nThe month circled one question.'))
    assert.ok(text.includes('How the sky sat with it\n\nSaturn pressed on it.'))
    assert.deepEqual(parseLegacySummarySections(text), { thread: 'The month circled one question.', sky: 'Saturn pressed on it.', questionToCarry: 'What steadied you?' })
  })

  it('still reads reviews saved before the thread existed', () => {
    const legacy = flattenPeriodReviewSections({ sky: 'Mercury went retrograde.', inYourWords: 'You wrote about rest.' })
    assert.ok(legacy.startsWith('The sky'))
    assert.deepEqual(parseLegacySummarySections(legacy), { sky: 'Mercury went retrograde.', inYourWords: 'You wrote about rest.' })
    assert.ok(periodReviewSectionsSchema.safeParse({ thread: 'x' }).success)
  })

  it('asks the model to integrate rather than recount', () => {
    const system = assemblePeriodReviewSystemPrompt()
    assert.ok(system.includes('Integrate. Every paragraph connects at least two different kinds of information'))
    assert.ok(system.includes('Never walk through entries in date order'))
    assert.ok(system.includes('Never list sign changes or dates for their own sake'))
    assert.ok(system.includes('never the member\'s readiness'))
    assert.ok(!system.includes('&'))
    assert.ok(!system.includes('—'))
  })
})

describe('Transit meaning lines', () => {
  const base: SkyCycle = {
    id: 'p', kind: 'personal_transit', scope: 'personal', title: 'Saturn squares your Moon', subtitle: 'Sep 20 to Dec 14',
    startDate: '2026-09-20', endDate: '2026-12-14', headsUpDays: 14, keyDates: [], planet: 'Saturn', natalPoint: 'Moon',
    aspect: 'square', familyKey: 'personal:Saturn:square:Moon',
  }

  it('gives planet, aspect, chart point and house in plain words', () => {
    const line = transitLens(base, { sign: 'Cancer', house: 4 })
    assert.ok(line.startsWith('Saturn squares your Moon (Sep 20 to Dec 14): Saturn, structure, commitments and limits'))
    assert.ok(line.includes('friction that asks for an adjustment'))
    assert.ok(line.includes('your feelings, needs and home life'))
    assert.ok(line.includes('in Cancer in your 4th house, the area of home, roots and family'))
  })

  it('uses correct ordinals and leaves the house out when unknown', () => {
    assert.ok(transitLens(base, { house: 1 }).includes('your 1st house'))
    assert.ok(transitLens(base, { house: 2 }).includes('your 2nd house'))
    assert.ok(transitLens(base, { house: 3 }).includes('your 3rd house'))
    assert.ok(transitLens(base, { house: 11 }).includes('your 11th house'))
    assert.ok(transitLens(base, { house: 12 }).includes('your 12th house'))
    assert.ok(!transitLens(base).includes('house'))
  })

  it('falls back to the cycle meaning for collective events', () => {
    const line = transitLens({ ...base, kind: 'retrograde', scope: 'collective', title: 'Mercury retrograde', subtitle: 'in Scorpio', planet: 'Mercury', natalPoint: undefined, aspect: undefined })
    assert.ok(line.startsWith('Mercury retrograde (in Scorpio): Astrologers often read Mercury retrograde'))
  })
})
