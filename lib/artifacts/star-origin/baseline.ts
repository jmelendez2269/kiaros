/**
 * baseline.ts
 *
 * The baseline is what stops the biggest target from always winning.
 *
 * Some lineages are simply easier to hit than others - the Pleiades is a
 * cluster of nine stars, Epsilon Eridani is one star. Count raw points and the
 * Pleiades wins for almost everybody, for reasons that have nothing to do with
 * the person's chart.
 *
 * So before anything ships we score thousands of made-up birth charts and
 * record what a normal score looks like for each lineage. A real person's
 * result is then compared against that lineage's own normal range. "Strong
 * Pleiades" comes to mean "high for a Pleiades score", which is the only
 * version of the sentence that is true.
 */

export interface Baseline {
  version: string;
  sampleSize: number;
  /**
   * Sorted NON-ZERO raw scores per lineage.
   *
   * Zeroes are excluded deliberately. Most charts have no contact at all with
   * any given lineage, so if zeroes were included then the faintest possible
   * graze would rank above the majority and read as a strong result. Ranking
   * only against charts that actually have that contact makes "strong" mean
   * strong, not merely "present".
   */
  sortedScores: Record<string, number[]>;
  /** Fraction of charts with any contact at all, per lineage. */
  hitRate: Record<string, number>;
}

export function buildBaseline(
  samples: ReadonlyArray<Map<string, number>>,
  lineages: readonly string[],
  version: string,
): Baseline {
  const sortedScores: Record<string, number[]> = {};
  const hitRate: Record<string, number> = {};
  for (const lineage of lineages) {
    const scores = samples
      .map((s) => s.get(lineage) ?? 0)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    sortedScores[lineage] = scores;
    hitRate[lineage] = samples.length ? scores.length / samples.length : 0;
  }
  return { version, sampleSize: samples.length, sortedScores, hitRate };
}

/**
 * Where a score sits among charts that have this lineage at all, 0-100.
 * A chart with no contact scores 0.
 */
export function standing(
  baseline: Baseline,
  lineage: string,
  rawScore: number,
): number {
  const sorted = baseline.sortedScores[lineage];
  if (!sorted || sorted.length === 0) return 0;
  if (rawScore <= 0) return 0;

  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < rawScore) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

export interface Thresholds {
  /** Minimum standing for a single clear result. */
  singleMin: number;
  /** How far clear of second place a single result must be. */
  singleGap: number;
  /** Minimum standing for each half of a paired result. */
  pairMin: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  singleMin: 90,
  singleGap: 15,
  pairMin: 85,
};

/**
 * Orb inside which a contact can count as notable, in degrees.
 *
 * 1 degree 30 minutes. This is the settled value from spec 2.4 and it is the
 * value every gate run that has ever passed was measured at.
 *
 * It used to be 1.0 here, while the harness overrode it to 1.5 through an
 * environment variable - so the number the engine shipped with was not the
 * number anything had been validated at. Nothing caught it because the gate
 * always set the override, and the generator, which does not, quietly ran at
 * an untested setting: 51.7% of charts came out with no line against the 39.6%
 * that was measured and signed off.
 *
 * A default that differs from the tested configuration is not a default, it is
 * a trap. If this value changes, the baseline is void and Checks 1-4 have to be
 * re-run - see spec 2.5.
 */
export const NOTABLE_ORB = 1.5;

/**
 * Two different questions, kept apart.
 *
 * How many points a marker scores is about SPEED - how many other people share
 * that degree. That is what MARKER_POINTS answers, and the lunar nodes score
 * low there because they crawl.
 *
 * Whether a marker may NAME someone's lineage on its own is a different
 * question: is this a point a chart is genuinely read from? The nodal axis is
 * slow, but it is the single most-used marker of direction in modern astrology
 * and it sits at the centre of the starseed material specifically.
 *
 * These were one number until the two answers disagreed. Letting the nodes
 * decide raised the share of charts that get an answer from 50% to 40% with no
 * cost anywhere: charts four minutes apart still agreed 90.6% of the time, and
 * charts a month apart - where a slow marker would show up if it were really
 * saying "everyone born this month" - agreed slightly LESS than before.
 *
 * The Midheaven is deliberately absent. It scores, so it appears in a reading
 * as a finding, but it may not decide. Letting it decide bought 3 more points
 * of answer rate for 8 points of stability: 10.5% of charts came out with a
 * DIFFERENT lineage when the birth time moved by four minutes, against 5.3%
 * without it. Birth times are routinely wrong by more than four minutes, so
 * that is a promise the product cannot keep.
 */
export const DECIDING_MARKERS: ReadonlySet<string> = new Set([
  "ascendant",
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "north_node",
  "south_node",
]);

/**
 * How much the star has to stand for its lineage before a contact with it can
 * name that lineage. A lineage is anchored by the star it is named for (weight
 * 1.0); fainter companions sit below this line, so they show up as findings but
 * never decide. Without this, adding companion stars to a lineage would raise
 * its answer rate at full force - which is inventing answers rather than
 * finding them.
 */
export const MIN_DECIDING_WEIGHT = 0.5;

export interface ContactLike {
  marker: string;
  orb: number;
  points: number;
  star: { lineage: string | null; weight: number };
}

/**
 * A contact is "notable" on its own terms: a tight orb, on a point a chart is
 * actually read from, to a star that genuinely stands for its lineage.
 *
 * This is how fixed stars have always been read - one conjunction of the Sun to
 * Regulus is a complete statement, and nobody asks for a second one.
 *
 * Whether someone gets a result at all is decided by this absolute standard,
 * NOT by ranking them against other people. The baseline is only used to pick a
 * winner when someone has more than one notable contact, where it stops a big
 * cluster like the Pleiades from winning purely on size.
 */
export function isNotable(
  contact: ContactLike,
  orbLimit = NOTABLE_ORB,
  deciding: ReadonlySet<string> = DECIDING_MARKERS,
): boolean {
  return (
    contact.orb <= orbLimit &&
    deciding.has(contact.marker) &&
    contact.star.weight >= MIN_DECIDING_WEIGHT
  );
}



/**
 * Verdict from notable contacts.
 *
 * - none            -> no notable contact anywhere
 * - one lineage     -> that lineage, however many contacts it has
 * - several         -> the one standing highest against its own baseline wins;
 *                      if the top two are close, they are held together
 */
export function classifyByNotable(
  baseline: Baseline,
  byLineage: Map<string, number>,
  notableLineages: ReadonlySet<string>,
  pairGap = 10,
): Verdict {
  if (notableLineages.size === 0) return { kind: "spread" };

  const ranked = [...notableLineages]
    .map((lineage) => ({
      lineage,
      standing: standing(baseline, lineage, byLineage.get(lineage) ?? 0),
    }))
    .sort((a, b) => b.standing - a.standing);

  const top = ranked[0];
  const second = ranked[1];

  if (second && top.standing - second.standing < pairGap) {
    return {
      kind: "paired",
      primary: top.lineage,
      secondary: second.lineage,
      standings: [top.standing, second.standing],
    };
  }

  return { kind: "single", primary: top.lineage, standing: top.standing };
}

export type Verdict =
  | { kind: "single"; primary: string; standing: number }
  | { kind: "paired"; primary: string; secondary: string; standings: [number, number] }
  | { kind: "spread" };

export function classify(
  baseline: Baseline,
  byLineage: Map<string, number>,
  lineages: readonly string[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Verdict {
  const ranked = lineages
    .map((lineage) => ({
      lineage,
      standing: standing(baseline, lineage, byLineage.get(lineage) ?? 0),
    }))
    .sort((a, b) => b.standing - a.standing);

  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.standing <= 0) return { kind: "spread" };

  const gap = top.standing - (second?.standing ?? 0);

  if (top.standing >= thresholds.singleMin && gap >= thresholds.singleGap) {
    return { kind: "single", primary: top.lineage, standing: top.standing };
  }

  if (
    second &&
    top.standing >= thresholds.pairMin &&
    second.standing >= thresholds.pairMin &&
    gap < thresholds.singleGap
  ) {
    return {
      kind: "paired",
      primary: top.lineage,
      secondary: second.lineage,
      standings: [top.standing, second.standing],
    };
  }

  return { kind: "spread" };
}
