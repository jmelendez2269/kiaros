/**
 * Best-effort per-IP rate limit for the public analytics events endpoint.
 * In-memory only: resets on cold start and is not shared across serverless instances.
 *
 * Default: 60 POSTs per IP per 60s sliding window.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

type Window = { count: number; windowStartMs: number };

const buckets = new Map<string, Window>();

export function checkAnalyticsEventsRateLimit(
  clientKey: string,
  nowMs = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = clientKey.trim() || "unknown";
  const existing = buckets.get(key);
  if (!existing || nowMs - existing.windowStartMs >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStartMs: nowMs });
    return { allowed: true };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (nowMs - existing.windowStartMs)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

export const ANALYTICS_EVENTS_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
} as const;
