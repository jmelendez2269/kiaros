/**
 * lineages.ts
 *
 * Which catalogue lineages are ranked, how the multi-star ones group, and how
 * far a chart sits from every one of them.
 *
 * The first two of those were copy-pasted into four separate scripts, which is
 * exactly the kind of duplication that lets one copy drift and quietly change
 * what the product says. They live here now.
 */

import { angularSep, starPositionsForYear, STARS, type CatalogStar } from "./stars.ts";
import { markersFromChart, MARKER_POINTS } from "./scoring.ts";
import type { NatalChart } from "@/types/blueprint";

/**
 * The twelve that are RANKED as origins.
 *
 * The other 24 catalogue objects are still computed and still reported - "your
 * Moon sits on Regulus" is a strong, specific statement - they simply are not
 * candidates for where someone is from. Each is attested as a lineage by only
 * one source, and none has enough stars to rank fairly against a nine-star
 * cluster like the Pleiades. See spec 2.8.
 */
export const RANKED_LINEAGES = [
  "pleiades", "lyra", "orion", "sirius", "arcturus", "andromeda",
  "centaurus", "eridanus", "polaris", "draco", "reticulum", "galactic_centre",
] as const;

export type RankedLineage = (typeof RANKED_LINEAGES)[number];

/** Catalogue lineage id -> the banner it is reported under. */
export const GROUP_INTO: Readonly<Record<string, string>> = {
  orion_betelgeuse: "orion",
  orion_rigel: "orion",
  orion_bellatrix: "orion",
  orion_mintaka: "orion",
  orion_alnilam: "orion",
  orion_alnitak: "orion",
  hadar: "centaurus",
};

export function groupOf(lineageId: string): string {
  return GROUP_INTO[lineageId] ?? lineageId;
}

const RANKED_SET: ReadonlySet<string> = new Set(RANKED_LINEAGES);

export function isRanked(lineageId: string | null): boolean {
  return lineageId !== null && RANKED_SET.has(groupOf(lineageId));
}

/** Every catalogue star belonging to a ranked lineage, grouped under it. */
export function starsOfLineage(lineage: string): CatalogStar[] {
  return STARS.filter((s) => s.lineage !== null && groupOf(s.lineage) === lineage);
}

export interface LineageProximity {
  lineage: string;
  /** The closest this chart came to any star of this line. */
  orb: number;
  /** Which star, and which of the chart's points came nearest to it. */
  nearestStar: string;
  nearestMarker: string;
  /** Close enough to have been scored at all. */
  inScoringOrb: boolean;
  /** Close enough, and on a point that may name a line, to have decided it. */
  couldName: boolean;
}

/**
 * How far this chart sits from every ranked lineage — the whole map, not just
 * the answer.
 *
 * This exists because "where are you from" is only half of what a buyer wants.
 * The other half is where they sit relative to everywhere else: which lines
 * they brush, and which they are nowhere near. A nearest approach is always
 * defined, so this always returns all twelve rows and never has a hole in it.
 *
 * It makes no new claim and needs no new stars. It is a different view of
 * numbers the engine already had, which matters — adding stars to widen
 * results was measured and rejected on 2026-08-20, and nothing here reopens
 * that.
 */
export function lineageMap(
  chart: NatalChart,
  year: number,
  opts: {
    scoringOrb?: number;
    notableOrb?: number;
    deciding?: ReadonlySet<string>;
    minDecidingWeight?: number;
    starPositions?: ReadonlyArray<{ star: CatalogStar; longitude: number }>;
  } = {},
): LineageProximity[] {
  const scoringOrb = opts.scoringOrb ?? 2.5;
  const notableOrb = opts.notableOrb ?? 1.5;
  const minWeight = opts.minDecidingWeight ?? 0.5;
  const positions = opts.starPositions ?? starPositionsForYear(year);
  const markers = markersFromChart(chart);

  return RANKED_LINEAGES.map((lineage) => {
    let best: LineageProximity | null = null;

    for (const p of positions) {
      if (p.star.lineage === null || groupOf(p.star.lineage) !== lineage) continue;
      for (const [marker, markerLon] of markers) {
        if (!MARKER_POINTS[marker]) continue;
        const sep = angularSep(markerLon, p.longitude);
        if (best !== null && sep >= best.orb) continue;
        best = {
          lineage,
          orb: sep,
          nearestStar: p.star.name,
          nearestMarker: marker,
          inScoringOrb: sep <= scoringOrb,
          couldName:
            sep <= notableOrb &&
            (opts.deciding?.has(marker) ?? true) &&
            p.star.weight >= minWeight,
        };
      }
    }

    // Every ranked lineage has stars and every chart has markers, so a nearest
    // approach always exists. The fallback is here so the type is honest, not
    // because it is reachable.
    return (
      best ?? {
        lineage,
        orb: 180,
        nearestStar: "",
        nearestMarker: "",
        inScoringOrb: false,
        couldName: false,
      }
    );
  }).sort((a, b) => a.orb - b.orb);
}
