/**
 * report-frame.ts
 *
 * The two pieces that belong to the report rather than to any star: how to
 * read it, and what to do with it afterwards.
 *
 * The voice rules are stated in full at the top of lineage-meanings.ts.
 * Conviction, real history, no hedging, nothing comparative. The opening in
 * particular must not read as a disclaimer - the spec puts the framing FIRST
 * rather than last precisely so it can set the terms warmly instead of
 * apologising at the end.
 */

export interface FramePiece {
  title: string;
  paragraphs: readonly string[];
}

export const HOW_TO_READ_THIS: FramePiece = {
  title: "How to read this",
  paragraphs: [
    "The fixed stars are not the planets. A planet moves through your chart in days or months; these have stood more or less where they are since before anyone was writing things down, and they were the first things human beings ever used to tell each other where they were and when to plant. Every culture that has looked up has named them, and a surprising number named the same ones the same way.",
    "But they do move, slowly. The whole sky slides about one degree every seventy-two years, which sounds like nothing and is in fact most of the distance that decides anything in this report. So none of these positions came out of a table. Each one was worked out for the year you were born.",
    "Read the closest contact first, wherever it appears. Distance is the whole of it here — a star half a degree from your Sun is saying something specific about you, and the same star four degrees away is colouring the edge of it. The report tells you which is which in words, and then gives you the number.",
    "And everything in here can be checked. The last pages carry every position to the arcminute: which star, which point of your chart it met, where each of them stood on the day, and how far apart they were. Take it to anyone who reads charts. It will hold.",
  ],
};

export const TOP_THREE_PROFILE: FramePiece = {
  title: "Your top three resonances",
  paragraphs: [
    "A chart can carry more than one recognisable line. The first place belongs to the lineage this engine can actually name from a qualifying contact and the full baseline. The next two are the nearest supporting resonances: not competing verdicts, but real echoes that change how the primary line is lived.",
    "You may come to this page already carrying another star-family name. Nothing here asks you to surrender it. Read these three together, then use the wider field to see where that earlier name sits in this chart. Recognition matters more than allegiance to a label.",
  ],
};

export const TOP_THREE_SPREAD_INTRO =
  "No single lineage crossed the engine's threshold for a primary origin in this chart. These are the three closest resonances in the measured field. They are meaningful supporting echoes, but none is being presented as a definitive first line.";

export const WIDER_FIELD_INTRO =
  "The wider field matters too. The remaining families are shown in order of their nearest approach, so no lineage disappears simply because it did not make the top three.";

export const LIVING_WITH_IT: FramePiece = {
  title: "Living with it",
  paragraphs: [
    "You are not required to do anything with this. A great deal of what gets sold under this heading arrives with instructions — a practice to keep, a thing to activate, a next purchase. There is none of that here.",
    "What a reading like this is actually good for is recognition. Some of it will have landed as something you already knew and had never been given words for, and that is the part worth keeping. Some of it will not have landed at all. Leave that where it is; it may mean something in five years or it may simply not be yours, and you are the only one in a position to tell.",
    "The one thing worth returning to is whatever was named as the cost. Every line in this report gives something and charges for it, and the charge is usually the part a person has spent their life not looking at directly. It is also, without exception, the part that changes something when it finally gets looked at.",
    "Your stars will be where they are for the rest of your life. Nothing here expires, and nothing here needs renewing.",
  ],
};

/** Bumped whenever any content file changes, and recorded in every report. */
export const STAR_ORIGIN_CONTENT_VERSION = "star-origin.content.v2" as const;
