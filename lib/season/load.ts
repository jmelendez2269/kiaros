import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { getCommerceTier, getOneTimeAnnualRollsForward, parseCommerceTierKey } from '@/lib/commerce/config'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { getPlannerYearWithOverride } from '@/lib/commerce/planner-year'
import { getStripeClient } from '@/lib/commerce/stripe'
import { isSubscriptionScheduledToCancel } from '@/lib/commerce/subscription-cancel-metadata'
import { lookAheadDateISO } from '@/lib/look-ahead/window'
import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  canWriteBlueprintFor,
  earlyBlueprintYear,
  renewalOffer,
  seasonEntitlementFromRow,
  seasonYear,
  switchToYearlyOffer,
  type RenewalOffer,
  type SeasonEntitlement,
  type SwitchOffer,
  type TierPrices,
} from './turn-of-year'

const ENTITLEMENT_SELECT =
  'id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan'

export interface SeasonOrder {
  id: string
  stripe_subscription_id: string | null
  amount_total_cents: number | null
  metadata: Record<string, unknown> | null
}

export interface SeasonRecords {
  entitlements: ProductEntitlementRecord[]
  orders: Map<string, SeasonOrder>
}

export function pricesFor(productTier: string): TierPrices | null {
  const key = parseCommerceTierKey(productTier)
  if (!key) return null
  const tier = getCommerceTier(key)
  return { monthlyPriceCents: tier.monthlyPriceCents, annualPriceCents: tier.annualPriceCents }
}

/** The member's entitlements and the Stripe orders behind them. Reads only. */
export async function loadSeasonRecords(profileId: string): Promise<SeasonRecords> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('product_entitlements')
    .select(ENTITLEMENT_SELECT)
    .eq('user_id', profileId)
    .neq('status', 'revoked')
  if (error) throw new Error('Could not load your membership')
  const entitlements = (data ?? []) as ProductEntitlementRecord[]

  const orderIds = entitlements
    .filter((e) => e.source === 'stripe' && e.source_order_id)
    .map((e) => e.source_order_id as string)
  const orders = new Map<string, SeasonOrder>()
  if (orderIds.length > 0) {
    const { data: rows, error: orderError } = await admin
      .from('direct_purchase_orders')
      .select('id, stripe_subscription_id, amount_total_cents, metadata')
      .in('id', orderIds)
    if (orderError) throw new Error('Could not load your membership')
    for (const row of (rows ?? []) as SeasonOrder[]) orders.set(row.id, row)
  }
  return { entitlements, orders }
}

/** Entitlement rows in the shape the turn-of-year rules read. */
export function toSeasonEntitlements(records: SeasonRecords): SeasonEntitlement[] {
  return records.entitlements.map((e) => {
    const order = e.source === 'stripe' && e.source_order_id ? records.orders.get(e.source_order_id) : undefined
    return seasonEntitlementFromRow(e, {
      isSubscription: !!order?.stripe_subscription_id,
      setToCancel: orderIsSetToCancel(order),
    })
  })
}

function subscriptionMapOf(records: SeasonRecords): Map<string, boolean> {
  const map = new Map<string, boolean>()
  for (const [id, order] of records.orders) map.set(id, !!order.stripe_subscription_id)
  return map
}

/** What the latest paid invoice of a monthly subscription charged, or null when Stripe can't say. */
export async function paidThisMonthCents(subscriptionId: string): Promise<number | null> {
  try {
    const invoices = await getStripeClient().invoices.list({ subscription: subscriptionId, status: 'paid', limit: 1 })
    const latest = invoices.data[0]
    return typeof latest?.amount_paid === 'number' ? latest.amount_paid : null
  } catch (err) {
    console.error('[season] Could not read the latest monthly invoice:', err instanceof Error ? err.message : err)
    return null
  }
}

export interface SeasonBlueprint {
  id: string
  status: string
  version: number
  createdAt: string | null
}

export interface Season {
  today: string
  /** The year being turned toward, or null outside November and December. */
  year: number | null
  currentPlannerYear: number
  /** Set in November when the member may write next year early. */
  earlyYear: number | null
  /** Whether they may write (or write again) the season year's Blueprint today. */
  canWrite: boolean
  /** The newest Blueprint row for the season year, if any. */
  blueprint: SeasonBlueprint | null
  renewal: RenewalOffer | null
  switchOffer: SwitchOffer | null
}

/**
 * Everything the turn-of-year cards need, for one member on one day.
 * `today` is the New York calendar day; previews may pass a mock day.
 * Reads only. Stripe is read only when a monthly member could switch.
 */
export async function loadSeason(profileId: string, options: { today?: string | null } = {}): Promise<Season> {
  const today = options.today ?? lookAheadDateISO()
  const year = seasonYear(today)
  const currentPlannerYear = getPlannerYearWithOverride(new Date(`${today}T17:00:00.000Z`))
  const empty: Season = {
    today,
    year,
    currentPlannerYear,
    earlyYear: null,
    canWrite: false,
    blueprint: null,
    renewal: null,
    switchOffer: null,
  }
  if (year === null) return empty

  const clerkUser = await currentUser().catch(() => null)
  if (clerkUser?.publicMetadata?.isAdmin === true) {
    // Admins read every year already; the cards are for members.
    return empty
  }

  const records = await loadSeasonRecords(profileId)
  const entitlements = toSeasonEntitlements(records)
  const base = { today, entitlements, oneTimeAnnualRollsForward: getOneTimeAnnualRollsForward() }
  const access = resolveUserAccess(records.entitlements, today, undefined, subscriptionMapOf(records))
  const coveredYears = [
    ...access.capabilities.blueprintFullAccessYears,
    ...access.capabilities.blueprintWindowedAccessYears,
  ]

  const earlyYear = earlyBlueprintYear(base)
  const canWrite = canWriteBlueprintFor({ year, today, earlyYear, coveredYears })

  const renewal = renewalOffer({ ...base, pricesFor })

  let switchOffer: SwitchOffer | null = null
  const monthly = entitlements.find((e) => e.accessPlan === 'monthly' && e.isSubscription && e.status === 'active')
  if (monthly) {
    const row = records.entitlements.find((e) => e.id === monthly.id)
    const order = row?.source_order_id ? records.orders.get(row.source_order_id) : undefined
    const paid = order?.stripe_subscription_id ? await paidThisMonthCents(order.stripe_subscription_id) : null
    switchOffer = switchToYearlyOffer({ ...base, pricesFor, paidThisMonthCents: paid })
  }

  const admin = createAdminSupabase()
  const { data: blueprintRow } = await admin
    .from('blueprints')
    .select('id, status, version, created_at')
    .eq('user_id', profileId)
    .eq('plan_year', year)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    ...empty,
    earlyYear,
    canWrite,
    blueprint: blueprintRow
      ? { id: blueprintRow.id, status: blueprintRow.status, version: blueprintRow.version, createdAt: blueprintRow.created_at ?? null }
      : null,
    renewal,
    switchOffer,
  }
}

/** Whether a subscription's order says it is set to cancel. */
export function orderIsSetToCancel(order: SeasonOrder | undefined): boolean {
  const metadata = (order?.metadata ?? {}) as { cancel_at_period_end?: unknown; cancel_at?: unknown }
  return isSubscriptionScheduledToCancel({
    cancel_at_period_end: metadata.cancel_at_period_end === true,
    cancel_at: typeof metadata.cancel_at === 'string' ? Date.parse(metadata.cancel_at) / 1000 : null,
  })
}
