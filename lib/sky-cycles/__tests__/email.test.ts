/**
 * Run: npx tsx --test lib/sky-cycles/__tests__/email.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import collective from '@/lib/sky-cycles/data/collective-cycles.json'
import { selectSkyCycleEmailItems, sentKey } from '@/lib/sky-cycles/email-selection'
import type { SkyCycle } from '@/lib/sky-cycles/types'
import { skyCycleUnsubscribeToken, verifySkyCycleUnsubscribeToken } from '@/lib/email/sky-cycle-unsubscribe-token'
import { skyCycleEmail } from '@/lib/email/sky-cycle-templates'

const cycles = (collective as { cycles: SkyCycle[] }).cycles
const mercury = cycles.find((c) => c.title === 'Mercury retrograde' && c.startDate === '2026-10-25')!

describe('sky cycle email selection', () => {
  it('sends a heads-up inside the window, once', () => {
    const first = selectSkyCycleEmailItems([mercury], '2026-10-19', new Set())
    assert.equal(first.headsUps.length, 1)
    const again = selectSkyCycleEmailItems([mercury], '2026-10-20', new Set([sentKey(mercury.id, 'heads_up')]))
    assert.equal(again.headsUps.length, 0)
  })
  it('sends nothing while the cycle is under way', () => {
    const during = selectSkyCycleEmailItems([mercury], '2026-11-03', new Set())
    assert.equal(during.headsUps.length + during.lookBacks.length, 0)
  })
  it('sends the look-back note on days 1 to 3 after it ends', () => {
    assert.equal(selectSkyCycleEmailItems([mercury], '2026-11-14', new Set()).lookBacks.length, 0)
    assert.equal(selectSkyCycleEmailItems([mercury], '2026-11-15', new Set()).lookBacks.length, 1)
    assert.equal(selectSkyCycleEmailItems([mercury], '2026-11-18', new Set()).lookBacks.length, 0)
  })
  it('caps one email at four items across a busy day', () => {
    const picked = selectSkyCycleEmailItems(cycles, '2026-02-12', new Set())
    assert.ok(picked.headsUps.length + picked.lookBacks.length <= 4)
  })
})

describe('signed unsubscribe link', () => {
  it('verifies its own token and rejects another member', () => {
    const token = skyCycleUnsubscribeToken('user-a', 'test-secret')
    assert.equal(verifySkyCycleUnsubscribeToken('user-a', token, 'test-secret'), true)
    assert.equal(verifySkyCycleUnsubscribeToken('user-b', token, 'test-secret'), false)
    assert.equal(verifySkyCycleUnsubscribeToken('user-a', 'nope', 'test-secret'), false)
  })
})

describe('sky cycle email content', () => {
  it('names the cycle, links Today and the journal, and escapes HTML', () => {
    const { headsUps } = selectSkyCycleEmailItems([mercury], '2026-10-19', new Set())
    const email = skyCycleEmail({
      displayName: '<Jo>',
      headsUps,
      lookBacks: [],
      appUrl: 'https://example.test',
      unsubscribeUrl: 'https://example.test/u',
    })
    assert.match(email.subject, /^Heads up: Mercury retrograde, begins in 6 days/)
    assert.ok(email.text.includes('https://example.test/today'))
    assert.ok(email.text.includes('https://example.test/journal?prompt='))
    assert.ok(email.html.includes('&lt;Jo&gt;'))
    assert.ok(!email.html.includes('<Jo>'))
    assert.ok(!/ will |destined|meant to/i.test(email.text), 'no predictive wording')
  })
})
