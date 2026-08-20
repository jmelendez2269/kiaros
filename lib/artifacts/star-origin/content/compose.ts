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
