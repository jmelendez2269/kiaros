export interface FunnelAttribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer_host: string | null;
  entry_path: string | null;
  experiment_key: string | null;
  experiment_variant: string | null;
}

export const FUNNEL_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

function boundedQueryValue(url: URL, key: string, maximumLength: number): string | null {
  const value = url.searchParams.get(key)?.trim() ?? "";
  if (!value || value.length > maximumLength) return null;
  if (/^https?:\/\//i.test(value) || value.includes("?") || value.includes("#")) return null;
  return /^[a-z0-9][a-z0-9 ._:+~-]*$/i.test(value) ? value : null;
}

function safeReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    return hostname.length <= 253 ? hostname : null;
  } catch {
    return null;
  }
}

export function parseFunnelAttribution(
  entryUrl: URL | string,
  referrer?: string | null,
): FunnelAttribution {
  const url = entryUrl instanceof URL ? entryUrl : new URL(entryUrl, "https://kairos.invalid");
  const path = url.pathname.length <= 256 && /^\/[a-zA-Z0-9/_~.+-]*$/.test(url.pathname)
    ? url.pathname
    : null;

  return {
    source: boundedQueryValue(url, "utm_source", 80)?.toLowerCase() ?? null,
    medium: boundedQueryValue(url, "utm_medium", 80)?.toLowerCase() ?? null,
    campaign: boundedQueryValue(url, "utm_campaign", 120),
    referrer_host: safeReferrerHost(referrer),
    entry_path: path,
    experiment_key: boundedQueryValue(url, "experiment", 80),
    experiment_variant: boundedQueryValue(url, "variant", 80),
  };
}

export function preserveFirstTouchAttribution(
  original: FunnelAttribution | null | undefined,
  incoming: FunnelAttribution,
): FunnelAttribution {
  if (!original) return incoming;
  return {
    source: original.source ?? incoming.source,
    medium: original.medium ?? incoming.medium,
    campaign: original.campaign ?? incoming.campaign,
    referrer_host: original.referrer_host ?? incoming.referrer_host,
    entry_path: original.entry_path ?? incoming.entry_path,
    experiment_key: original.experiment_key ?? incoming.experiment_key,
    experiment_variant: original.experiment_variant ?? incoming.experiment_variant,
  };
}

export function shouldRotateFunnelSession(
  startedAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!startedAt) return true;
  const started = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(started.getTime())) return true;
  const age = now.getTime() - started.getTime();
  return age < 0 || age >= FUNNEL_SESSION_MAX_AGE_MS;
}
