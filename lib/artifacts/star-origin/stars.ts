/**
 * stars.ts
 *
 * Star positions for Star Origin, Layer 1.
 *
 * Fixed stars drift about 1 degree every 72 years relative to the tropical
 * zodiac. That is more than half the whole orb, so a star's position has to be
 * worked out for the person's birth year rather than looked up from a table.
 *
 * Source data: SIMBAD (Centre de Donnees astronomiques de Strasbourg), ICRS
 * J2000, queried 2026-08-19. See star-catalog.json.
 */

import catalog from "./star-catalog.json" with { type: "json" };

const DEG = Math.PI / 180;

/** Mean obliquity of the ecliptic at J2000, in degrees. */
const OBLIQUITY_J2000 = 23.439291111111;

export interface CatalogStar {
  id: string;
  name: string;
  simbad: string;
  lineage: string | null;
  weight: number;
  ra: number;
  dec: number;
  pmra: number;
  pmdec: number;
  note?: string;
}

export const STARS: readonly CatalogStar[] = catalog.stars as CatalogStar[];
export const STAR_CATALOG_VERSION: string = catalog.catalogVersion;

/** Every lineage that has at least one star. */
export const LINEAGES: readonly string[] = Array.from(
  new Set(STARS.map((s) => s.lineage).filter((l): l is string => l !== null)),
).sort();

/**
 * Accumulated general precession in longitude since J2000, in arcseconds.
 * IAU series; T is Julian centuries from J2000. Linear term is the familiar
 * ~50.29 arcsec per year.
 */
function precessionArcsec(T: number): number {
  return 5029.0966 * T + 1.11113 * T * T;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Tropical ecliptic longitude of a star for a given decimal year. */
export function starLongitude(star: CatalogStar, year: number): number {
  const yearsSinceJ2000 = year - 2000.0;
  const T = yearsSinceJ2000 / 100.0;

  // Proper motion. SIMBAD's pmra is mu-alpha* (already times cos dec), so
  // dividing by cos(dec) recovers the change in right ascension itself.
  const decRad0 = star.dec * DEG;
  const raDrift =
    ((star.pmra / 3_600_000) * yearsSinceJ2000) / Math.cos(decRad0);
  const decDrift = (star.pmdec / 3_600_000) * yearsSinceJ2000;

  const ra = (star.ra + raDrift) * DEG;
  const dec = (star.dec + decDrift) * DEG;

  const eps = OBLIQUITY_J2000 * DEG;
  const lonJ2000 =
    Math.atan2(
      Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps),
      Math.cos(ra),
    ) / DEG;

  return norm360(lonJ2000 + precessionArcsec(T) / 3600);
}

/** All star longitudes for one year, computed once and reused across charts. */
export function starPositionsForYear(
  year: number,
): ReadonlyArray<{ star: CatalogStar; longitude: number }> {
  return STARS.map((star) => ({ star, longitude: starLongitude(star, year) }));
}

/** Shortest angular distance between two longitudes, 0-180. */
export function angularSep(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}
