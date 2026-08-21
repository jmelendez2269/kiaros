/**
 * body-voices.ts
 *
 * One voice per marker, written once, shared by all 45 stars and all 12
 * lineages.
 *
 * A star means the same thing wherever it lands. What changes is the part of a
 * life it lands in. Regulus is the heart of the lion whether it meets your
 * Moon or your Midheaven — on the Moon it runs in private, on the Midheaven it
 * runs in public, and that is the whole of the difference. The star carries the
 * meaning, the marker carries the arena, and the report joins them.
 *
 * The voice rules are stated in full at the top of lineage-meanings.ts and
 * govern this file. Conviction, not hedging. These are short pieces and every
 * one of them is used hundreds of times, so they have to survive repetition.
 *
 * Only the eleven markers that score appear here. Uranus, Neptune and Pluto
 * are absent for the same reason they are absent from MARKER_POINTS: everyone
 * born across a stretch of years shares them, so a finding on one of them
 * would be a statement about a birth decade rather than about a person.
 */

import type { ClosenessBand } from "../findings.ts";

export interface BodyVoice {
  /** Matches the marker key in MARKER_POINTS. */
  marker: string;
  /** How the marker is named in a sentence. */
  display: string;
  /** Same, for the workings table on the last page. */
  tableLabel: string;
  /** What part of a life this marker is. Printed under the heading. */
  arena: string;
  /** Leads into the star's `gift`, which begins mid-sentence. */
  lead: string;
}

export const BODY_VOICES: Readonly<Record<string, BodyVoice>> = {
  ascendant: {
    marker: "ascendant",
    display: "your Ascendant",
    tableLabel: "Ascendant",
    arena: "the door — what meets people before you have said a word",
    lead: "This one lives in the first thirty seconds, in the part of you that arrives before you do. It gives you",
  },
  midheaven: {
    marker: "midheaven",
    display: "your Midheaven",
    tableLabel: "Midheaven",
    arena: "the public life — the work your name gets attached to",
    lead: "This one is lived in public, in front of people, in the thing you become known for. It gives you",
  },
  sun: {
    marker: "sun",
    display: "your Sun",
    tableLabel: "Sun",
    arena: "the centre — what you are becoming rather than performing",
    lead: "This sits at the very centre of you, not at the edge, and it has been there the whole time. It gives you",
  },
  moon: {
    marker: "moon",
    display: "your Moon",
    tableLabel: "Moon",
    arena: "the private weather — what you need in order to feel safe",
    lead: "This one runs underneath, in private, whether or not you are watching it. It gives you",
  },
  mercury: {
    marker: "mercury",
    display: "your Mercury",
    tableLabel: "Mercury",
    arena: "the mind — how you think, and how you put things into words",
    lead: "You will find this in how you think and how you say things, which is where people meet your mind. It gives you",
  },
  venus: {
    marker: "venus",
    display: "your Venus",
    tableLabel: "Venus",
    arena: "love and worth — what draws you, and what you believe you are owed",
    lead: "This lives in what you love and in what you quietly believe you are worth. It gives you",
  },
  mars: {
    marker: "mars",
    display: "your Mars",
    tableLabel: "Mars",
    arena: "the fight — how you push, and what you will actually go to war over",
    lead: "This is where your force is, in how you push and what you will not let go of. It gives you",
  },
  jupiter: {
    marker: "jupiter",
    display: "your Jupiter",
    tableLabel: "Jupiter",
    arena: "the yes — where you expand, and where you go too far",
    lead: "This one shows in what you say yes to before you have thought about it. It gives you",
  },
  saturn: {
    marker: "saturn",
    display: "your Saturn",
    tableLabel: "Saturn",
    arena: "the long work — what you are responsible for, and where time is the price",
    lead: "This is slow ground and it will not be hurried; it is the part of your life that takes decades. It gives you",
  },
  north_node: {
    marker: "north_node",
    display: "your North Node",
    tableLabel: "North Node",
    arena: "the direction — where you keep being pointed, comfortable or not",
    lead: "This is the direction you are being pointed rather than the ground you are standing on. It gives you",
  },
  south_node: {
    marker: "south_node",
    display: "your South Node",
    tableLabel: "South Node",
    arena: "the inheritance — what you already know how to do, possibly too well",
    lead: "This is old ground, carried in rather than learned here, and it is the easiest thing you do. It gives you",
  },
};

export interface BandVoice {
  band: ClosenessBand;
  /** Completes "{marker.display} {verb} {star name}". */
  verb: string;
  /** How close, said the way a person would say it rather than in degrees. */
  note: string;
  /** Whether the star's `cost` line gets printed. */
  showCost: boolean;
}

/**
 * The degrees are on the last page. Here it is said in words, because a number
 * means nothing to a reader until somebody has shown them what a good one
 * looks like — and because "the same point of sky" is both more accurate to
 * the experience and more true to how this has always been written.
 *
 * Only the tightest contacts carry the cost line. Not to soften the report:
 * the counterweight belongs to a claim that is actually being made strongly,
 * and hanging a warning on something four degrees out would be borrowing
 * weight the finding does not have.
 */
export const BAND_VOICES: Readonly<Record<ClosenessBand, BandVoice>> = {
  exact: {
    band: "exact",
    verb: "stood on",
    note: "To the eye they were one point of light. There is no closer version of this — read it first, and read it twice.",
    showCost: true,
  },
  close: {
    band: "close",
    verb: "stood close to",
    note: "Near enough to be read together, and near enough to feel.",
    showCost: false,
  },
  within_range: {
    band: "within_range",
    verb: "stood within reach of",
    note: "Not the loudest thing in your chart. It is still in the room.",
    showCost: false,
  },
};
