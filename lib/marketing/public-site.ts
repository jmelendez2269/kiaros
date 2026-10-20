/** Canonical public marketing origin (www). */
export const MARKETING_SITE_ORIGIN = "https://www.kairosplanner.xyz";

export function marketingCanonicalUrl(path: string): string {
  if (path === "/") return MARKETING_SITE_ORIGIN;
  return `${MARKETING_SITE_ORIGIN}${path}`;
}
