/**
 * Run: npx tsx --test lib/season/__tests__/turn-of-year.test.ts
 *
 * Every rule is checked against an injected clock: a yearly member on Nov 15,
 * one whose access ends Dec 14, a monthly member switching on Nov 20, and all
 * three again on Dec 1.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAccessCapabilities } from '../../commerce/capabilities.ts'
import {
  canWriteBlueprintFor,
  earlyBlueprintYear,
  nextBlueprintVersion,
  renewalOffer,
  renewedEndsAt,
  rolloverAction,
  seasonYear,
  switchedEntitlementWindow,
  switchToYearlyOffer,
  type SeasonEntitlement,
  type SeasonInput,
} from '../turn-of-year.ts'

const PRICES = {
  planner: { monthlyPriceCents: 1400, annualPriceCents: 14000 },
  planner_oracle: { monthlyPriceCents: 2200, annualPriceCents: 22000 },
} as const
const pricesFor = (tier: string) => PRICES[tier as keyof typeof PRICES] ?? null

/** A yearly subscriber, renewing by itself, whose year runs well into 2027. */
const yearlyMember: SeasonEntitlement = {
  id: 'yearly-sub',
  productTier: 'planner',
  accessPlan: 'yearly',
  source: 'stripe',
  isSubscription: true,
  willAutoRenew: true,
  oracleEnabled: false,
  plannerYear: 2026,
  startsAt: '2026-03-01',
  endsAt: '2027-02-28',
  status: 'active',
}

/** A one-time yearly purchase whose access ends Dec 14, before 2027 begins. */
const endsDec14: SeasonEntitlement = {
  id: 'ends-dec-14',
  productTier: 'planner_oracle',
  accessPlan: 'yearly',
  source: 'stripe',
  isSubscription: false,
  oracleEnabled: true,
  plannerYear: 2026,
  startsAt: '2025-12-15',
  endsAt: '2026-12-14',
  status: 'active',
}

/** A monthly subscriber, paid through Dec 3. */
const monthlyMember: SeasonEntitlement = {
  id: 'monthly-sub',
  productTier: 'planner',
  accessPlan: 'monthly',
  source: 'stripe',
  isSubscription: true,
  willAutoRenew: true,
  oracleEnabled: false,
  plannerYear: 2026,
  startsAt: '2026-11-03',
  endsAt: '2026-12-03',
  status: 'active',
}

function input(today: string, ...entitlements: SeasonEntitlement[]): SeasonInput {
  return { today, entitlements, oneTimeAnnualRollsForward: true }
}

function capabilitiesOn(today: string, ...entitlements: SeasonEntitlement[]) {
  return resolveAccessCapabilities({
    asOf: today,
    authenticated: true,
    entitlements,
    oneTimeAnnualRollsForward: true,
  })
}

function coveredOn(today: string, ...entitlements: SeasonEntitlement[]) {
  const c = capabilitiesOn(today, ...entitlements)
  return [...c.blueprintFullAccessYears, ...c.blueprintWindowedAccessYears]
}

/** Noon on a day in New York, so the planner year reads the same day. */
const noonET = (day: string) => new Date(`${day}T17:00:00.000Z`)

/** The yearly entitlement a monthly member has after switching on Nov 20. */
const switched: SeasonEntitlement = {
  ...monthlyMember,
  accessPlan: 'yearly',
  ...(() => {
    const w = switchedEntitlementWindow({ today: '2026-11-20', stripePeriodEnd: '2027-11-20' })
    return { startsAt: w.starts_at, endsAt: w.ends_at }
  })(),
}

/** The renewal the Dec 14 member buys: it starts the day after the old year ends. */
const dec14Renewal: SeasonEntitlement = {
  ...endsDec14,
  id: 'renewal',
  isSubscription: true,
  willAutoRenew: true,
  startsAt: '2026-12-15',
  endsAt: '2027-12-14',
}

describe('the season', () => {
  it('turns toward next year in November and December only', () => {
    assert.equal(seasonYear('2026-10-31'), null)
    assert.equal(seasonYear('2026-11-01'), 2027)
    assert.equal(seasonYear('2026-12-31'), 2027)
    assert.equal(seasonYear('2027-01-01'), null)
  })
})

describe('a yearly member on Nov 15', () => {
  const today = '2026-11-15'
  it('can write the 2027 Blueprint now', () => {
    assert.equal(earlyBlueprintYear(input(today, yearlyMember)), 2027)
    assert.equal(
      canWriteBlueprintFor({ year: 2027, today, earlyYear: 2027, coveredYears: coveredOn(today, yearlyMember) }),
      true,
    )
  })
  it('does not get 2027 as a full access year before December 1', () => {
    assert.deepEqual(capabilitiesOn(today, yearlyMember).blueprintFullAccessYears, [2026])
  })
  it('is offered neither renewal nor a switch', () => {
    assert.equal(renewalOffer({ ...input(today, yearlyMember), pricesFor }), null)
    assert.equal(switchToYearlyOffer({ ...input(today, yearlyMember), pricesFor, paidThisMonthCents: null }), null)
  })
  it('cannot write early from October, or with Etsy access alone', () => {
    assert.equal(earlyBlueprintYear(input('2026-10-31', yearlyMember)), null)
    assert.equal(earlyBlueprintYear(input(today, { ...yearlyMember, source: 'etsy', isSubscription: false })), null)
  })
  it('cannot write early when one-time access does not roll forward', () => {
    assert.equal(
      earlyBlueprintYear({ today, entitlements: [{ ...yearlyMember, isSubscription: false, source: 'comp' }], oneTimeAnnualRollsForward: false }),
      null,
    )
  })
})

describe('a yearly member whose access ends Dec 14', () => {
  it('can write 2027 early on Nov 15, because access reaches December 1', () => {
    assert.equal(earlyBlueprintYear(input('2026-11-15', endsDec14)), 2027)
  })
  it('is offered a renewal that starts the day after, costing no days', () => {
    const offer = renewalOffer({ ...input('2026-11-15', endsDec14), pricesFor })
    assert.ok(offer)
    assert.equal(offer.year, 2027)
    assert.equal(offer.currentEndsOn, '2026-12-14')
    assert.equal(offer.newStartsOn, '2026-12-15')
    assert.equal(offer.newEndsOn, '2027-12-14')
    assert.equal(offer.priceCents, 22000)
    assert.equal(offer.productTier, 'planner_oracle')
  })
  it('is not offered renewal again once the renewal is bought', () => {
    assert.equal(renewalOffer({ ...input('2026-11-15', endsDec14, dec14Renewal), pricesFor }), null)
  })
  it('is not offered renewal when the subscription already renews by itself', () => {
    const renewsItself = { ...endsDec14, isSubscription: true, willAutoRenew: true, startsAt: '2025-12-15' }
    assert.equal(renewalOffer({ ...input('2026-11-15', renewsItself), pricesFor }), null)
  })
  it('opens 2027 today with a renewal when access would end before December 1', () => {
    const endsNov25 = { ...endsDec14, startsAt: '2025-11-26', endsAt: '2026-11-25' }
    assert.equal(earlyBlueprintYear(input('2026-11-15', endsNov25)), null)
    const renewal = { ...dec14Renewal, startsAt: '2026-11-26', endsAt: '2027-11-25' }
    assert.equal(earlyBlueprintYear(input('2026-11-15', endsNov25, renewal)), 2027)
  })
  it('carries the next Stripe year on from the end of the renewed year', () => {
    // Charged on Nov 15 2027, a year after the early renewal, but the term ran to Dec 14 2027.
    assert.equal(
      renewedEndsAt({
        currentEndsAt: '2027-12-14',
        invoicePeriodStart: '2027-11-15',
        stripePeriodEnd: '2028-11-15',
        renewalStartsAt: '2026-12-15',
      }),
      '2028-12-13',
    )
    // An ordinary yearly renewal keeps the old rule.
    assert.equal(
      renewedEndsAt({
        currentEndsAt: '2027-02-28',
        invoicePeriodStart: '2027-03-01',
        stripePeriodEnd: '2028-03-01',
        renewalStartsAt: null,
      }),
      '2028-03-01',
    )
  })
})

describe('a monthly member switching on Nov 20', () => {
  const today = '2026-11-20'
  it('is offered yearly with this month already paid taken off', () => {
    const offer = switchToYearlyOffer({ ...input(today, monthlyMember), pricesFor, paidThisMonthCents: 1400 })
    assert.ok(offer)
    assert.equal(offer.creditCents, 1400)
    assert.equal(offer.dueTodayCents, 12600)
    assert.equal(offer.yearlyPriceCents, 14000)
    assert.equal(offer.startsOn, '2026-11-20')
    assert.equal(offer.endsOn, '2027-11-19')
  })
  it('credits only what was actually paid, never more than the year', () => {
    assert.equal(switchToYearlyOffer({ ...input(today, monthlyMember), pricesFor, paidThisMonthCents: 0 })?.dueTodayCents, 14000)
    assert.equal(switchToYearlyOffer({ ...input(today, monthlyMember), pricesFor, paidThisMonthCents: 99999 })?.dueTodayCents, 0)
    assert.equal(switchToYearlyOffer({ ...input(today, monthlyMember), pricesFor, paidThisMonthCents: null })?.creditCents, 1400)
  })
  it('cannot write 2027 early while monthly', () => {
    assert.equal(earlyBlueprintYear(input(today, monthlyMember)), null)
  })
  it('after switching, can write 2027 today and is not offered the switch again', () => {
    assert.equal(switched.startsAt, '2026-11-20')
    assert.equal(switched.endsAt, '2027-11-20')
    assert.equal(earlyBlueprintYear(input(today, switched)), 2027)
    assert.equal(switchToYearlyOffer({ ...input(today, switched), pricesFor, paidThisMonthCents: 1400 }), null)
    assert.equal(renewalOffer({ ...input(today, switched), pricesFor }), null)
  })
  it('is not offered a switch outside the season', () => {
    const october = { ...monthlyMember, startsAt: '2026-10-03', endsAt: '2026-11-03' }
    assert.equal(switchToYearlyOffer({ ...input('2026-10-20', october), pricesFor, paidThisMonthCents: 1400 }), null)
  })
})

describe('all three on Dec 1', () => {
  const today = '2026-12-01'
  const asOf = noonET(today)

  it('no longer write early: 2027 is the current year', () => {
    for (const e of [yearlyMember, endsDec14, switched]) {
      assert.equal(earlyBlueprintYear(input(today, e)), null)
    }
  })
  it('all have 2027 as a full access year', () => {
    for (const e of [yearlyMember, endsDec14, switched]) {
      assert.ok(capabilitiesOn(today, e).blueprintFullAccessYears.includes(2027), e.id)
    }
  })
  it('a member who wrote early moves to 2027 without generating again', () => {
    for (const e of [yearlyMember, endsDec14, switched]) {
      assert.equal(
        rolloverAction({ profilePlanYear: 2026, coveredYears: coveredOn(today, e), asOf, currentYearBlueprint: { status: 'ready' } }),
        'advance',
      )
    }
  })
  it('a member who did not write early is sent to write it', () => {
    assert.equal(
      rolloverAction({ profilePlanYear: 2026, coveredYears: coveredOn(today, yearlyMember), asOf, currentYearBlueprint: null }),
      'generate',
    )
    assert.equal(
      rolloverAction({ profilePlanYear: 2026, coveredYears: coveredOn(today, yearlyMember), asOf, currentYearBlueprint: { status: 'error' } }),
      'generate',
    )
  })
  it('nothing happens once the profile is on 2027', () => {
    assert.equal(
      rolloverAction({ profilePlanYear: 2027, coveredYears: coveredOn(today, yearlyMember), asOf, currentYearBlueprint: { status: 'ready' } }),
      'none',
    )
  })
  it('the Dec 14 member is still offered renewal, the yearly and switched members are not', () => {
    assert.equal(renewalOffer({ ...input(today, endsDec14), pricesFor })?.newStartsOn, '2026-12-15')
    assert.equal(renewalOffer({ ...input(today, yearlyMember), pricesFor }), null)
    assert.equal(renewalOffer({ ...input(today, switched), pricesFor }), null)
  })
  it('a monthly member who did not switch sees 2027 windowed, and can still switch', () => {
    const monthlyDec = { ...monthlyMember, startsAt: '2026-11-03', endsAt: '2026-12-03' }
    assert.ok(capabilitiesOn(today, monthlyDec).blueprintWindowedAccessYears.includes(2027))
    assert.equal(switchToYearlyOffer({ ...input(today, monthlyDec), pricesFor, paidThisMonthCents: 1400 })?.dueTodayCents, 12600)
  })
  it('anyone covered can rewrite 2027 until it begins', () => {
    const covered = coveredOn(today, yearlyMember)
    assert.equal(canWriteBlueprintFor({ year: 2027, today, earlyYear: null, coveredYears: covered }), true)
    assert.equal(canWriteBlueprintFor({ year: 2027, today: '2026-12-31', earlyYear: null, coveredYears: covered }), true)
    assert.equal(canWriteBlueprintFor({ year: 2027, today: '2027-01-01', earlyYear: null, coveredYears: covered }), false)
    assert.equal(canWriteBlueprintFor({ year: 2027, today, earlyYear: null, coveredYears: [2026] }), false)
  })
})

describe('Blueprint versions', () => {
  it('count up from the newest, never a fixed number', () => {
    assert.equal(nextBlueprintVersion(null), 1)
    assert.equal(nextBlueprintVersion(undefined), 1)
    assert.equal(nextBlueprintVersion(3), 4)
  })
})
