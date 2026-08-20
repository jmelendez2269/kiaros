/**
 * compose.ts
 *
 * Joins a finding to its written pieces.
 *
 * Nothing here decides anything. The star meaning, the marker voice and the
 * closeness band were each written once by a person; this only puts them in
 * order and formats a degree. Keeping the assembly this dumb is the point -
 * every sentence in the finished report can be traced back to a file somebody
 * wrote and signed off, which is the fact-tracing convention the shared
 * contract already asks for.
 */

import { ZODIAC_SIGNS, type ZodiacSign } from "@/types/blueprint";
import type { Finding } from "../findings.ts";
import { STAR_MEANINGS } from "./star-meanings.ts";
import { BAND_VOICES, BODY_VOICES } from "./body-voices.ts";
import {
  DECIDED_BY_CONTACT,
  LINEAGE_MEANINGS,
  RESULT_VOICES,
  SPREAD_OPENING,
  standingPhrase,
} from "./lineage-meanings.ts";

export interface ComposedFinding {
  findingId: string;
  /** "Regulus on your Moon" */
  title: string;
  /** What part of a life this lands in. */
  subtitle: string;
  /** Two to four sentences, in reading order. */
  body: readonly string[];
  /** Where the meaning came from, printed small under the block. */
  source: "traditional" | "from the object";
}

export interface WorkingsRow {
  star: string;
  constellation: string;
  marker: string;
  /** Where the star sat on the birth date, drift applied: "29 Leo 42'". */
  starPosition: string;
  /** Where the marker sat. */
  markerPosition: string;
  /** "0 deg 21'" */
  separation: string;
}

function signAndDegree(longitude: number): { sign: ZodiacSign; degree: number } {
  const norm = ((longitude % 360) + 360) % 360;
  return { sign: ZODIAC_SIGNS[Math.floor(norm / 30)], degree: norm % 30 };
}

/** "29 Leo 42'" - the form an astrologer expects, not a decimal. */
export function formatPosition(longitude: number): string {
  const { sign, degree } = signAndDegree(longitude);
  const whole = Math.floor(degree);
  const minutes = Math.round((degree - whole) * 60);
  return minutes === 60
    ? `${whole + 1} ${sign} 00'`
    : `${whole} ${sign} ${String(minutes).padStart(2, "0")}'`;
}

/** "0 deg 21'" */
export function formatSeparation(orb: number): string {
  const whole = Math.floor(orb);
  const minutes = Math.round((orb - whole) * 60);
  return minutes === 60
    ? `${whole + 1} deg 00'`
    : `${whole} deg ${String(minutes).padStart(2, "0")}'`;
}

export class MissingContentError extends Error {}

export function composeFinding(finding: Finding): ComposedFinding {
  const star = STAR_MEANINGS[finding.star.id];
  if (!star) {
    throw new MissingContentError(`no meaning written for star ${finding.star.id}`);
  }
  const body = BODY_VOICES[finding.marker];
  if (!body) {
    throw new MissingContentError(`no voice written for marker ${finding.marker}`);
  }
  const band = BAND_VOICES[finding.band];

  const opening = `${body.display} ${band.verb} ${finding.star.name}, ${star.image}, on the day you were born.`;
  const sentences = [
    `${opening[0].toUpperCase()}${opening.slice(1)} ${band.note}`,
    star.theme,
    `${body.lead} ${star.asks}.`,
  ];
  if (band.showShadow) sentences.push(star.shadow);

  return {
    findingId: finding.findingId,
    title: `${finding.star.name} on ${body.display}`,
    subtitle: body.arena,
    body: sentences,
    source: star.lore,
  };
}

/**
 * The line that opens the lineage section, printed ONCE above whatever follows.
 *
 * It was inside the per-lineage block until a generated paired report printed
 * "two lineages came out level in your chart" twice, once over each of them.
 * Framing belongs to the section; the blocks underneath are about one lineage
 * each and must not narrate the shape of the whole result.
 */
export function lineageSectionOpening(kind: "single" | "paired" | "spread"): string {
  return kind === "spread" ? SPREAD_OPENING : RESULT_VOICES[kind].opening;
}

/**
 * Which account of the reasoning is the true one.
 *
 * The rule is not obvious and getting it wrong prints a self-contradiction, so
 * it lives here rather than at each call site:
 *
 *  - one notable lineage -> nothing was ranked. The absolute bar decided it.
 *  - several, one clearly ahead -> the baseline picked the winner. Standing is
 *    a true account and gets printed.
 *  - several, too close to separate -> a `paired` result. The baseline was
 *    consulted and reported that it could not split them, which the section
 *    opening already says. Printing each one's percentile underneath adds a
 *    downgrade to a headline result and explains nothing the reader needs.
 */
export function decidedByFor(
  kind: "single" | "paired",
  notableCount: number,
): "contact" | "ranked" {
  if (kind === "paired") return "contact";
  return notableCount > 1 ? "ranked" : "contact";
}

export interface ComposedLineage {
  lineageId: string;
  /** "Orion - specifically Rigel", or just "Sirius" when there is only one. */
  title: string;
  /** "also called Pleiadian, Alcyonean, Tolekan" - empty when none are named. */
  subtitle: string;
  body: readonly string[];
}

/**
 * Write up one lineage result.
 *
 * `leadContact` is the contact that did most to produce the answer. It is what
 * lets the report say "Orion - specifically Rigel" instead of leaving a buyer
 * to wonder which of six stars was meant, and it is why the section can name
 * the marker that carried it without the reader going to the workings table.
 */
export function composeLineage(input: {
  lineageId: string;
  standing: number;
  kind: "single" | "paired";
  /**
   * What actually produced the answer.
   *
   * "contact" - one lineage cleared the absolute bar, so the percentile
   * decided nothing and must not be printed as though it had.
   * "ranked" - more than one cleared it and the baseline broke the tie, which
   * is the only case where the standing sentence is a true account of the
   * reasoning. See lineage-meanings.ts.
   */
  decidedBy: "contact" | "ranked";
  leadContact?: { starName: string; marker: string };
}): ComposedLineage {
  const lineage = LINEAGE_MEANINGS[input.lineageId];
  if (!lineage) {
    throw new MissingContentError(`no meaning written for lineage ${input.lineageId}`);
  }
  const voice = RESULT_VOICES[input.kind];
  const lead = input.leadContact;
  const leadBody = lead ? BODY_VOICES[lead.marker] : undefined;

  // Only name a specific star when the lineage has more than one to choose
  // between. "Sirius - specifically Sirius" helps nobody.
  const named =
    lead && lineage.displayName.toLowerCase() !== lead.starName.toLowerCase()
      ? ` — specifically ${lead.starName}`
      : "";

  const produced =
    leadBody && lead ? `What produced it was ${leadBody.display} meeting ${lead.starName}.` : "";
  // A paired result has two of these blocks under one opening, and that
  // opening already explains the standard both of them met. Repeating the
  // explanation in each block is the same paragraph twice, which is what
  // `writtenUp` exists to prevent on the findings side.
  const reasoning =
    input.kind === "paired"
      ? produced
      : input.decidedBy === "ranked"
        ? `${produced} ${standingPhrase(input.standing)}`.trim()
        : `${produced} ${DECIDED_BY_CONTACT}`.trim();

  const body = [
    `${lineage.displayName}, ${lineage.image}.`,
    lineage.theme,
    reasoning,
    lineage.carries,
    `This asks you to ${lineage.asks}.`,
  ];
  if (voice.showShadow) body.push(lineage.shadow);

  return {
    lineageId: lineage.id,
    title: `${lineage.displayName}${named}`,
    subtitle: lineage.subStrands.length
      ? `also called ${lineage.subStrands.join(", ")}`
      : "",
    body,
  };
}

export function workingsRow(finding: Finding): WorkingsRow {
  const star = STAR_MEANINGS[finding.star.id];
  const body = BODY_VOICES[finding.marker];
  return {
    star: finding.star.name,
    constellation: star?.constellation ?? "",
    marker: body?.tableLabel ?? finding.marker,
    starPosition: formatPosition(finding.starLongitude),
    markerPosition: formatPosition(finding.markerLongitude),
    separation: formatSeparation(finding.orb),
  };
}
