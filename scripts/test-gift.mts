/**
 * Gift a year: codes, entitlement window, access rule, year-turn sales copy,
 * and the live sky ticker on the home page.
 */
import assert from 'node:assert/strict'

import {
  buildGiftEntitlementWindow,
  generateGiftCode,
  giftCheckoutSchema,
  normalizeGiftCode,
} from '../lib/commerce/gift.ts'
import { resolveAccessCapabilities } from '../lib/commerce/capabilities.ts'
import { getSalesYearCopy, getSellingPlannerYear } from '../lib/commerce/planner-year.ts'
import { giftPurchaseEmail } from '../lib/email/gift-templates.ts'

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`ok - ${name}`)
}

// ── Codes ─────────────────────────────────────────────────────────────────
check('codes have the KAIROS-XXXX-XXXX-XXXX shape and no look-alike characters', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 2000; i++) {
    const code = generateGiftCode()
    assert.match(code, /^KAIROS-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/)
    assert.doesNotMatch(code.slice(7), /[01OILU]/)
    seen.add(code)
  }
  assert.equal(seen.size, 2000)
})

check('codes normalize from however they were typed', () => {
  assert.equal(normalizeGiftCode('kairos-7hqk-m2xp-9dfa'), 'KAIROS-7HQK-M2XP-9DFA')
  assert.equal(normalizeGiftCode(' 7HQK M2XP 9DFA '), 'KAIROS-7HQK-M2XP-9DFA')
  assert.equal(normalizeGiftCode('KAIROS7HQKM2XP9DFA'), 'KAIROS-7HQK-M2XP-9DFA')
  assert.equal(normalizeGiftCode('KAIROS-7HQK-M2XP'), null)
  assert.equal(normalizeGiftCode('KAIROS-0HQK-M2XP-9DFA'), null)
  assert.equal(normalizeGiftCode(''), null)
  assert.equal(normalizeGiftCode(undefined), null)
})

check('checkout input: empty optional text becomes null, tier is required', () => {
  const ok = giftCheckoutSchema.parse({ tierKey: 'planner', purchaserName: '  ', recipientName: 'Sam', giftMessage: '' })
  assert.equal(ok.purchaserName, null)
  assert.equal(ok.recipientName, 'Sam')
  assert.equal(ok.giftMessage, null)
  assert.equal(giftCheckoutSchema.safeParse({ tierKey: 'stelloquy_sampler' }).success, false)
  assert.equal(giftCheckoutSchema.safeParse({ tierKey: 'planner', giftMessage: 'x'.repeat(601) }).success, false)
})

// ── Window ────────────────────────────────────────────────────────────────
check('a gift runs a year, stretched to Dec 31 when it would end Oct to Dec', () => {
  assert.deepEqual(buildGiftEntitlementWindow('2027-03-10'), { startsAt: '2027-03-10', endsAt: '2028-03-08' })
  assert.deepEqual(buildGiftEntitlementWindow('2026-12-10'), { startsAt: '2026-12-10', endsAt: '2027-12-31' })
  assert.deepEqual(buildGiftEntitlementWindow('2026-11-25'), { startsAt: '2026-11-25', endsAt: '2027-12-31' })
})

// ── Access ────────────────────────────────────────────────────────────────
function giftAccess(startsAt: string, plannerYear: number, asOf: string, source = 'gift') {
  const window = buildGiftEntitlementWindow(startsAt)
  return resolveAccessCapabilities({
    asOf,
    authenticated: true,
    entitlements: [{
      accessPlan: 'yearly',
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      oracleEnabled: false,
      plannerYear,
      source,
      status: 'active',
    }],
  })
}

check('a gift redeemed in November rolls into next year once Dec 1 arrives', () => {
  const before = giftAccess('2026-11-25', 2026, '2026-11-26')
  assert.equal(before.canUsePlanner, true)
  assert.deepEqual(before.blueprintFullAccessYears, [2026])

  const after = giftAccess('2026-11-25', 2026, '2026-12-02')
  assert.deepEqual(after.blueprintFullAccessYears, [2026, 2027])

  const lateNextYear = giftAccess('2026-11-25', 2026, '2027-12-20')
  assert.equal(lateNextYear.canUsePlanner, true)
})

check('a plain one-time purchase still stays locked to its own year', () => {
  const after = giftAccess('2026-11-25', 2026, '2026-12-02', 'etsy')
  assert.deepEqual(after.blueprintFullAccessYears, [2026])
})

check('a gift that starts later is not active yet', () => {
  const waiting = giftAccess('2027-02-01', 2027, '2026-12-15')
  assert.equal(waiting.canUsePlanner, false)
})

// ── Sales copy ────────────────────────────────────────────────────────────
check('the site sells next year from October, and the hook follows the calendar', () => {
  const nov = new Date('2026-11-20T15:00:00Z')
  assert.equal(getSellingPlannerYear(nov), 2027)
  const novCopy = getSalesYearCopy(nov)
  assert.equal(novCopy.hook, 'Join now and you get the rest of 2026, plus all of 2027.')
  assert.match(novCopy.detail ?? '', /2027 Blueprint opens Dec 1/)

  const dec = getSalesYearCopy(new Date('2026-12-05T15:00:00Z'))
  assert.equal(dec.sellingYear, 2027)
  assert.match(dec.hook ?? '', /^2027 Blueprints are open/)
  assert.equal(dec.detail, null)

  const feb = getSalesYearCopy(new Date('2027-02-10T15:00:00Z'))
  assert.equal(feb.sellingYear, 2027)
  assert.equal(feb.hook, null)

  // Nov 30 late evening in New York is still November.
  assert.equal(getSalesYearCopy(new Date('2026-12-01T03:00:00Z')).detail !== null, true)
})

// ── Email ─────────────────────────────────────────────────────────────────
check('buyer email carries the code and link and escapes names', () => {
  const email = giftPurchaseEmail({
    code: 'KAIROS-7HQK-M2XP-9DFA',
    redeemUrl: 'https://kairosplanner.xyz/gift/redeem?code=KAIROS-7HQK-M2XP-9DFA',
    tierName: 'Kairos Planner',
    recipientName: '<Sam>',
    purchaserName: 'Ana',
  })
  assert.match(email.text, /KAIROS-7HQK-M2XP-9DFA/)
  assert.match(email.text, /gift\/redeem\?code=/)
  assert.doesNotMatch(email.html, /<Sam>/)
  assert.match(email.html, /&lt;Sam&gt;/)
  const anonymous = giftPurchaseEmail({ code: 'X', redeemUrl: 'u', tierName: 'Kairos Planner', recipientName: null, purchaserName: null })
  assert.match(anonymous.text, /a year of Kairos Planner is ready/)
})

console.log(`\n${passed} gift checks passed`)
