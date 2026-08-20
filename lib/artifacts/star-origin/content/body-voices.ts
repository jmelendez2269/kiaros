/**
 * body-voices.ts
 *
 * One voice per marker, written once, shared by all 45 stars.
 *
 * A star means the same thing wherever it lands. What changes is the part of a
 * life it lands in. Regulus is the heart of the lion whether it meets your Moon
 * or your Midheaven; on the Moon that plays out in private and on the Midheaven
 * it plays out in public, and that is the whole of the difference. So the star
 * carries the meaning and the marker carries the arena, and the report joins
 * them.
 *
 * Only the eleven markers that score appear here. Uranus, Neptune and Pluto are
 * absent for the same reason they are absent from MARKER_POINTS: everyone born
 * across a stretch of years shares them, so a finding on one of them is a
 * statement about a birth decade rather than about a person. That is precisely
 * what this product refuses to sell.
 */

import type { ClosenessBand } from "../findings.ts";

export interface BodyVoice {
  /** Matches the marker key in MARKER_POINTS. */
  marker: string;
  /** How the marker is named in a sentence: "your Moon", "your Ascendant". */
  display: string;
  /** Same, for the workings table on page 2. */
  tableLabel: string;
  /** What part of a life this marker is about. Completes "...that lands in". */
  arena: string;
  /** Leads into the star's `asks`. Completes "{lead} {asks}." */
  lead: string;
}

export const BODY_VOICES: Readonly<Record<string, BodyVoice>> = {
  ascendant: {
    marker: "ascendant",
    display: "your Ascendant",
    tableLabel: "Ascendant",
    arena: "how you arrive: what people meet before you have said anything",
    lead: "Where this shows is at the door. It asks you to",
  },
  midheaven: {
    marker: "midheaven",
    display: "your Midheaven",
    tableLabel: "Midheaven",
    arena: "what you are known for, and the work your name gets attached to",
    lead: "This one plays out in public. It asks you to",
  },
  sun: {
    marker: "sun",
    display: "your Sun",
    tableLabel: "Sun",
    arena: "the centre of you: what you are steadily becoming rather than performing",
    lead: "This sits at the centre rather than the edge. It asks you to",
  },
  moon: {
    marker: "moon",
    display: "your Moon",
    tableLabel: "Moon",
    arena: "your private weather, and what you need in order to feel safe",
    lead: "This one is private, and it runs whether or not you are looking. It asks you to",
  },
  mercury: {
    marker: "mercury",
    display: "your Mercury",
    tableLabel: "Mercury",
    arena: "how you think, and how you put things into words",
    lead: "You will find this in how you talk and how you work things out. It asks you to",
  },
  venus: {
    marker: "venus",
    display: "your Venus",
    tableLabel: "Venus",
    arena: "what you love, and what you consider yourself worth",
    lead: "This shows up in what you are drawn to. It asks you to",
  },
  mars: {
    marker: "mars",
    display: "your Mars",
    tableLabel: "Mars",
    arena: "how you push, and what you will actually fight for",
    lead: "This one is about force. It asks you to",
  },
  jupiter: {
    marker: "jupiter",
    display: "your Jupiter",
    tableLabel: "Jupiter",
    arena: "where you say yes, and where you go too far",
    lead: "This is where you expand without checking. It asks you to",
  },
  saturn: {
    marker: "saturn",
    display: "your Saturn",
    tableLabel: "Saturn",
    arena: "what you are responsible for, and where the work goes slowly",
    lead: "This is slow ground, and it does not reward hurrying. It asks you to",
  },
  north_node: {
    marker: "north_node",
    display: "your North Node",
    tableLabel: "North Node",
    arena: "the direction you keep being pointed in, whether or not it is comfortable",
    lead: "This is the direction of travel rather than the current position. It asks you to",
  },
  south_node: {
    marker: "south_node",
    display: "your South Node",
    tableLabel: "South Node",
    arena: "what you already know how to do, possibly too well",
    lead: "This is familiar ground, which is exactly the problem with it. It asks you to",
  },
};

export interface BandVoice {
  band: ClosenessBand;
  /** Completes "{marker.display} {verb} {star name}". */
  verb: string;
  /**
   * A plain-English note on how close this is. Buyers cannot read a degree
   * until they have been shown what a good one looks like, so the report says
   * this in words and puts the number in the workings table.
   */
  note: string;
  /** Whether the star's `shadow` line gets printed. */
  showShadow: boolean;
}

/**
 * Only the tightest contacts get the shadow line.
 *
 * Not to soften the report, but because the counterweight belongs to a claim
 * that is actually being made strongly. Printing a caution about a contact
 * sitting three degrees away would be borrowing weight the finding does not
 * have.
 */
export const BAND_VOICES: Readonly<Record<ClosenessBand, BandVoice>> = {
  exact: {
    band: "exact",
    verb: "sat on",
    note: "Inside a degree. This is as close as this reading gets, and it is the part of the chart to read first.",
    showShadow: true,
    },
  close: {
    band: "close",
    verb: "sat close to",
    note: "Close enough to count, and not so close that it should crowd out everything else here.",
    showShadow: false,
  },
  within_range: {
    band: "within_range",
    verb: "sat within range of",
    note: "In range rather than on top of it. Read this one as colouring rather than as a headline.",
    showShadow: false,
  },
};
