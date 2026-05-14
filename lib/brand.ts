/**
 * User-facing brand strings. The internal codebase (repo name, DB tables,
 * /api/oracle/* routes, .env vars) stays "Kiaros" / "Oracle" — only the
 * names rendered to users live here. Read from BRAND, do not hardcode.
 */
export const BRAND = {
  product: "Kairos",
  productTagline: "Your year, anchored to the sky.",
  oracle: "Stelloquy",
  oraclePronunciation: "steh-LOH-kwee",
} as const;

export type Brand = typeof BRAND;
