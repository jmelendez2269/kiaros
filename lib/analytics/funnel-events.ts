export const FUNNEL_EVENT_NAMES = [
  "pricing_viewed",
  "tier_selected",
  "preview_started",
  "preview_completed",
  "preview_viewed",
  "checkout_started",
  "checkout_canceled",
  "checkout_completed",
  "blueprint_ready",
  "day_7_return",
  "subscription_canceled",
  "second_invoice_paid",
  "sampler_purchased",
  "sampler_credit_used",
  "paid_upgrade_completed",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

export const PUBLIC_FUNNEL_EVENT_NAMES = [
  "pricing_viewed",
  "tier_selected",
  "preview_viewed",
] as const satisfies readonly FunnelEventName[];

const PUBLIC_EVENT_NAMES = new Set<FunnelEventName>(PUBLIC_FUNNEL_EVENT_NAMES);

export function isPublicFunnelEventName(eventName: FunnelEventName): boolean {
  return PUBLIC_EVENT_NAMES.has(eventName);
}

export const FUNNEL_PRODUCT_TIERS = [
  "planner",
  "planner_oracle",
  "stelloquy_sampler",
  "personalized_week",
] as const;

export type FunnelProductTier = (typeof FUNNEL_PRODUCT_TIERS)[number];

export const FUNNEL_ACCESS_PLANS = ["monthly", "yearly", "one_time", "legacy_etsy"] as const;

export type FunnelAccessPlan = (typeof FUNNEL_ACCESS_PLANS)[number];

export interface FunnelEventMetadata {
  amount_minor?: number;
  currency?: string;
  planner_year?: number;
  completion_duration_ms?: number;
  return_day?: number;
  invoice_number?: number;
  credit_balance?: number;
  is_upgrade?: boolean;
  entry_surface?: string;
  reason_code?: string;
}

export interface FunnelEventInput {
  event_id: string;
  event_name: FunnelEventName;
  occurred_at?: string | Date;
  anonymous_id?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  referrer_host?: string | null;
  entry_path?: string | null;
  experiment_key?: string | null;
  experiment_variant?: string | null;
  product_tier?: FunnelProductTier | null;
  access_plan?: FunnelAccessPlan | null;
  stripe_checkout_session_id?: string | null;
  stripe_order_id?: string | null;
  converted_entitlement_id?: string | null;
  metadata?: FunnelEventMetadata | null;
}

export interface FunnelEventRecord {
  event_id: string;
  event_name: FunnelEventName;
  occurred_at: string;
  anonymous_id: string | null;
  user_id: string | null;
  session_id: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer_host: string | null;
  entry_path: string | null;
  experiment_key: string | null;
  experiment_variant: string | null;
  product_tier: FunnelProductTier | null;
  access_plan: FunnelAccessPlan | null;
  stripe_checkout_session_id: string | null;
  stripe_order_id: string | null;
  converted_entitlement_id: string | null;
  metadata: FunnelEventMetadata;
}

export type FunnelEventValidationResult =
  | { success: true; event: FunnelEventRecord }
  | { success: false; error: string };

const EVENT_NAMES = new Set<string>(FUNNEL_EVENT_NAMES);
const PRODUCT_TIERS = new Set<string>(FUNNEL_PRODUCT_TIERS);
const ACCESS_PLANS = new Set<string>(FUNNEL_ACCESS_PLANS);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const SAFE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:+~-]*$/i;
const SAFE_CAMPAIGN_PATTERN = /^[a-z0-9][a-z0-9 ._:+~-]*$/i;
const STRIPE_ID_PATTERN = /^[a-zA-Z0-9_]+$/;

const TOP_LEVEL_KEYS = new Set([
  "event_id",
  "event_name",
  "occurred_at",
  "anonymous_id",
  "user_id",
  "session_id",
  "source",
  "medium",
  "campaign",
  "referrer_host",
  "entry_path",
  "experiment_key",
  "experiment_variant",
  "product_tier",
  "access_plan",
  "stripe_checkout_session_id",
  "stripe_order_id",
  "converted_entitlement_id",
  "metadata",
]);

const METADATA_KEYS = new Set<keyof FunnelEventMetadata>([
  "amount_minor",
  "currency",
  "planner_year",
  "completion_duration_ms",
  "return_day",
  "invoice_number",
  "credit_balance",
  "is_upgrade",
  "entry_surface",
  "reason_code",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown, name: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${name} must be a string.`);
  return value.trim();
}

function uuid(value: unknown, name: string, required = false): string | null {
  const candidate = nullableString(value, name);
  if (!candidate) {
    if (required) throw new Error(`${name} is required.`);
    return null;
  }
  if (!UUID_PATTERN.test(candidate)) throw new Error(`${name} must be a UUID.`);
  return candidate.toLowerCase();
}

function eventId(value: unknown): string {
  const candidate = nullableString(value, "event_id");
  if (!candidate) throw new Error("event_id is required.");
  if (candidate.length > 160) throw new Error("event_id is too long.");
  if (!EVENT_ID_PATTERN.test(candidate)) {
    throw new Error("event_id must be an opaque idempotency token.");
  }
  return candidate;
}

function dimension(
  value: unknown,
  name: string,
  maximumLength: number,
  pattern: RegExp = SAFE_TOKEN_PATTERN,
  lowercase = false,
): string | null {
  const candidate = nullableString(value, name);
  if (!candidate) return null;
  if (candidate.length > maximumLength) throw new Error(`${name} is too long.`);
  if (/^https?:\/\//i.test(candidate) || candidate.includes("?") || candidate.includes("#")) {
    throw new Error(`${name} must not contain a URL or query string.`);
  }
  if (!pattern.test(candidate)) throw new Error(`${name} contains unsupported characters.`);
  return lowercase ? candidate.toLowerCase() : candidate;
}

function entryPath(value: unknown): string | null {
  const candidate = nullableString(value, "entry_path");
  if (!candidate) return null;
  if (candidate.length > 256) throw new Error("entry_path is too long.");
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    throw new Error("entry_path must be an application-relative path.");
  }
  if (candidate.includes("?") || candidate.includes("#") || /^https?:\/\//i.test(candidate)) {
    throw new Error("entry_path must not contain a URL, query string, or fragment.");
  }
  if (!/^\/[a-zA-Z0-9/_~.+-]*$/.test(candidate)) {
    throw new Error("entry_path contains unsupported characters.");
  }
  return candidate;
}

function referrerHost(value: unknown): string | null {
  const candidate = nullableString(value, "referrer_host");
  if (!candidate) return null;
  if (candidate.length > 253) throw new Error("referrer_host is too long.");
  if (
    /^https?:\/\//i.test(candidate) ||
    candidate.includes("/") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    !HOST_PATTERN.test(candidate)
  ) {
    throw new Error("referrer_host must be a hostname only.");
  }
  return candidate.toLowerCase();
}

function stripeId(value: unknown, name: string): string | null {
  const candidate = nullableString(value, name);
  if (!candidate) return null;
  if (candidate.length > 255) throw new Error(`${name} is too long.`);
  if (!STRIPE_ID_PATTERN.test(candidate)) throw new Error(`${name} is invalid.`);
  return candidate;
}

function occurredAt(value: unknown, now: Date): string {
  if (value === undefined || value === null) return now.toISOString();
  if (!(typeof value === "string" || value instanceof Date)) {
    throw new Error("occurred_at must be an ISO timestamp.");
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("occurred_at must be an ISO timestamp.");
  return parsed.toISOString();
}

function boundedInteger(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${name} is outside its allowed range.`);
  }
  return value as number;
}

function shortMetadataToken(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  const parsed = dimension(value, name, 64, SAFE_TOKEN_PATTERN, true);
  return parsed ?? undefined;
}

function parseMetadata(value: unknown): FunnelEventMetadata {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error("metadata must be a flat object.");

  const unexpected = Object.keys(value).find((key) => !METADATA_KEYS.has(key as keyof FunnelEventMetadata));
  if (unexpected) throw new Error(`Unexpected metadata key: ${unexpected}.`);

  if (JSON.stringify(value).length > 1024) throw new Error("metadata is too large.");

  const currency = value.currency === undefined
    ? undefined
    : dimension(value.currency, "currency", 3, /^[a-z]{3}$/i, true) ?? undefined;
  if (value.is_upgrade !== undefined && typeof value.is_upgrade !== "boolean") {
    throw new Error("is_upgrade must be a boolean.");
  }

  return {
    amount_minor: boundedInteger(value.amount_minor, "amount_minor", 0, 100_000_000),
    currency,
    planner_year: boundedInteger(value.planner_year, "planner_year", 2020, 2100),
    completion_duration_ms: boundedInteger(
      value.completion_duration_ms,
      "completion_duration_ms",
      0,
      86_400_000,
    ),
    return_day: boundedInteger(value.return_day, "return_day", 0, 365),
    invoice_number: boundedInteger(value.invoice_number, "invoice_number", 1, 1_000),
    credit_balance: boundedInteger(value.credit_balance, "credit_balance", 0, 10_000),
    is_upgrade: value.is_upgrade as boolean | undefined,
    entry_surface: shortMetadataToken(value.entry_surface, "entry_surface"),
    reason_code: shortMetadataToken(value.reason_code, "reason_code"),
  };
}

function allowedEnum<T extends string>(
  value: unknown,
  name: string,
  allowed: ReadonlySet<string>,
): T | null {
  const candidate = nullableString(value, name);
  if (!candidate) return null;
  if (!allowed.has(candidate)) throw new Error(`${name} is not allowed.`);
  return candidate as T;
}

export function validateFunnelEvent(
  input: unknown,
  options: { now?: Date; allowUserId?: boolean } = {},
): FunnelEventValidationResult {
  try {
    if (!isRecord(input)) return { success: false, error: "Event payload must be an object." };

    const unexpected = Object.keys(input).find((key) => !TOP_LEVEL_KEYS.has(key));
    if (unexpected) return { success: false, error: `Unexpected event field: ${unexpected}.` };
    if (!options.allowUserId && "user_id" in input) {
      return { success: false, error: "user_id is assigned by the server." };
    }

    const eventName = nullableString(input.event_name, "event_name");
    if (!eventName || !EVENT_NAMES.has(eventName)) {
      return { success: false, error: "event_name is not allowlisted." };
    }

    const anonymousId = uuid(input.anonymous_id, "anonymous_id");
    const userId = options.allowUserId ? uuid(input.user_id, "user_id") : null;
    if (!anonymousId && !userId) {
      return { success: false, error: "anonymous_id is required until an authenticated user is linked." };
    }

    const event: FunnelEventRecord = {
      event_id: eventId(input.event_id),
      event_name: eventName as FunnelEventName,
      occurred_at: occurredAt(input.occurred_at, options.now ?? new Date()),
      anonymous_id: anonymousId,
      user_id: userId,
      session_id: uuid(input.session_id, "session_id"),
      source: dimension(input.source, "source", 80, SAFE_TOKEN_PATTERN, true),
      medium: dimension(input.medium, "medium", 80, SAFE_TOKEN_PATTERN, true),
      campaign: dimension(input.campaign, "campaign", 120, SAFE_CAMPAIGN_PATTERN),
      referrer_host: referrerHost(input.referrer_host),
      entry_path: entryPath(input.entry_path),
      experiment_key: dimension(input.experiment_key, "experiment_key", 80),
      experiment_variant: dimension(input.experiment_variant, "experiment_variant", 80),
      product_tier: allowedEnum<FunnelProductTier>(input.product_tier, "product_tier", PRODUCT_TIERS),
      access_plan: allowedEnum<FunnelAccessPlan>(input.access_plan, "access_plan", ACCESS_PLANS),
      stripe_checkout_session_id: stripeId(
        input.stripe_checkout_session_id,
        "stripe_checkout_session_id",
      ),
      stripe_order_id: stripeId(input.stripe_order_id, "stripe_order_id"),
      converted_entitlement_id: uuid(input.converted_entitlement_id, "converted_entitlement_id"),
      metadata: parseMetadata(input.metadata),
    };

    return { success: true, event };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid funnel event.",
    };
  }
}
