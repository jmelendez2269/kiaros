/**
 * The turn of the year: what a member can do between November 1 and the day
 * the new year begins, as pure functions of a calendar day so every rule here
 * can be tested with an injected clock.
 *
 * Four things live here:
 * 1. Writing next year's Blueprint early (November, yearly members whose
 *    access already reaches December 1), and rewriting it until January 1.
 * 2. The December 1 roll for members who wrote early: their profile moves to
 *    the new year without generating again.
 * 3. Early renewal for yearly members whose access ends before the new year.
 *    The new term starts the day after the current one ends, so no days are lost.
 * 4. Switching a monthly subscription to yearly, with what was already paid
 *    this month taken off the first yearly charge.
 *
 * Days are YYYY-MM-DD in America/New_York, the clock the planner year rolls on.
 * Etsy access is left exactly as it is: it neither writes early, renews nor switches here.
 */
import {
  addCapabilityDays,
  computeFullAccessThrough,
  resolveCapabilityEntitlementState,
  shouldRollOver,
  type CapabilityEntitlement,
} from '../commerce/capabilities.ts'

export interface SeasonEntitlement extends CapabilityEntitlement {
  id: string
  productTier: string
  /** A Stripe subscription that is not set to cancel, so it renews by itself. */
  willAutoRenew?: boolean
}

/** An entitlement row (product_entitlements) in the shape these rules read. */
export function seasonEntitlementFromRow(
  row: {
    id: string
    product_tier: string
    access_plan?: string | null
    ends_at: string
    oracle_enabled: boolean
    planner_year: number
    source: string
    starts_at: string
    status: string
  },
  order: { isSubscription: boolean; setToCancel: boolean },
): SeasonEntitlement {
  return {
    id: row.id,
    productTier: row.product_tier,
    accessPlan: row.access_plan === 'monthly' ? 'monthly' : 'yearly',
    endsAt: row.ends_at,
    oracleEnabled: row.oracle_enabled,
    plannerYear: row.planner_year,
    source: row.source,
    startsAt: row.starts_at,
    status: row.status,
    isSubscription: order.isSubscription,
    willAutoRenew: order.isSubscription && !order.setToCancel,
  }
}

export interface SeasonInput {
  /** Calendar day in America/New_York. */
  today: string
  entitlements: readonly SeasonEntitlement[]
  /** ONE_TIME_ANNUAL_ROLLS_FORWARD, as resolveAccessCapabilities takes it. */
  oneTimeAnnualRollsForward: boolean
}

export interface TierPrices {
  monthlyPriceCents: number
  annualPriceCents: number
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function parts(day: string): { year: number; month: number } {
  const match = ISO_DATE.exec(day)
  if (!match) throw new RangeError(`Invalid day: ${day}`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

/** The day a planner year becomes current: December 1 of the year before. */
export function rollDateFor(year: number): string {
  return `${year - 1}-12-01`
}

/** The first calendar day of a planner year. */
export function yearBeginsOn(year: number): string {
  return `${year}-01-01`
}

/**
 * The year being turned toward: from November 1 until December 31 it is next
 * calendar year (2027 during November and December 2026). Null the rest of the year.
 */
export function seasonYear(today: string): number | null {
  const { year, month } = parts(today)
  return month === 11 || month === 12 ? year + 1 : null
}

function rollsForward(entitlement: SeasonEntitlement, oneTimeAnnualRollsForward: boolean): boolean {
  if (entitlement.accessPlan === 'monthly') return true
  if (entitlement.isSubscription === true) return true
  if (entitlement.source === 'gift') return true
  return oneTimeAnnualRollsForward
}

function fullThrough(entitlement: SeasonEntitlement): string {
  return entitlement.fullAccessThrough ?? computeFullAccessThrough(entitlement)
}

function isActiveOn(entitlement: SeasonEntitlement, day: string): boolean {
  return (
    resolveCapabilityEntitlementState(
      { ...entitlement, fullAccessThrough: fullThrough(entitlement) },
      day,
    ) === 'active'
  )
}

/** Yearly access that the turn of the year applies to: not Etsy, not revoked. */
function yearlyInScope(input: SeasonInput): SeasonEntitlement[] {
  return input.entitlements.filter(
    (e) =>
      e.accessPlan === 'yearly' &&
      e.source !== 'etsy' &&
      e.status === 'active' &&
      rollsForward(e, input.oneTimeAnnualRollsForward),
  )
}

/**
 * The year a member can write ahead, or null.
 *
 * Open in November only (after that the year is current, and the ordinary
 * roll applies). The member needs yearly access that is active today and
 * yearly access that will be in force on December 1, which can be a renewal
 * that starts later. Writing early never puts the new year into their full
 * access years before December 1: it only lets them write and read it.
 */
export function earlyBlueprintYear(input: SeasonInput): number | null {
  const { month } = parts(input.today)
  if (month !== 11) return null
  const year = seasonYear(input.today)
  if (year === null) return null

  const yearly = yearlyInScope(input)
  if (!yearly.some((e) => isActiveOn(e, input.today))) return null

  const roll = rollDateFor(year)
  const coversRoll = yearly.some((e) => e.startsAt.slice(0, 10) <= roll && fullThrough(e) >= roll)
  return coversRoll ? year : null
}

/**
 * Whether a member may write (or write again) the Blueprint for `year` today.
 * Early in November as above; from December 1, for anyone whose access covers
 * the year, until the year begins.
 */
export function canWriteBlueprintFor(params: {
  year: number
  today: string
  earlyYear: number | null
  coveredYears: readonly number[]
}): boolean {
  const { year, today, earlyYear, coveredYears } = params
  if (today >= yearBeginsOn(year)) return false
  if (earlyYear === year) return true
  return today >= rollDateFor(year) && coveredYears.includes(year)
}

/** Blueprint versions count up per member per plan year. */
export function nextBlueprintVersion(latestVersion: number | null | undefined): number {
  return (latestVersion ?? 0) + 1
}

export type RolloverAction =
  /** Nothing to do: the profile is on the current year, or the year isn't theirs yet. */
  | 'none'
  /** A Blueprint for the new year already exists (written early): move the profile, generate nothing. */
  | 'advance'
  /** No Blueprint for the new year yet: send them to /renewing to write it. */
  | 'generate'

/**
 * What December 1 means for one member. A member who wrote early keeps that
 * Blueprint; only their profile moves to the new year.
 */
export function rolloverAction(params: {
  profilePlanYear: number | null
  coveredYears: readonly number[]
  asOf: Date | string
  /** The newest Blueprint row for the current planner year, if any. */
  currentYearBlueprint: { status: string } | null
}): RolloverAction {
  if (
    !shouldRollOver({
      profilePlanYear: params.profilePlanYear,
      coveredYears: [...params.coveredYears],
      asOf: params.asOf,
    })
  ) {
    return 'none'
  }
  const status = params.currentYearBlueprint?.status
  if (status === 'ready' || status === 'generating') return 'advance'
  return 'generate'
}

export interface RenewalOffer {
  year: number
  entitlementId: string
  productTier: string
  oracleEnabled: boolean
  /** Last day of the access they have now. */
  currentEndsOn: string
  /** The renewed year runs from the day after, for 365 days. */
  newStartsOn: string
  newEndsOn: string
  priceCents: number
}

/**
 * Early renewal, from November 1 until the season ends, for yearly members
 * whose access ends before the new year begins and won't renew by itself.
 */
export function renewalOffer(
  input: SeasonInput & { pricesFor: (productTier: string) => TierPrices | null },
): RenewalOffer | null {
  const year = seasonYear(input.today)
  if (year === null) return null

  const yearly = yearlyInScope(input)
  if (!yearly.some((e) => isActiveOn(e, input.today))) return null

  // The yearly access that reaches furthest, including a renewal already bought.
  const latest = [...yearly].sort((a, b) => fullThrough(b).localeCompare(fullThrough(a)))[0]
  if (!latest) return null
  const currentEndsOn = fullThrough(latest)
  if (currentEndsOn >= yearBeginsOn(year)) return null
  if (latest.willAutoRenew) return null

  const prices = input.pricesFor(latest.productTier)
  if (!prices) return null

  const newStartsOn = addCapabilityDays(currentEndsOn, 1)
  return {
    year,
    entitlementId: latest.id,
    productTier: latest.productTier,
    oracleEnabled: latest.oracleEnabled,
    currentEndsOn,
    newStartsOn,
    newEndsOn: addCapabilityDays(newStartsOn, 364),
    priceCents: prices.annualPriceCents,
  }
}

export interface SwitchOffer {
  year: number
  entitlementId: string
  productTier: string
  monthlyPriceCents: number
  yearlyPriceCents: number
  /** What they already paid for this month, taken off the first yearly charge. */
  creditCents: number
  dueTodayCents: number
  /** The yearly term starts today and runs 365 days. */
  startsOn: string
  endsOn: string
}

/**
 * Monthly to yearly, from November 1 until the season ends, for an active
 * monthly Stripe subscription with no yearly access alongside it.
 */
export function switchToYearlyOffer(
  input: SeasonInput & {
    pricesFor: (productTier: string) => TierPrices | null
    /** What the latest paid monthly invoice charged, when known. */
    paidThisMonthCents: number | null
  },
): SwitchOffer | null {
  const year = seasonYear(input.today)
  if (year === null) return null

  const active = input.entitlements.filter((e) => e.status === 'active' && isActiveOn(e, input.today))
  if (active.some((e) => e.accessPlan === 'yearly' && e.source !== 'etsy')) return null

  const monthly = active.find(
    (e) => e.accessPlan === 'monthly' && e.source === 'stripe' && e.isSubscription === true,
  )
  if (!monthly) return null

  const prices = input.pricesFor(monthly.productTier)
  if (!prices) return null

  const paid = input.paidThisMonthCents ?? prices.monthlyPriceCents
  const creditCents = Math.max(0, Math.min(Math.round(paid), prices.annualPriceCents))
  return {
    year,
    entitlementId: monthly.id,
    productTier: monthly.productTier,
    monthlyPriceCents: prices.monthlyPriceCents,
    yearlyPriceCents: prices.annualPriceCents,
    creditCents,
    dueTodayCents: prices.annualPriceCents - creditCents,
    startsOn: input.today,
    endsOn: addCapabilityDays(input.today, 364),
  }
}

/** The entitlement after a monthly to yearly switch on `today`. */
export function switchedEntitlementWindow(params: {
  today: string
  /** Stripe's new period end after the switch (YYYY-MM-DD), when known. */
  stripePeriodEnd: string | null
}): { access_plan: 'yearly'; starts_at: string; ends_at: string } {
  const window365 = addCapabilityDays(params.today, 364)
  const endsAt =
    params.stripePeriodEnd && params.stripePeriodEnd > window365 ? params.stripePeriodEnd : window365
  return { access_plan: 'yearly', starts_at: params.today, ends_at: endsAt }
}

/**
 * A renewal bought early is charged today, but its year runs from the day the
 * old one ends. When Stripe bills the next year, the new term continues from
 * the end of the one paid for, not from the invoice date.
 */
export function renewedEndsAt(params: {
  currentEndsAt: string
  invoicePeriodStart: string
  stripePeriodEnd: string | null
  /** Set when the order was an early renewal. */
  renewalStartsAt: string | null
}): string {
  const base = params.renewalStartsAt ? params.currentEndsAt : params.invoicePeriodStart
  const target = addCapabilityDays(base, 365)
  let result = target
  if (!params.renewalStartsAt && params.stripePeriodEnd && params.stripePeriodEnd > result) {
    result = params.stripePeriodEnd
  }
  return params.currentEndsAt > result ? params.currentEndsAt : result
}
