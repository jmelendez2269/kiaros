import {
  isPublicFunnelEventName,
  validateFunnelEvent,
  type FunnelEventName,
  type FunnelEventValidationResult,
} from "./funnel-events.ts";

export const PUBLIC_ANALYTICS_EVENTS_MAX_BODY_BYTES = 4096;

const FORBIDDEN_CLIENT_IDENTITY_KEYS = new Set([
  "user_id",
  "clerk_user_id",
  "clerk_id",
  "email",
  "email_address",
]);

const EMAIL_LIKE_VALUE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsForbiddenIdentity(payload: Record<string, unknown>): string | null {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_CLIENT_IDENTITY_KEYS.has(key)) {
      return `${key} must not be sent by the client.`;
    }
    const value = payload[key];
    if (typeof value === "string" && EMAIL_LIKE_VALUE_PATTERN.test(value.trim())) {
      return "Event payload must not include email addresses.";
    }
    if (isRecord(value)) {
      const nested = containsForbiddenIdentity(value);
      if (nested) return nested;
    }
  }
  return null;
}

export type PublicAnalyticsBodyReadResult =
  | { success: true; raw: string; parsed: unknown }
  | { success: false; error: string; status: 400 | 413 };

export async function readPublicAnalyticsEventBody(
  request: Request,
  maxBytes = PUBLIC_ANALYTICS_EVENTS_MAX_BODY_BYTES,
): Promise<PublicAnalyticsBodyReadResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      return { success: false, error: "Request body is too large.", status: 413 };
    }
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    return { success: false, error: "Request body is too large.", status: 413 };
  }

  if (!raw.trim()) {
    return { success: false, error: "Event payload must be an object.", status: 400 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { success: false, error: "Request body must be valid JSON.", status: 400 };
  }

  return { success: true, raw, parsed };
}

export function validatePublicAnalyticsEventPayload(
  parsed: unknown,
  options: { userId: string | null; now?: Date },
): FunnelEventValidationResult & { status?: 400 } {
  if (!isRecord(parsed)) {
    return { success: false, error: "Event payload must be an object." };
  }

  const identityError = containsForbiddenIdentity(parsed);
  if (identityError) {
    return { success: false, error: identityError };
  }

  const eventName =
    typeof parsed.event_name === "string" ? (parsed.event_name as FunnelEventName) : null;
  if (!eventName || !isPublicFunnelEventName(eventName)) {
    return { success: false, error: "event_name is not allowlisted for this endpoint." };
  }

  const validation = validateFunnelEvent(
    { ...parsed, user_id: options.userId },
    { allowUserId: true, now: options.now },
  );
  if (!validation.success) {
    return validation;
  }

  if (eventName === "field_notes_submit" && validation.event.user_id) {
    return { success: false, error: "field_notes_submit must not include user_id." };
  }

  return validation;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
