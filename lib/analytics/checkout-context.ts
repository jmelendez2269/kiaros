import {
  parseFunnelAttribution,
  preserveFirstTouchAttribution,
  shouldRotateFunnelSession,
  type FunnelAttribution,
} from "./attribution.ts";
import { validateFunnelEvent } from "./funnel-events.ts";

export interface CheckoutFunnelContext extends FunnelAttribution {
  anonymous_id: string;
  session_id: string;
}

export type CheckoutFunnelContextValidationResult =
  | { success: true; context: CheckoutFunnelContext }
  | { success: false; error: string };

interface FunnelContextStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredFunnelContext {
  version: 1;
  session_started_at: string;
  context: CheckoutFunnelContext;
}

interface CaptureCheckoutFunnelContextOptions {
  entryUrl: URL | string;
  referrer?: string | null;
  storage?: FunnelContextStorage | null;
  now?: Date;
  createId?: () => string;
}

const STORAGE_KEY = "kiaros_funnel_context:v1";
const CONTEXT_KEYS = new Set([
  "anonymous_id",
  "session_id",
  "source",
  "medium",
  "campaign",
  "referrer_host",
  "entry_path",
  "experiment_key",
  "experiment_variant",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function attributionFromContext(context: CheckoutFunnelContext): FunnelAttribution {
  return {
    source: context.source,
    medium: context.medium,
    campaign: context.campaign,
    referrer_host: context.referrer_host,
    entry_path: context.entry_path,
    experiment_key: context.experiment_key,
    experiment_variant: context.experiment_variant,
  };
}

export function validateCheckoutFunnelContext(
  input: unknown,
): CheckoutFunnelContextValidationResult {
  if (!isRecord(input)) {
    return { success: false, error: "Checkout attribution must be an object." };
  }

  const unexpected = Object.keys(input).find((key) => !CONTEXT_KEYS.has(key));
  if (unexpected) {
    return { success: false, error: `Unexpected checkout attribution field: ${unexpected}.` };
  }

  const validation = validateFunnelEvent({
    event_id: "checkout_context",
    event_name: "checkout_started",
    ...input,
  });
  if (!validation.success) return validation;
  if (!validation.event.anonymous_id || !validation.event.session_id) {
    return {
      success: false,
      error: "Checkout attribution requires anonymous and session identifiers.",
    };
  }

  return {
    success: true,
    context: {
      anonymous_id: validation.event.anonymous_id,
      session_id: validation.event.session_id,
      ...attributionFromContext(validation.event as CheckoutFunnelContext),
    },
  };
}

function loadStoredContext(storage: FunnelContextStorage | null | undefined): StoredFunnelContext | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.session_started_at !== "string") {
      return null;
    }
    const validation = validateCheckoutFunnelContext(parsed.context);
    if (!validation.success) return null;
    return {
      version: 1,
      session_started_at: parsed.session_started_at,
      context: validation.context,
    };
  } catch {
    return null;
  }
}

function saveStoredContext(
  storage: FunnelContextStorage | null | undefined,
  stored: StoredFunnelContext,
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage can be unavailable in private browsing; checkout still receives this page's context.
  }
}

export function captureCheckoutFunnelContext(
  options: CaptureCheckoutFunnelContextOptions,
): CheckoutFunnelContext {
  const now = options.now ?? new Date();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const stored = loadStoredContext(options.storage);
  const incoming = parseFunnelAttribution(options.entryUrl, options.referrer);
  const attribution = preserveFirstTouchAttribution(
    stored ? attributionFromContext(stored.context) : null,
    incoming,
  );
  const rotateSession = shouldRotateFunnelSession(stored?.session_started_at, now);
  const context: CheckoutFunnelContext = {
    anonymous_id: stored?.context.anonymous_id ?? createId(),
    session_id: !stored || rotateSession ? createId() : stored.context.session_id,
    ...attribution,
  };

  saveStoredContext(options.storage, {
    version: 1,
    session_started_at: !stored || rotateSession
      ? now.toISOString()
      : stored.session_started_at,
    context,
  });

  return context;
}

export function captureBrowserCheckoutFunnelContext(): CheckoutFunnelContext | null {
  if (typeof window === "undefined") return null;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    // Some privacy modes block even reading the localStorage property.
  }
  return captureCheckoutFunnelContext({
    entryUrl: window.location.href,
    referrer: document.referrer,
    storage,
  });
}
