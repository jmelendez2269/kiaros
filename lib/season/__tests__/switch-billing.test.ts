/**
 * Run: npx tsx --test lib/season/__tests__/switch-billing.test.ts
 *
 * Stripe is a stand-in here: nothing reaches a real account.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { switchSubscriptionToYearly, SwitchError, type SwitchStripe, type SwitchSubscription } from '../switch-billing.ts'
import type { SwitchOffer } from '../turn-of-year.ts'

const offer: SwitchOffer = {
  year: 2027,
  entitlementId: 'monthly-sub',
  productTier: 'planner',
  monthlyPriceCents: 1400,
  yearlyPriceCents: 14000,
  creditCents: 1400,
  dueTodayCents: 12600,
  startsOn: '2026-11-20',
  endsOn: '2027-11-19',
}

function monthlySubscription(overrides: Partial<SwitchSubscription> = {}): SwitchSubscription {
  return {
    id: 'sub_test',
    status: 'active',
    currency: 'usd',
    metadata: { product_tier: 'planner', access_plan: 'monthly' },
    items: { data: [{ id: 'si_test', current_period_end: 1764979200, price: { product: 'prod_test', recurring: { interval: 'month' } } }] },
    ...overrides,
  }
}

function fakeStripe(subscription: SwitchSubscription) {
  const calls: { coupons: unknown[]; updates: Array<{ id: string; params: Record<string, unknown>; key?: string }> } = {
    coupons: [],
    updates: [],
  }
  const stripe: SwitchStripe = {
    subscriptions: {
      async retrieve() {
        return subscription
      },
      async update(id, params, options) {
        calls.updates.push({ id, params, key: options?.idempotencyKey })
        // A year from Nov 20 2026, as Stripe would set it.
        return { ...subscription, items: { data: [{ ...subscription.items.data[0], current_period_end: Date.UTC(2027, 10, 20) / 1000 }] } }
      },
    },
    coupons: {
      async create(params) {
        calls.coupons.push(params)
        return { id: 'coupon_month_paid' }
      },
    },
  }
  return { stripe, calls }
}

describe('switching a monthly subscription to yearly on Nov 20', () => {
  it('moves the item to the yearly price, restarts the cycle today, and credits the month once', async () => {
    const { stripe, calls } = fakeStripe(monthlySubscription())
    const result = await switchSubscriptionToYearly({ stripe, subscriptionId: 'sub_test', offer, tierName: 'Planner', today: '2026-11-20' })

    assert.equal(result.alreadyYearly, false)
    assert.equal(result.periodEnd, '2027-11-20')
    assert.deepEqual(calls.coupons, [
      { amount_off: 1400, currency: 'usd', duration: 'once', max_redemptions: 1, name: 'This month, already paid' },
    ])
    assert.equal(calls.updates.length, 1)
    const { params, key } = calls.updates[0]
    assert.deepEqual(params.items, [
      { id: 'si_test', price_data: { currency: 'usd', product: 'prod_test', unit_amount: 14000, recurring: { interval: 'year' } } },
    ])
    assert.equal(params.billing_cycle_anchor, 'now')
    assert.equal(params.proration_behavior, 'none')
    assert.equal(params.payment_behavior, 'error_if_incomplete')
    assert.deepEqual(params.discounts, [{ coupon: 'coupon_month_paid' }])
    assert.equal((params.metadata as Record<string, string>).access_plan, 'yearly')
    assert.equal(key, 'switch-yearly-sub_test-2026-11-20')
  })

  it('adds no coupon when nothing was paid this month', async () => {
    const { stripe, calls } = fakeStripe(monthlySubscription())
    await switchSubscriptionToYearly({ stripe, subscriptionId: 'sub_test', offer: { ...offer, creditCents: 0, dueTodayCents: 14000 }, tierName: 'Planner', today: '2026-11-20' })
    assert.equal(calls.coupons.length, 0)
    assert.equal(calls.updates[0].params.discounts, undefined)
  })

  it('changes nothing when the subscription is already yearly', async () => {
    const yearly = monthlySubscription({
      items: { data: [{ id: 'si_test', current_period_end: Date.UTC(2027, 10, 20) / 1000, price: { product: 'prod_test', recurring: { interval: 'year' } } }] },
    })
    const { stripe, calls } = fakeStripe(yearly)
    const result = await switchSubscriptionToYearly({ stripe, subscriptionId: 'sub_test', offer, tierName: 'Planner', today: '2026-11-20' })
    assert.equal(result.alreadyYearly, true)
    assert.equal(calls.updates.length, 0)
    assert.equal(calls.coupons.length, 0)
  })

  it('refuses a subscription that is not active', async () => {
    const { stripe, calls } = fakeStripe(monthlySubscription({ status: 'past_due' }))
    await assert.rejects(
      switchSubscriptionToYearly({ stripe, subscriptionId: 'sub_test', offer, tierName: 'Planner', today: '2026-11-20' }),
      (err: unknown) => err instanceof SwitchError && err.reason === 'not_active',
    )
    assert.equal(calls.updates.length, 0)
  })
})
