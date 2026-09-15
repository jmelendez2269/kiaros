import {
  FUNNEL_ACCESS_PLANS,
  FUNNEL_PRODUCT_TIERS,
  type FunnelAccessPlan,
  type FunnelEventInput,
  type FunnelEventMetadata,
  type FunnelEventRecord,
  type FunnelProductTier,
} from "./funnel-events.ts";
import {
  validateCheckoutFunnelContext,
  type CheckoutFunnelContext,
} from "./checkout-context.ts";

export interface CheckoutSessionAnalyticsSource {
  id: string;
  created?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
}

type CheckoutStartedRecord = Pick<
  FunnelEventRecord,
  | "anonymous_id"
  | "user_id"
  | "session_id"
  | "source"
  | "medium"
  | "campaign"
  | "referrer_host"
  | "entry_path"
  | "experiment_key"
  | "experiment_variant"
  | "product_tier"
  | "access_plan"
  | "stripe_checkout_session_id"
  | "stripe_order_id"
  | "metadata"
>;

const ATTEMPT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const METADATA_KEYS = {
  attemptId: "kiaros_attempt_id",
  anonymousId: "kiaros_anonymous_id",
  sessionId: "kiaros_session_id",
  source: "kiaros_source",
  medium: "kiaros_medium",
  campaign: "kiaros_campaign",
  referrerHost: "kiaros_referrer_host",
  entryPath: "kiaros_entry_path",
  experimentKey: "kiaros_experiment_key",
  experimentVariant: "kiaros_experiment_variant",
} as const;

function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function allowedValue<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return value && allowed.includes(value as T) ? value as T : null;
}

function plannerYear(metadata: Record<string, string> | null | undefined): number | undefined {
  const parsed = Number(metadata?.planner_year);
  return Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100 ? parsed : undefined;
}

function eventMetadata(session: CheckoutSessionAnalyticsSource): FunnelEventMetadata {
  return {
    amount_minor: Number.isInteger(session.amount_total) && (session.amount_total ?? -1) >= 0
      ? session.amount_total ?? undefined
      : undefined,
    currency: session.currency?.toLowerCase(),
    planner_year: plannerYear(session.metadata),
    entry_surface: "stripe_checkout",
  };
}

function contextFields(context: CheckoutFunnelContext | null) {
  return {
    anonymous_id: context?.anonymous_id ?? null,
    session_id: context?.session_id ?? null,
    source: context?.source ?? null,
    medium: context?.medium ?? null,
    campaign: context?.campaign ?? null,
    referrer_host: context?.referrer_host ?? null,
    entry_path: context?.entry_path ?? null,
    experiment_key: context?.experiment_key ?? null,
    experiment_variant: context?.experiment_variant ?? null,
  };
}

export function isCheckoutAttemptId(value: unknown): value is string {
  return typeof value === "string" && ATTEMPT_PATTERN.test(value);
}

export function checkoutAttemptEventId(
  attemptId: string,
  state: "started" | "canceled",
): string {
  return `checkout_attempt:${attemptId}:${state}`;
}

export function checkoutCompletedEventId(sessionId: string): string {
  return `checkout_completed:${sessionId}`;
}

export function buildCheckoutAnalyticsMetadata(
  attemptId: string,
  context: CheckoutFunnelContext | null,
): Record<string, string> {
  if (!isCheckoutAttemptId(attemptId)) throw new Error("Invalid checkout attempt id.");

  const metadata: Record<string, string> = { [METADATA_KEYS.attemptId]: attemptId };
  if (!context) return metadata;

  const pairs: Array<[string, string | null]> = [
    [METADATA_KEYS.anonymousId, context.anonymous_id],
    [METADATA_KEYS.sessionId, context.session_id],
    [METADATA_KEYS.source, context.source],
    [METADATA_KEYS.medium, context.medium],
    [METADATA_KEYS.campaign, context.campaign],
    [METADATA_KEYS.referrerHost, context.referrer_host],
    [METADATA_KEYS.entryPath, context.entry_path],
    [METADATA_KEYS.experimentKey, context.experiment_key],
    [METADATA_KEYS.experimentVariant, context.experiment_variant],
  ];
  for (const [key, value] of pairs) {
    if (value) metadata[key] = value;
  }
  return metadata;
}

export function checkoutAttemptIdFromMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  const attemptId = metadata?.[METADATA_KEYS.attemptId];
  return isCheckoutAttemptId(attemptId) ? attemptId : null;
}

export function checkoutContextFromMetadata(
  metadata: Record<string, string> | null | undefined,
): CheckoutFunnelContext | null {
  if (!metadata?.[METADATA_KEYS.anonymousId] || !metadata[METADATA_KEYS.sessionId]) return null;
  const validation = validateCheckoutFunnelContext({
    anonymous_id: metadata[METADATA_KEYS.anonymousId],
    session_id: metadata[METADATA_KEYS.sessionId],
    source: metadata[METADATA_KEYS.source] ?? null,
    medium: metadata[METADATA_KEYS.medium] ?? null,
    campaign: metadata[METADATA_KEYS.campaign] ?? null,
    referrer_host: metadata[METADATA_KEYS.referrerHost] ?? null,
    entry_path: metadata[METADATA_KEYS.entryPath] ?? null,
    experiment_key: metadata[METADATA_KEYS.experimentKey] ?? null,
    experiment_variant: metadata[METADATA_KEYS.experimentVariant] ?? null,
  });
  return validation.success ? validation.context : null;
}

function checkoutDimensions(session: CheckoutSessionAnalyticsSource) {
  return {
    product_tier: allowedValue<FunnelProductTier>(
      session.metadata?.product_tier,
      FUNNEL_PRODUCT_TIERS,
    ),
    access_plan: allowedValue<FunnelAccessPlan>(
      session.metadata?.access_plan,
      FUNNEL_ACCESS_PLANS,
    ),
  };
}

export function buildCheckoutStartedEvent(params: {
  session: CheckoutSessionAnalyticsSource;
  userId: string;
}): FunnelEventInput {
  const attemptId = checkoutAttemptIdFromMetadata(params.session.metadata);
  if (!attemptId) throw new Error("Checkout session is missing its analytics attempt id.");
  const context = checkoutContextFromMetadata(params.session.metadata);

  return {
    event_id: checkoutAttemptEventId(attemptId, "started"),
    event_name: "checkout_started",
    occurred_at: params.session.created
      ? new Date(params.session.created * 1000).toISOString()
      : undefined,
    user_id: params.userId,
    ...contextFields(context),
    ...checkoutDimensions(params.session),
    stripe_checkout_session_id: params.session.id,
    stripe_order_id: stripeObjectId(params.session.payment_intent ?? params.session.subscription),
    metadata: eventMetadata(params.session),
  };
}

export function buildCheckoutCompletedEvent(params: {
  session: CheckoutSessionAnalyticsSource;
  userId: string;
  convertedEntitlementId: string;
  occurredAt?: string | Date;
}): FunnelEventInput {
  const context = checkoutContextFromMetadata(params.session.metadata);
  return {
    event_id: checkoutCompletedEventId(params.session.id),
    event_name: "checkout_completed",
    occurred_at: params.occurredAt,
    user_id: params.userId,
    ...contextFields(context),
    ...checkoutDimensions(params.session),
    stripe_checkout_session_id: params.session.id,
    stripe_order_id: stripeObjectId(params.session.payment_intent ?? params.session.subscription),
    converted_entitlement_id: params.convertedEntitlementId,
    metadata: eventMetadata(params.session),
  };
}

export function buildCheckoutCanceledEvent(params: {
  attemptId: string;
  started: CheckoutStartedRecord;
  occurredAt?: string | Date;
}): FunnelEventInput {
  if (!isCheckoutAttemptId(params.attemptId)) throw new Error("Invalid checkout attempt id.");
  return {
    event_id: checkoutAttemptEventId(params.attemptId, "canceled"),
    event_name: "checkout_canceled",
    occurred_at: params.occurredAt,
    anonymous_id: params.started.anonymous_id,
    user_id: params.started.user_id,
    session_id: params.started.session_id,
    source: params.started.source,
    medium: params.started.medium,
    campaign: params.started.campaign,
    referrer_host: params.started.referrer_host,
    entry_path: params.started.entry_path,
    experiment_key: params.started.experiment_key,
    experiment_variant: params.started.experiment_variant,
    product_tier: params.started.product_tier,
    access_plan: params.started.access_plan,
    stripe_checkout_session_id: params.started.stripe_checkout_session_id,
    stripe_order_id: params.started.stripe_order_id,
    metadata: {
      ...params.started.metadata,
      reason_code: "customer_return",
    },
  };
}
