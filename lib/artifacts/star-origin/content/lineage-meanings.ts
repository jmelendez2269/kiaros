/**
 * lineage-meanings.ts
 *
 * One meaning per ranked lineage. Twelve pieces.
 *
 * Only the twelve that are RANKED appear here. The other 24 catalogue objects
 * are reported as findings rather than as origins - not because they mean less
 * but because each is attested by a single source and none has enough stars to
 * rank fairly against a nine-star cluster. See spec 2.8. Their writing lives in
 * star-meanings.ts and is read by every report.
 *
 * These reuse the marker voices from body-voices.ts unchanged. That was the
 * whole bet of the compositional approach and it holds: a lineage report is
 * this file plus files that already existed.
 *
 * The roster comes from the starseed material - starseedseeker, Starseed Atlas,
 * nurtureyourspirit - which is where these lineages are described and where
 * buyers will have met them. Four sources agree on which lineages exist and
 * what star each comes from. Not one gives a chart marker, so the roster is
 * inherited and the detection is ours. The meanings below stay recognisable to
 * someone who arrives having read that material, and are written against what
 * the object actually is wherever the two can be made to agree.
 */

export interface LineageMeaning {
  /** Matches the grouped lineage id used by the scorer. */
  id: string;
  displayName: string;
  /**
   * Names the same lineage goes by elsewhere. Printed, so a buyer who arrived
   * calling themselves a Vegan finds themselves in the report rather than
   * wondering whether this is the same thing.
   */
  subStrands: readonly string[];
  /** Short noun phrase, printed after the name. */
  image: string;
  /** What the lineage is. One or two sentences. */
  theme: string;
  /** What people who come out here tend to be carrying. */
  carries: string;
  /** What it asks. Follows "This asks you to". */
  asks: string;
  /** The counterweight. Printed on `single` results only - see compose.ts. */
  shadow: string;
}

export const LINEAGE_MEANINGS: Readonly<Record<string, LineageMeaning>> = {
  pleiades: {
    id: "pleiades",
    displayName: "The Pleiades",
    subStrands: ["Pleiadian", "Alcyonean", "Tolekan"],
    image: "the cluster that is never one star",
    theme:
      "The Pleiades are the most looked-at object in the night sky and the hardest to count - most people see six, some see seven, a few see more, and the number you get depends on how good the dark is. It is a group that has never resolved into individuals, and it is by a wide margin the best-attested of all the lineages.",
    carries:
      "An attunement to what other people are feeling that arrives before any of it has been said out loud, and which is very difficult to switch off.",
    asks: "treat that sensitivity as equipment rather than as a weather system you are subject to",
    shadow:
      "Feeling the room accurately is not the same as being responsible for it, and the two get confused early enough that the confusion stops looking like one.",
  },
  lyra: {
    id: "lyra",
    displayName: "Lyra",
    subStrands: ["Lyran", "Vegan", "Avian", "Feline"],
    image: "the instrument everything else was tuned against",
    theme:
      "Lyra is the harp, and Vega at its corner was the pole star twelve thousand years ago and will be again in another twelve. In the starseed material Lyra is consistently described as the oldest of the lineages, the one the others are said to have come out of.",
    carries:
      "A sense of how things ought to go that seems to predate being taught it, and an unusually low tolerance for arrangements that are merely how everyone does it.",
    asks: "say the first-principles version out loud, even when the room has already agreed on something else",
    shadow:
      "Being right about the principle and useless about the situation is a specific way to lose an argument you had already won.",
  },
  orion: {
    id: "orion",
    displayName: "Orion",
    subStrands: [],
    image: "the figure anybody can find",
    theme:
      "Orion is the one constellation almost everyone can pick out, and it is not a family - Betelgeuse and Rigel are unrelated stars at different distances that happen to line up from here. In the lore it is the site of a long conflict, and what it is really about is opposition: two things pulling that both have a case.",
    carries:
      "A tolerance for being in the middle of a fight, and a habit of seeing what the other side actually wants rather than the version of it that would be easier to beat.",
    asks: "notice how much of your strength was built in situations you would not have chosen",
    shadow:
      "Someone practised at conflict will find one. Not from appetite - from fluency, which is harder to spot and harder to put down.",
  },
  sirius: {
    id: "sirius",
    displayName: "Sirius",
    subStrands: [],
    image: "the brightest star, and the one that announced the flood",
    theme:
      "Sirius is the brightest star in the sky, and its first appearance before dawn once told Egypt the Nile was about to rise - a whole civilisation's calendar hung on one star clearing the horizon. It carries guardianship and record-keeping, and also heat: it was called the scorcher for the season it brought.",
    carries:
      "A pull toward being the one who keeps the record and gives the warning, and a discomfort at watching something go unremarked that everyone else has agreed not to mention.",
    asks: "look at what you have appointed yourself the keeper of, and whether anyone asked",
    shadow:
      "The one who tells people what is coming is not thanked for it at the time, and can start needing to be.",
  },
  arcturus: {
    id: "arcturus",
    displayName: "Arcturus",
    subStrands: ["Arcturian"],
    image: "the guardian of the bear",
    theme:
      "Arcturus is the bear-watcher, the star the herdsman follows, and it is unusual in the tradition for giving prosperity through effort rather than through luck. In the starseed material the Arcturians are the builders and the physicians - the ones described as fixing what is broken rather than presiding over it.",
    carries:
      "An instinct to get in and repair a thing, whether or not repairing it is your job, and a low patience for admiring a problem.",
    asks: "check whether the thing in front of you wants mending or wants leaving alone",
    shadow:
      "A repairer needs something broken. That is fine until the reaching for it starts arriving before the asking.",
  },
  andromeda: {
    id: "andromeda",
    displayName: "Andromeda",
    subStrands: ["Andromedan"],
    image: "the neighbouring galaxy",
    theme:
      "Andromeda is not a star. It is the nearest large galaxy, a trillion suns, the furthest thing the naked eye can see - and also the princess chained to a rock as payment for a boast that was not hers. Both halves of that say the same thing about scale and about constraint.",
    carries:
      "A strong, early, physical objection to being held somewhere, and a corresponding difficulty in staying anywhere long enough to find out what it was.",
    asks: "tell the difference between a cage and a commitment, which from the inside look identical",
    shadow:
      "Leaving works. It works so reliably that it stops being a decision and becomes the only move you have practised.",
  },
  centaurus: {
    id: "centaurus",
    displayName: "Centaurus",
    subStrands: [],
    image: "the nearest doorway",
    theme:
      "Alpha Centauri is the closest star system there is, and it turns out not to be a star but a household - two suns with a third in orbit around them. Hadar, the other bright one, exists to point: the two of them form the line that finds the Southern Cross.",
    carries:
      "A practicality about the near-at-hand, and an unglamorous willingness to work with what is actually in reach rather than with the better version that is not.",
    asks: "give the nearest option a fair hearing before you go looking further out",
    shadow:
      "The nearest thing is easy to keep choosing, and easy to mistake for the only thing.",
  },
  eridanus: {
    id: "eridanus",
    displayName: "Eridanus",
    subStrands: [],
    image: "the river that runs down the sky",
    theme:
      "Eridanus is a long winding constellation, the celestial river, and Epsilon Eridani inside it is a nearby star much like our own but far younger - still wrapped in the debris disc that planets get built out of. A system unmistakably underway and unmistakably not finished.",
    carries:
      "A life that has taken longer to settle into its shape than other people's seem to, and a suspicion that this is a fault.",
    asks: "stop treating unfinished as a stage you are behind on",
    shadow:
      "Still forming is an honest description of a young system and a very comfortable place to keep standing.",
  },
  polaris: {
    id: "polaris",
    displayName: "Polaris",
    subStrands: [],
    image: "the one that does not move",
    theme:
      "Polaris sits almost exactly over the north pole, so the whole sky turns around it and it stays where it is. That is why it is the thing people navigate by rather than a thing people wish on - its entire usefulness is that it will be in the same place tomorrow.",
    carries:
      "A steadiness other people organise themselves around, usually without saying so and often without noticing they have.",
    asks: "look at who is taking a bearing from you, and at what that costs to supply",
    shadow:
      "Nobody asks the fixed point how it is doing. It has to say, and saying it feels like breaking the arrangement.",
  },
  draco: {
    id: "draco",
    displayName: "Draco",
    subStrands: ["Draconian"],
    image: "the pole that used to be",
    theme:
      "Thuban in Draco was the north star when the pyramids were built, and it is not any more - the axis moved. The star did not change, dim or fail. It simply stopped being the centre, and nothing was done wrong.",
    carries:
      "A memory of an older arrangement, and standing that came from a structure which no longer exists in the form that granted it.",
    asks: "work out what is still true about you now that the thing you were central to has moved on",
    shadow:
      "The hardest version of this is not being displaced by someone better. It is nobody having done anything wrong.",
  },
  reticulum: {
    id: "reticulum",
    displayName: "Reticulum",
    subStrands: [],
    image: "the grid in the eyepiece",
    theme:
      "Reticulum is named for the reticle, the fine crosshair grid used to fix a position exactly, and Zeta1 and Zeta2 inside it are a matched pair of sun-like stars that have travelled together for billions of years and are still hard to tell apart.",
    carries:
      "A need to get the measurement right before committing to anything, and a genuine ability to see the difference between two things everyone else calls the same.",
    asks: "notice when the measuring has stopped being preparation and become the activity",
    shadow:
      "A thing can be measured indefinitely. Precision is the most defensible reason there is for not yet having decided.",
  },
  galactic_centre: {
    id: "galactic_centre",
    displayName: "The Galactic Centre",
    subStrands: [],
    image: "the middle of the thing we are all in",
    theme:
      "The Galactic Centre is the axis our entire galaxy turns about, with a black hole of four million suns at the middle of it. Every star anyone has ever looked at is going around it, including this one, and none of them chose to.",
    carries:
      "A sense of being part of something much larger that arrived early and has never fully gone, along with the difficulty of saying that out loud without sounding grandiose.",
    asks: "hold the scale of it without letting it excuse you from anything small",
    shadow:
      "Perspective and evasion produce the same sentence. Only the person saying it knows which one it was.",
  },
};

/** Every ranked lineage must have a meaning before a lineage report can ship. */
export function missingLineageMeanings(lineageIds: readonly string[]): string[] {
  return lineageIds.filter((id) => !(id in LINEAGE_MEANINGS));
}

/**
 * How strong the result is, in plain words - BUT only when strength is what
 * decided it.
 *
 * This distinction was found by reading a generated report. It printed "one
 * lineage stands clear of the others" and then, four lines later, "yours sits
 * inside the usual range". Both sentences were true and together they were
 * nonsense.
 *
 * The cause is in `classifyByNotable`: a result is produced by an ABSOLUTE
 * standard - one tight contact, on a point a chart is read from, to a star that
 * genuinely stands for its lineage - and the baseline is consulted only to pick
 * a winner when more than one lineage clears that bar. So for the common case,
 * one notable lineage, the percentile decided nothing and printing it dresses
 * up the reasoning as something it was not.
 *
 * `standingPhrase` therefore belongs only to results that were actually ranked.
 * Where one contact decided it, the report says that instead - see
 * DECIDED_BY_CONTACT, which is also just the truthful description of how fixed
 * stars have always been read.
 *
 * The engine works in a percentile against the lineage's own baseline, which is
 * the only honest way to compare lineages of different sizes - but nobody buys
 * a report to read a percentile. These say the same thing in English, and they
 * say what it is measured against, because "strong Pleiades" on its own means
 * nothing without "for a Pleiades score".
 */
export interface StandingVoice {
  min: number;
  phrase: string;
}

export const STANDING_VOICES: readonly StandingVoice[] = [
  { min: 97, phrase: "Set against other charts that touch it at all, yours is in the top few." },
  { min: 90, phrase: "Set against other charts that touch it at all, yours is in the top tenth." },
  { min: 85, phrase: "Set against other charts that touch it at all, yours sits well up the range." },
  { min: 0, phrase: "Set against other charts that touch it at all, yours sits inside the usual range." },
];

export function standingPhrase(standing: number): string {
  return (
    STANDING_VOICES.find((v) => standing >= v.min)?.phrase ??
    STANDING_VOICES[STANDING_VOICES.length - 1].phrase
  );
}

/**
 * What to say when a single contact decided it, which is the common case.
 *
 * Not a fallback for a missing number. It is the more accurate sentence, and
 * it happens to be the one that describes how this has always been done: one
 * conjunction of the Sun to Regulus is a complete statement and nobody asks
 * for a second one.
 */
export const DECIDED_BY_CONTACT =
  "One contact that close, on a point a chart is actually read from, is a complete statement on its own. That is how fixed stars have always been read - a single tight meeting settles it, and nobody goes looking for a second one to confirm it.";

/**
 * How the section opens, depending on what came out.
 *
 * `paired` is not a hedge and must not read as one. Two lineages coming out
 * level is a real result about a real chart, and the report says so plainly
 * rather than apologising for not having picked. This is the same rule that
 * governs the no-lineage report: it is a finding, not a null.
 */
/**
 * How the section opens when no lineage stands clear.
 *
 * It is a finding, not a null, and it must not read as an apology. Nothing
 * comparative, nothing about what a different method would have said, and no
 * hint that the buyer has been given the lesser version of something.
 */
export const SPREAD_OPENING =
  "No single lineage stands clear in your chart. Your markers are spread across the sky rather than gathered on one point, and that is its own answer - what follows is what they are gathered on.";

export const RESULT_VOICES = {
  single: {
    opening: "One lineage stands clear of the others in your chart.",
    /** The shadow line prints here. */
    showShadow: true,
  },
  paired: {
    // Carries the explanation of the standard as well, because a paired result
    // has two blocks under it and printing the same paragraph over each of
    // them reads as padding. The blocks below say only what produced each one.
    opening:
      "Two lineages came out level in your chart, and they are reported that way because that is what is there. Forcing a winner between them would be inventing a result rather than reading one. Each of them rests on a single close contact to a point your chart is actually read from, which is how fixed stars have always been read - one tight meeting settles it, and nobody goes looking for a second to confirm it.",
    /**
     * No shadow on a paired result. Two counterweights on two lineages that
     * are already being held loosely turns a real finding into a hedge with a
     * warning attached, which is the opposite of what it is.
     */
    showShadow: false,
  },
} as const;
