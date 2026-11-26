/**
 * Monthly to yearly in Stripe. Kept apart from lib/commerce/stripe.ts (which is
 * server-only) so it can be tested with a stand-in client.
 *
 * The subscription keeps its id and payment method. Its item moves to the
 * yearly price, the billing cycle restarts today, and what was already paid
 * this month comes off the first yearly invoice as a one-time coupon. No
 * proration is created, so the month is credited exactly once.
 */
import type { SwitchOffer } from './turn-of-year.ts'

export interface SwitchSubscription {
  id: string
  status: string
  currency: string
  metadata?: Record<string, string> | null
  items: {
    data: Array<{
      id: string
      current_period_end?: number | null
      price: {
        product: string | { id: string }
        recurring?: { interval: string } | null
      }
    }>
  }
}

/** The parts of the Stripe client this needs. */
export interface SwitchStripe {
  subscriptions: {
    retrieve(id: string): Promise<SwitchSubscription>
    update(
      id: string,
      params: Record<string, unknown>,
      options?: { idempotencyKey?: string },
    ): Promise<SwitchSubscription>
  }
  coupons: {
    create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<{ id: string }>
  }
}

export class SwitchError extends Error {
  readonly reason: 'not_active' | 'no_item'
  constructor(reason: 'not_active' | 'no_item', message: string) {
    super(message)
    this.reason = reason
  }
}

export interface SwitchResult {
  subscriptionId: string
  /** The new period end, YYYY-MM-DD, when Stripe gave one. */
  periodEnd: string | null
  /** True when the subscription was already yearly, so nothing was changed. */
  alreadyYearly: boolean
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString().slice(0, 10) : null
}

export async function switchSubscriptionToYearly(params: {
  stripe: SwitchStripe
  subscriptionId: string
  offer: SwitchOffer
  tierName: string
  /** YYYY-MM-DD, used in idempotency keys so a double click switches once. */
  today: string
}): Promise<SwitchResult> {
  const { stripe, subscriptionId, offer, tierName, today } = params
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new SwitchError('not_active', 'This subscription is not active, so it cannot switch to yearly.')
  }
  const item = subscription.items.data[0]
  if (!item) throw new SwitchError('no_item', 'This subscription has no billing item.')

  if (item.price.recurring?.interval === 'year') {
    return { subscriptionId, periodEnd: isoFromUnix(item.current_period_end), alreadyYearly: true }
  }

  const product = typeof item.price.product === 'string' ? item.price.product : item.price.product.id
  const currency = subscription.currency || 'usd'

  const coupon =
    offer.creditCents > 0
      ? await stripe.coupons.create(
          {
            amount_off: offer.creditCents,
            currency,
            duration: 'once',
            max_redemptions: 1,
            name: 'This month, already paid',
          },
          { idempotencyKey: `switch-yearly-coupon-${subscriptionId}-${today}` },
        )
      : null

  const updated = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [
        {
          id: item.id,
          price_data: {
            currency,
            product,
            unit_amount: offer.yearlyPriceCents,
            recurring: { interval: 'year' },
          },
        },
      ],
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
      // If the card is declined, Stripe leaves the subscription monthly.
      payment_behavior: 'error_if_incomplete',
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      description: `${tierName} annual access`,
      metadata: {
        ...(subscription.metadata ?? {}),
        access_plan: 'yearly',
        switched_from_monthly_on: today,
      },
    },
    { idempotencyKey: `switch-yearly-${subscriptionId}-${today}` },
  )

  return {
    subscriptionId,
    periodEnd: isoFromUnix(updated.items.data[0]?.current_period_end),
    alreadyYearly: false,
  }
}
