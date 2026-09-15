/**
 * facts.ts
 *
 * Everything true about a chart that the star engine does not already use.
 *
 * Star Origin reads exactly one thing: how close a fixed star sat to a point of
 * the chart. It ignores what sign that point is in, what house it falls in, and
 * every aspect between the planets - which is most of what an astrologer would
 * actually read, sitting there unused.
 *
 * This turns that into a flat list of facts with stable ids. The ids are the
 * important part: the synthesis section is only allowed to cite facts from this
 * list, and every claim it makes is checked back against it. That is what turns
 * "the model might make something up" from a hope into a test.
 *
 * Nothing here is interpretation. These are positions and angles.
 */

import type { NatalChart, PlanetPosition, ZodiacSign } from "@/types/blueprint";

export interface ChartFact {
  /** Stable and quotable: "placement.sun", "aspect.sun.saturn". */
  id: string;
  kind: "placement" | "angle" | "aspect" | "star";
  /** One plain sentence. This is what the model sees. */
  statement: string;
}

const ASPECTS = [
  { name: "conjunct", angle: 0, orb: 6 },
  { name: "opposite", angle: 180, orb: 6 },
  { name: "square", angle: 90, orb: 5 },
  { name: "trine", angle: 120, orb: 5 },
  { name: "sextile", angle: 60, orb: 4 },
] as const;

const BODIES = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;

type Body = (typeof BODIES)[number];

const label = (b: string) => b[0].toUpperCase() + b.slice(1);

function separation(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

function ordinal(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function placementFact(body: Body, p: PlanetPosition, timeKnown: boolean): ChartFact {
  const house = timeKnown ? ` in the ${ordinal(p.house)} house` : "";
  const retro = p.retrograde ? ", retrograde" : "";
  return {
    id: `placement.${body}`,
    kind: "placement",
    statement: `${label(body)} in ${p.sign}${house}${retro}.`,
  };
}

/**
 * The chart, as a list of checkable statements.
 *
 * Uranus, Neptune and Pluto ARE included here, unlike in the star scoring.
 * That is not an inconsistency. They are excluded from scoring because
 * everyone born across a stretch of years shares them, so they cannot say
 * where one person is from - but the sign and house they fall in, and the
 * aspects they make to the fast bodies, are specific to this chart and are
 * ordinary astrological material.
 */
export function chartFacts(chart: NatalChart): ChartFact[] {
  const timeKnown = !chart.birthTimeUnknown;
  const facts: ChartFact[] = [];

  for (const body of BODIES) {
    facts.push(placementFact(body, chart[body], timeKnown));
  }

  if (timeKnown) {
    facts.push({
      id: "angle.ascendant",
      kind: "angle",
      statement: `Ascendant in ${chart.rising} — the sign rising at birth.`,
    });
  }

  // Aspects between the ten bodies. Tight ones only; a 6-degree square is a
  // real feature of a chart and a 9-degree one is noise.
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      const a = BODIES[i], b = BODIES[j];
      const sep = separation(chart[a].longitude, chart[b].longitude);
      for (const aspect of ASPECTS) {
        const orb = Math.abs(sep - aspect.angle);
        if (orb > aspect.orb) continue;
        facts.push({
          id: `aspect.${a}.${b}`,
          kind: "aspect",
          statement: `${label(a)} ${aspect.name} ${label(b)}, ${orb.toFixed(1)}° from exact.`,
        });
        break;
      }
    }
  }

  return facts;
}

/** Every proper noun the synthesis is allowed to use. */
export function allowedNames(
  facts: readonly ChartFact[],
  starNames: readonly string[],
  lineageName: string,
): Set<string> {
  const names = new Set<string>();
  const addName = (name: string) => {
    names.add(name);
    for (const word of name.split(/[^A-Za-z]+/).filter(Boolean)) names.add(word);
  };
  addName(lineageName);
  for (const starName of starNames) addName(starName);
  for (const body of BODIES) names.add(label(body));
  names.add("Ascendant");
  names.add("Midheaven");
  names.add("North Node");
  names.add("South Node");
  for (const sign of SIGNS) names.add(sign);
  return names;
}

const SIGNS: readonly ZodiacSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
