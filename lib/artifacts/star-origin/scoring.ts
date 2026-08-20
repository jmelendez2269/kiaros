/**
 * scoring.ts
 *
 * Turns a natal chart into lineage scores for Star Origin, Layer 1.
 *
 * Two ideas do the real work:
 *
 *  1. A marker counts for more when it moves fast. The Ascendant shifts with
 *     four minutes of birth time, so it is genuinely specific to a person.
 *     Neptune sits still for a decade, so it only says which years someone was
 *     born in - it scores nothing.
 *
 *  2. Raw scores are never compared across lineages. Some lineages are simply
 *     bigger targets. Scores are compared against what that same lineage
 *     normally scores across thousands of charts. See baseline.ts.
 */

import type { NatalChart } from "@/types/blueprint";
import { angularSep, starPositionsForYear, type CatalogStar } from "./stars.ts";

/** Points per marker. Higher = moves faster = more specific to one person. */
export const MARKER_POINTS: Record<string, number> = {
  ascendant: 10,
  midheaven: 10,
  sun: 8,
  moon: 7,
  mercury: 5,
  venus: 5,
  mars: 4,
  jupiter: 2,
  north_node: 2,
  south_node: 2,
  saturn: 2,
  // Uranus, Neptune and Pluto are deliberately absent. They are shared by
  // everyone born in a given stretch of years, so they cannot say anything
  // about an individual.
};

/**
 * Why the Midheaven scores as high as the Ascendant, and the nodes as low as
 * Saturn.
 *
 * The scale is set by one thing only: how quickly a marker moves, which decides
 * how many other people share the same degree. Roughly, in degrees per day:
 *
 *   Ascendant / Midheaven  360      a few minutes of birth time changes it
 *   Moon                    13.2
 *   Mercury / Venus / Sun    1
 *   Mars                     0.5
 *   Jupiter                  0.08
 *   Lunar nodes              0.05    about a month of births share a degree
 *   Saturn                   0.03
 *
 * The Midheaven turns with the sky exactly as the Ascendant does, so it earns
 * the same 10. The nodes matter enormously in how a chart is read, but they
 * crawl - slower than Jupiter - so on this scale they land at 2. That means a
 * node contact is reported as a finding and counts toward the ranking, but
 * cannot by itself decide someone's lineage. Raising them would be choosing the
 * answer we want rather than the one the sky gives.
 */

/** Starting orb in degrees. The simulation decides the final value. */
export const DEFAULT_ORB = 1.5;

export interface Contact {
  marker: string;
  markerLongitude: number;
  star: CatalogStar;
  starLongitude: number;
  orb: number;
  closeness: number;
  points: number;
}

export interface ChartScore {
  contacts: Contact[];
  byLineage: Map<string, number>;
}

/**
 * Full points when exact, fading to nothing at the edge of orb, on a curve
 * that rewards very tight hits steeply rather than evenly.
 */
export function closeness(orb: number, maxOrb: number): number {
  if (orb >= maxOrb) return 0;
  return Math.cos((orb / maxOrb) * (Math.PI / 2));
}

/** The marker longitudes we can currently compute from a natal chart. */
export function markersFromChart(chart: NatalChart): Map<string, number> {
  const m = new Map<string, number>();
  m.set("sun", chart.sun.longitude);
  m.set("moon", chart.moon.longitude);
  m.set("mercury", chart.mercury.longitude);
  m.set("venus", chart.venus.longitude);
  m.set("mars", chart.mars.longitude);
  m.set("jupiter", chart.jupiter.longitude);
  m.set("saturn", chart.saturn.longitude);
  if (!chart.birthTimeUnknown && chart.ascendantLongitude !== undefined) {
    m.set("ascendant", chart.ascendantLongitude);
  }
  if (!chart.birthTimeUnknown && chart.midheavenLongitude !== undefined) {
    m.set("midheaven", chart.midheavenLongitude);
  }
  // The nodes need no birth time, so they are available on every chart.
  if (chart.northNodeLongitude !== undefined) {
    m.set("north_node", chart.northNodeLongitude);
  }
  if (chart.southNodeLongitude !== undefined) {
    m.set("south_node", chart.southNodeLongitude);
  }
  return m;
}

/**
 * Score one chart.
 *
 * The important rule: each marker scores at most ONE star - the closest within
 * orb. All nine Pleiades sit inside about one degree of each other, so without
 * this a single planet sitting on the cluster would score that lineage nine
 * times over. Orion's Belt has the same shape.
 */
export function scoreChart(
  chart: NatalChart,
  year: number,
  opts: {
    orb?: number;
    starPositions?: ReadonlyArray<{ star: CatalogStar; longitude: number }>;
  } = {},
): ChartScore {
  const orbMax = opts.orb ?? DEFAULT_ORB;
  const positions = opts.starPositions ?? starPositionsForYear(year);
  const markers = markersFromChart(chart);

  const contacts: Contact[] = [];
  const byLineage = new Map<string, number>();

  for (const [marker, markerLon] of markers) {
    const points = MARKER_POINTS[marker];
    if (!points) continue;

    // Closest star within orb wins, and only that one.
    let best: { star: CatalogStar; longitude: number; orb: number } | null =
      null;
    for (const p of positions) {
      if (p.star.lineage === null) continue; // e.g. Algol - a Layer 2 marker
      const sep = angularSep(markerLon, p.longitude);
      if (sep > orbMax) continue;
      if (best === null || sep < best.orb) {
        best = { star: p.star, longitude: p.longitude, orb: sep };
      }
    }
    if (!best) continue;

    const close = closeness(best.orb, orbMax);
    const scored = points * close * best.star.weight;

    contacts.push({
      marker,
      markerLongitude: markerLon,
      star: best.star,
      starLongitude: best.longitude,
      orb: best.orb,
      closeness: close,
      points: scored,
    });

    const lineage = best.star.lineage as string;
    byLineage.set(lineage, (byLineage.get(lineage) ?? 0) + scored);
  }

  return { contacts, byLineage };
}
