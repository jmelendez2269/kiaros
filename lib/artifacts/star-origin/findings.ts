/**
 * findings.ts
 *
 * The fixed-star findings: "what is marked in your chart", as opposed to
 * "where are you from".
 *
 * This is the same sky read at a different standard, and it exists because
 * roughly 39% of charts have no clear lineage. Those reports are not lineage
 * reports with the lineage cut out - they are a fixed-star reading, which is a
 * thing people already buy on its own. The same selection also carries the
 * Mini tier, which never promises a lineage, and unknown-birth-time charts,
 * which lose the two heaviest markers.
 *
 * Nothing here is new astronomy. It is scoring.ts with three rules changed,
 * and each change is only defensible because a finding makes a smaller claim
 * than a lineage does.
 */

import type { NatalChart } from "@/types/blueprint";
import { angularSep, starPositionsForYear, type CatalogStar } from "./stars.ts";
import { closeness, markersFromChart, MARKER_POINTS } from "./scoring.ts";

/**
 * Findings use a wider orb than the lineage test - 4 degrees against 2.5.
 *
 * This is honest because it is a different claim. "Your Sun's nearest fixed
 * star is Regulus, 3 degrees off" is simply true and says nothing about where
 * anyone came from. Only the lineage claim needs the tight orb.
 *
 * 4 is not a taste call. The promise this report makes is three findings, and
 * the orb is set to the smallest number that keeps it. Measured over 2,000
 * charts: at 2.5 degrees 0.80% have nothing at all, at 3 it is 0.35%, at 4 it
 * is zero and 97.9% have three or more. Going wider buys almost nothing.
 */
export const FINDINGS_ORB = 4;

/**
 * Without a birth time the chart loses the Ascendant and the Midheaven, so it
 * has nine markers instead of eleven and a narrower net catches less. At 4
 * degrees only 94.2% of timeless charts reach three findings and 0.1% have
 * nothing; at 5 that is 98.4% and zero, which is where the timed charts sit.
 *
 * This is holding one promise steady across two kinds of chart, not relaxing a
 * standard to improve a number - the distinction that matters is that no
 * lineage claim is being made either way. The orb actually used is recorded in
 * provenance, so a report and its workings table can never disagree.
 */
export const FINDINGS_ORB_NO_TIME = 5;

export function findingsOrbFor(chart: { birthTimeUnknown?: boolean }): number {
  return chart.birthTimeUnknown ? FINDINGS_ORB_NO_TIME : FINDINGS_ORB;
}

/** How many findings get written up in full. The rest go in the workings table. */
export const FINDINGS_WRITTEN_UP = 3;

export interface Finding {
  /** Narrative sentences point here. */
  findingId: string;
  marker: string;
  markerLongitude: number;
  star: CatalogStar;
  starLongitude: number;
  orb: number;
  closeness: number;
  /** Ranking weight only - never shown, never called a score in the report. */
  strength: number;
  band: ClosenessBand;
}

/**
 * How tightly the contact sits, in words rather than numbers.
 *
 * The report says "sits on", not "0.34 degrees", because a buyer reading a
 * degree has to be taught what a good one looks like before it means anything.
 * The number is still there, in the workings table on page 2.
 */
export type ClosenessBand = "exact" | "close" | "within_range";

export function bandFor(orb: number): ClosenessBand {
  if (orb <= 1) return "exact";
  if (orb <= 2.5) return "close";
  return "within_range";
}

/**
 * Pick the findings for one chart.
 *
 * Three rules differ from lineage scoring, and only these three:
 *
 *  1. WIDER ORB - see FINDINGS_ORB above.
 *
 *  2. EVERY STAR COUNTS. Lineage scoring skips the 18 stars that are not
 *     ranked as lineages, and skips Algol, which has no lineage at all. A
 *     finding has no such problem: "your Moon sits on Regulus" is a strong,
 *     specific statement precisely because Regulus is Regulus. The reason
 *     those stars cannot rank - each attested by only one source, and none
 *     with enough stars to rank fairly against the Pleiades - has nothing to
 *     do with whether they can be reported.
 *
 *  3. STAR WEIGHT IS IGNORED. Weight exists to stop a nine-star cluster
 *     out-scoring a single star on size, which is a fairness problem inside a
 *     ranking. There is no ranking here. Merope on your Sun is Merope on your
 *     Sun, and reporting her at 0.4 strength would be answering a question
 *     nobody asked.
 *
 * What does NOT change: one star per marker, the closest inside orb. Without
 * it a single placement on the Pleiades yields nine near-identical findings
 * off one fact. And the marker list is still the fast markers only - Uranus,
 * Neptune and Pluto stay out, because "Neptune on Regulus" is a statement
 * about a birth decade, not about a person, which is the whole premise of
 * this report.
 */
export function selectFindings(
  chart: NatalChart,
  year: number,
  opts: {
    orb?: number;
    limit?: number;
    starPositions?: ReadonlyArray<{ star: CatalogStar; longitude: number }>;
  } = {},
): Finding[] {
  const orbMax = opts.orb ?? findingsOrbFor(chart);
  const positions = opts.starPositions ?? starPositionsForYear(year);
  const markers = markersFromChart(chart);

  const findings: Finding[] = [];

  for (const [marker, markerLon] of markers) {
    const points = MARKER_POINTS[marker];
    if (!points) continue;

    let best: { star: CatalogStar; longitude: number; orb: number } | null = null;
    for (const p of positions) {
      const sep = angularSep(markerLon, p.longitude);
      if (sep > orbMax) continue;
      if (best === null || sep < best.orb) {
        best = { star: p.star, longitude: p.longitude, orb: sep };
      }
    }
    if (!best) continue;

    const close = closeness(best.orb, orbMax);
    findings.push({
      findingId: `finding.${marker}.${best.star.id}`,
      marker,
      markerLongitude: markerLon,
      star: best.star,
      starLongitude: best.longitude,
      orb: best.orb,
      closeness: close,
      strength: points * close,
      band: bandFor(best.orb),
    });
  }

  findings.sort((a, b) => b.strength - a.strength || a.orb - b.orb);
  return opts.limit ? findings.slice(0, opts.limit) : findings;
}

/**
 * The findings that get written up in full.
 *
 * One star can be hit by two markers - a Mercury and a Midheaven three degrees
 * apart will both land on Altair - and both are true, so both stay in the
 * workings table. But writing them both up prints the same paragraph about the
 * eagle twice, four inches apart, which reads as padding whatever else it is.
 * So the written-up set takes the strongest contact per star and moves down
 * the list for the rest.
 *
 * Repeats are allowed back in only if there are not enough distinct stars to
 * fill the section, which happens to charts with very few findings and is
 * better than a short report.
 */
export function writtenUp(
  findings: readonly Finding[],
  count = FINDINGS_WRITTEN_UP,
  /**
   * The star that already produced the lineage, if there was one.
   *
   * Found by reading a real report. A chart whose Sun sits on Rigel gets a
   * full Orion history in the lineage section and then, immediately below, a
   * full Rigel history as the lead finding - the same star twice, at length,
   * on one page. The contact stays in the workings table because it is true;
   * it just does not get written up a second time.
   */
  alreadyWritten?: string,
): Finding[] {
  const seen = new Set<string>();
  if (alreadyWritten) seen.add(alreadyWritten);
  const chosen: Finding[] = [];
  for (const f of findings) {
    if (seen.has(f.star.id)) continue;
    seen.add(f.star.id);
    chosen.push(f);
    if (chosen.length === count) return chosen;
  }
  // Only if there are not enough distinct stars to fill the section. Better a
  // repeat than a short report - but the lineage star is the last resort of
  // the last resort.
  for (const f of [...findings].sort((a, b) =>
    Number(a.star.id === alreadyWritten) - Number(b.star.id === alreadyWritten),
  )) {
    if (chosen.includes(f)) continue;
    chosen.push(f);
    if (chosen.length === count) break;
  }
  return chosen;
}
