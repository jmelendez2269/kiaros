/**
 * compose.ts
 *
 * Joins a contact to its written pieces.
 *
 * Nothing here decides anything and nothing here writes anything. The star
 * meaning, the lineage meaning, the marker voice and the closeness band were
 * each written once by a person; this only puts them in order and formats a
 * degree. Keeping the assembly this dumb is the point — every sentence in the
 * finished report traces back to a file somebody wrote and signed off, which
 * is the fact-tracing convention the shared contract already asks for.
 */

import { ZODIAC_SIGNS, type ZodiacSign } from "@/types/blueprint";
import type { Finding } from "../findings.ts";
import { STAR_MEANINGS } from "./star-meanings.ts";
import { BAND_VOICES, BODY_VOICES } from "./body-voices.ts";
import {
  LINEAGE_MEANINGS,
  namingPhrase,
  RESULT_VOICES,
  SPREAD_OPENING,
  standingPhrase,
} from "./lineage-meanings.ts";

export interface ComposedFinding {
  findingId: string;
  /** "Rigel on your Sun" */
  title: string;
  /** What part of a life this lands in. */
  subtitle: string;
  /** Three or four paragraphs, in reading order. */
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

/** "29 Leo 42'" — the form an astrologer expects, not a decimal. */
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

const capitalise = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

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

  const spoken = star.proseName ?? finding.star.name;
  const opening = capitalise(
    `${body.display} ${band.verb} ${spoken}, ${star.image}, on the day you were born.`,
  );

  const paragraphs = [
    `${opening} ${band.note}`,
    star.history,
    `${body.lead} ${star.gift}.`,
  ];
  if (band.showCost) paragraphs.push(star.cost);

  return {
    findingId: finding.findingId,
    title: `${spoken} on ${body.display}`,
    subtitle: body.arena,
    body: paragraphs,
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
 *  - one notable lineage -> nothing was ranked. The contact decided it alone.
 *  - several, one clearly ahead -> the baseline picked the winner, so how
 *    strongly the line is carried is a true account and gets said.
 *  - several, too close to separate -> a `paired` result. The section opening
 *    already says they could not be split; saying more under each one adds a
 *    downgrade to a headline result.
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
  /** "Orion — specifically Rigel", or just "Sirius" when there is only one. */
  title: string;
  /** The image, plus the other names this line goes by. */
  subtitle: string;
  body: readonly string[];
}

/**
 * Write up one lineage result.
 *
 * `leadContact` is the contact that produced the answer, and it MUST be one
 * the engine accepted as notable. Choosing it by score alone would let the
 * report say "your Midheaven named this" — the Midheaven scores higher than
 * any other marker and is explicitly barred from naming a lineage, so the copy
 * would quietly reverse a decision the engine enforces. See findings.ts.
 */
export function composeLineage(input: {
  lineageId: string;
  standing: number;
  kind: "single" | "paired";
  decidedBy: "contact" | "ranked";
  leadContact?: { starName: string; marker: string; orb: number };
}): ComposedLineage {
  const lineage = LINEAGE_MEANINGS[input.lineageId];
  if (!lineage) {
    throw new MissingContentError(`no meaning written for lineage ${input.lineageId}`);
  }
  const lead = input.leadContact;
  const leadBody = lead ? BODY_VOICES[lead.marker] : undefined;

  // Only name a specific star when the line has more than one to choose
  // between. "Sirius — specifically Sirius" helps nobody.
  const named =
    lead && lineage.displayName.toLowerCase() !== lead.starName.toLowerCase()
      ? ` — specifically ${lead.starName}`
      : "";

  // Precise and unclinical are compatible. A buyer should be able to check
  // this against the workings table and find it exact, and should also want to
  // read it out loud.
  const naming =
    leadBody && lead
      ? `On the day you were born, ${leadBody.display} and ${lead.starName} ${namingPhrase(lead.orb)}. That is what named you.`
      : "";
  const reasoning =
    input.decidedBy === "ranked" ? `${naming} ${standingPhrase(input.standing)}`.trim() : naming;

  const body = [
    lineage.history,
    reasoning,
    lineage.nature,
    lineage.longing,
    lineage.purpose,
  ].filter((p) => p.length > 0);

  if (RESULT_VOICES[input.kind].showCost) body.push(lineage.cost);

  const aliases = lineage.subStrands.length
    ? ` · also called ${lineage.subStrands.join(", ")}`
    : "";

  return {
    lineageId: lineage.id,
    title: `${lineage.displayName}${named}`,
    subtitle: `${lineage.image}${aliases}`,
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
