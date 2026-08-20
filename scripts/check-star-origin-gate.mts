/**
 * check-star-origin-gate.mts
 *
 * The go/no-go test for Star Origin, Layer 1.
 *
 * Scores thousands of made-up birth charts and asks four questions:
 *
 *   1. Does everyone get the same answer?          (no lineage may top >30%)
 *   2. Is the answer about the person or the year? (24h apart should differ;
 *                                                   4 min apart should agree)
 *   3. Can someone get no clear answer?            (15-25% should)
 *   4. Is it reading the sky, or itself?           (shuffle the stars - the
 *                                                   concentration should break)
 *
 * If 1, 2 or 4 fail, Layer 1 does not ship.
 *
 * Run: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/check-star-origin-gate.mts [sampleSize] [orb]
 */

import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { LINEAGES, STARS, starPositionsForYear, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { scoreChart, DEFAULT_ORB, MARKER_POINTS } from "../lib/artifacts/star-origin/scoring.ts";
import {
  buildBaseline,
  classify,
  classifyByNotable,
  isNotable,
  DECIDING_MARKERS,
  NOTABLE_ORB,
  DEFAULT_THRESHOLDS,
  type Baseline,
} from "../lib/artifacts/star-origin/baseline.ts";

const SAMPLE_SIZE = Number(process.argv[2] ?? 10000);
const ORB = Number(process.argv[3] ?? DEFAULT_ORB);

const YEAR_MIN = 1950;
const YEAR_MAX = 2010;

// ─── Reproducible randomness ────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260819);

// ─── Places ─────────────────────────────────────────────────────────────────

const CITIES: ReadonlyArray<[string, number, number, string]> = [
  ["New York", 40.71, -74.01, "America/New_York"],
  ["Los Angeles", 34.05, -118.24, "America/Los_Angeles"],
  ["Chicago", 41.88, -87.63, "America/Chicago"],
  ["Houston", 29.76, -95.37, "America/Chicago"],
  ["Phoenix", 33.45, -112.07, "America/Phoenix"],
  ["Denver", 39.74, -104.99, "America/Denver"],
  ["Seattle", 47.61, -122.33, "America/Los_Angeles"],
  ["Miami", 25.76, -80.19, "America/New_York"],
  ["Atlanta", 33.75, -84.39, "America/New_York"],
  ["Toronto", 43.65, -79.38, "America/Toronto"],
  ["Vancouver", 49.28, -123.12, "America/Vancouver"],
  ["Mexico City", 19.43, -99.13, "America/Mexico_City"],
  ["Bogota", 4.71, -74.07, "America/Bogota"],
  ["Lima", -12.05, -77.04, "America/Lima"],
  ["Santiago", -33.45, -70.67, "America/Santiago"],
  ["Buenos Aires", -34.6, -58.38, "America/Argentina/Buenos_Aires"],
  ["Sao Paulo", -23.55, -46.63, "America/Sao_Paulo"],
  ["Rio de Janeiro", -22.91, -43.17, "America/Sao_Paulo"],
  ["London", 51.51, -0.13, "Europe/London"],
  ["Dublin", 53.35, -6.26, "Europe/Dublin"],
  ["Paris", 48.86, 2.35, "Europe/Paris"],
  ["Madrid", 40.42, -3.7, "Europe/Madrid"],
  ["Barcelona", 41.39, 2.17, "Europe/Madrid"],
  ["Lisbon", 38.72, -9.14, "Europe/Lisbon"],
  ["Rome", 41.9, 12.5, "Europe/Rome"],
  ["Berlin", 52.52, 13.4, "Europe/Berlin"],
  ["Amsterdam", 52.37, 4.9, "Europe/Amsterdam"],
  ["Stockholm", 59.33, 18.07, "Europe/Stockholm"],
  ["Oslo", 59.91, 10.75, "Europe/Oslo"],
  ["Warsaw", 52.23, 21.01, "Europe/Warsaw"],
  ["Moscow", 55.76, 37.62, "Europe/Moscow"],
  ["Istanbul", 41.01, 28.98, "Europe/Istanbul"],
  ["Athens", 37.98, 23.73, "Europe/Athens"],
  ["Cairo", 30.04, 31.24, "Africa/Cairo"],
  ["Lagos", 6.52, 3.38, "Africa/Lagos"],
  ["Nairobi", -1.29, 36.82, "Africa/Nairobi"],
  ["Johannesburg", -26.2, 28.05, "Africa/Johannesburg"],
  ["Dubai", 25.2, 55.27, "Asia/Dubai"],
  ["Karachi", 24.86, 67.0, "Asia/Karachi"],
  ["Mumbai", 19.08, 72.88, "Asia/Kolkata"],
  ["Delhi", 28.61, 77.21, "Asia/Kolkata"],
  ["Bangkok", 13.76, 100.5, "Asia/Bangkok"],
  ["Singapore", 1.35, 103.82, "Asia/Singapore"],
  ["Jakarta", -6.21, 106.85, "Asia/Jakarta"],
  ["Manila", 14.6, 120.98, "Asia/Manila"],
  ["Hong Kong", 22.32, 114.17, "Asia/Hong_Kong"],
  ["Shanghai", 31.23, 121.47, "Asia/Shanghai"],
  ["Beijing", 39.9, 116.41, "Asia/Shanghai"],
  ["Seoul", 37.57, 126.98, "Asia/Seoul"],
  ["Tokyo", 35.68, 139.65, "Asia/Tokyo"],
  ["Sydney", -33.87, 151.21, "Australia/Sydney"],
  ["Melbourne", -37.81, 144.96, "Australia/Melbourne"],
  ["Auckland", -36.85, 174.76, "Pacific/Auckland"],
];

// ─── Chart generation ───────────────────────────────────────────────────────

const START_MS = Date.UTC(YEAR_MIN, 0, 1);
const END_MS = Date.UTC(YEAR_MAX, 11, 31);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface Sample {
  birth: BirthData;
  year: number;
}

function randomSample(): Sample {
  const ms = START_MS + rand() * (END_MS - START_MS);
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const hour = Math.floor(rand() * 24);
  const minute = Math.floor(rand() * 60);
  const [, lat, lng, timezone] = CITIES[Math.floor(rand() * CITIES.length)];

  return {
    birth: { date, time: `${pad(hour)}:${pad(minute)}`, timezone, lat, lng, timeUnknown: false },
    year: d.getUTCFullYear(),
  };
}

/** Same place and time of day, shifted by a number of days and minutes. */
function shifted(sample: Sample, days: number, minutes: number): Sample {
  const [y, m, d] = sample.birth.date.split("-").map(Number);
  const [hh, mm] = (sample.birth.time as string).split(":").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, hh, mm));
  base.setUTCDate(base.getUTCDate() + days);
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return {
    birth: {
      ...sample.birth,
      date: `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`,
      time: `${pad(base.getUTCHours())}:${pad(base.getUTCMinutes())}`,
    },
    year: base.getUTCFullYear(),
  };
}

// ─── Star positions, cached per year ────────────────────────────────────────

type Positions = ReadonlyArray<{ star: CatalogStar; longitude: number }>;

function makePositionCache(shuffle: boolean) {
  const cache = new Map<number, Positions>();
  // A fixed permutation of longitudes, so the shuffled run is reproducible and
  // the stars keep their spread but lose their real places.
  const perm = STARS.map((_, i) => i);
  if (shuffle) {
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(mulberry32(99 + i)() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
  }
  return (year: number): Positions => {
    let p = cache.get(year);
    if (!p) {
      const real = starPositionsForYear(year);
      p = shuffle
        ? real.map((entry, i) => ({ star: entry.star, longitude: real[perm[i]].longitude }))
        : real;
      cache.set(year, p);
    }
    return p;
  };
}

// ─── Run ────────────────────────────────────────────────────────────────────

/**
 * Optional grouping test (pass "grouped" as the 4th argument).
 *
 * The full roster splits Orion into six separate lineages and gives every
 * thinly-attested named star its own. This collapses them the way the starseed
 * literature actually groups them, to see whether concentrating the same
 * contacts into fewer lineages produces enough signal to rank.
 */
const GROUPED = process.argv[4] === "grouped";

const GROUP_INTO: Record<string, string> = {
  orion_betelgeuse: "orion", orion_rigel: "orion", orion_bellatrix: "orion",
  orion_mintaka: "orion", orion_alnilam: "orion", orion_alnitak: "orion",
  hadar: "centaurus",
};

/** Single-source named stars: notable findings, but not ranked as lineages. */
const NOT_RANKED = new Set([
  "aldebaran", "antares", "altair", "capella", "deneb", "procyon", "tau_ceti",
  "regulus", "canopus", "fomalhaut", "spica", "pollux", "alnair", "hyades",
  "cassiopeia", "ophiuchus", "super_galactic_centre",
]);

function regroup(m: Map<string, number>): Map<string, number> {
  if (!GROUPED) return m;
  const out = new Map<string, number>();
  for (const [lineage, score] of m) {
    if (NOT_RANKED.has(lineage)) continue;
    const key = GROUP_INTO[lineage] ?? lineage;
    out.set(key, (out.get(key) ?? 0) + score);
  }
  return out;
}

const RANKED_LINEAGES = GROUPED
  ? Array.from(new Set(LINEAGES.filter((l) => !NOT_RANKED.has(l)).map((l) => GROUP_INTO[l] ?? l))).sort()
  : LINEAGES;

/**
 * MARKERS_OFF=midheaven,north_node lets a run drop markers, so the cost or
 * benefit of adding one can be measured on its own rather than in a bundle.
 */
for (const name of (process.env.MARKERS_OFF ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
  delete MARKER_POINTS[name];
}

/** MARKER_SET=north_node=4,south_node=4 reweights markers for a single run. */
for (const pair of (process.env.MARKER_SET ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
  const [name, value] = pair.split("=");
  MARKER_POINTS[name] = Number(value);
}

const NOTABLE = Number(process.env.NOTABLE_ORB ?? NOTABLE_ORB);

/** DECIDING=+midheaven / DECIDING=-north_node adjusts who may name a lineage. */
const DECIDING = new Set(DECIDING_MARKERS);
for (const t of (process.env.DECIDING ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
  if (t.startsWith("-")) DECIDING.delete(t.slice(1));
  else DECIDING.add(t.replace(/^\+/, ""));
}
/** MODE=percentile falls back to the old rank-against-everyone classifier. */
const USE_NOTABLE = process.env.MODE !== "percentile";

interface Scored {
  byLineage: Map<string, number>;
  /** Lineages this chart has a genuinely notable contact with. */
  notable: Set<string>;
}

function rankedKey(lineage: string): string | null {
  if (!GROUPED) return lineage;
  if (NOT_RANKED.has(lineage)) return null;
  return GROUP_INTO[lineage] ?? lineage;
}

function scoreAll(samples: Sample[], positionsFor: (y: number) => Positions): Scored[] {
  return samples.map((s) => {
    const chart = computeNatalChart(s.birth, "whole_sign");
    const result = scoreChart(chart, s.year, { orb: ORB, starPositions: positionsFor(s.year) });
    const notable = new Set<string>();
    for (const c of result.contacts) {
      if (!c.star.lineage) continue;
      if (!isNotable(c, NOTABLE, DECIDING)) continue;
      const key = rankedKey(c.star.lineage);
      if (key) notable.add(key);
    }
    return { byLineage: regroup(result.byLineage), notable };
  });
}

const THRESHOLDS = {
  singleMin: Number(process.env.SINGLE_MIN ?? DEFAULT_THRESHOLDS.singleMin),
  singleGap: Number(process.env.SINGLE_GAP ?? DEFAULT_THRESHOLDS.singleGap),
  pairMin: Number(process.env.PAIR_MIN ?? DEFAULT_THRESHOLDS.pairMin),
};

/**
 * How far clear of second place the top lineage must stand before it is named
 * on its own. Inside this margin the two are held together instead.
 */
const PAIR_GAP = Number(process.env.PAIR_GAP ?? 10);

function verdictOf(baseline: Baseline, s: Scored) {
  return USE_NOTABLE
    ? classifyByNotable(baseline, s.byLineage, s.notable, PAIR_GAP)
    : classify(baseline, s.byLineage, RANKED_LINEAGES, THRESHOLDS);
}

function topLineageDistribution(
  baseline: Baseline,
  scored: ReadonlyArray<Scored>,
) {
  const counts = new Map<string, number>();
  let spread = 0;
  let paired = 0;
  let single = 0;
  for (const s of scored) {
    const v = verdictOf(baseline, s);
    if (v.kind === "spread") { spread++; continue; }
    if (v.kind === "paired") paired++;
    else single++;
    counts.set(v.primary, (counts.get(v.primary) ?? 0) + 1);
  }
  return { counts, spread, paired, single, total: scored.length };
}

console.log(`\nStar Origin - Layer 1 gate`);
console.log(`sample ${SAMPLE_SIZE}   orb ${ORB}deg   notable ${NOTABLE}deg   lineages ${RANKED_LINEAGES.length}   stars ${STARS.length}`);
console.log(`markers: ${Object.keys(MARKER_POINTS).join(", ")}`);
console.log(`may name a lineage: ${[...DECIDING].join(", ")}
`);

const t0 = Date.now();
const samples: Sample[] = Array.from({ length: SAMPLE_SIZE }, randomSample);
const realPositions = makePositionCache(false);
const scored = scoreAll(samples, realPositions);
const baseline = buildBaseline(scored.map((x) => x.byLineage), RANKED_LINEAGES, "sim");
console.log(`scored ${SAMPLE_SIZE} charts in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

// ── Diagnostics: what are we actually working with? ──
{
  const contactCounts = new Map<number, number>();
  let totalContacts = 0;
  for (const s of samples) {
    const chart = computeNatalChart(s.birth, "whole_sign");
    const n = scoreChart(chart, s.year, { orb: ORB, starPositions: realPositions(s.year) }).contacts.length;
    contactCounts.set(n, (contactCounts.get(n) ?? 0) + 1);
    totalContacts += n;
  }
  console.log("DIAGNOSTIC - star contacts per chart");
  for (const n of [...contactCounts.keys()].sort((a, b) => a - b)) {
    const c = contactCounts.get(n) as number;
    console.log(`  ${n} contact(s): ${((c / SAMPLE_SIZE) * 100).toFixed(1)}%`);
  }
  console.log(`  average: ${(totalContacts / SAMPLE_SIZE).toFixed(2)} contacts per chart`);

  const lineagesTouched = scored.map((m) => [...m.byLineage.values()].filter((v) => v > 0).length);
  const avgTouched = lineagesTouched.reduce((a, b) => a + b, 0) / lineagesTouched.length;
  console.log(`  average lineages touched: ${avgTouched.toFixed(2)} (of ${LINEAGES.length})\n`);
}

let failures = 0;

// ── Check 1 ──
const dist = topLineageDistribution(baseline, scored);
const ranked = [...dist.counts.entries()].sort((a, b) => b[1] - a[1]);
const topShare = ranked.length ? (ranked[0][1] / dist.total) * 100 : 0;

console.log("CHECK 1 - does everyone get the same answer?");
console.log("  most common results:");
for (const [lineage, n] of ranked.slice(0, 8)) {
  console.log(`    ${lineage.padEnd(24)}${((n / dist.total) * 100).toFixed(1)}%`);
}
const check1 = topShare <= 30;
if (!check1) failures++;
console.log(`  top lineage ${topShare.toFixed(1)}%  (must be <=30%)  ${check1 ? "PASS" : "FAIL"}\n`);

// ── Check 2 ──
const PAIRS = Math.min(1000, SAMPLE_SIZE);
const pairBase = samples.slice(0, PAIRS);

/**
 * How often two charts give the same verdict, and when they differ, whether
 * the difference is "an answer appeared or vanished" or the worse
 * "a different lineage came out".
 */
function agreementRate(days: number, minutes: number) {
  const others = pairBase.map((s) => shifted(s, days, minutes));
  const scoredOthers = scoreAll(others, realPositions);
  let agree = 0;
  let flipped = 0; // one side had an answer, the other did not
  let swapped = 0; // both had an answer, but a different lineage
  for (let i = 0; i < PAIRS; i++) {
    const a = verdictOf(baseline, scored[i]);
    const b = verdictOf(baseline, scoredOthers[i]);
    const same =
      a.kind === b.kind &&
      (a.kind !== "single" || a.primary === (b as typeof a).primary) &&
      (a.kind !== "paired" || a.primary === (b as typeof a).primary);
    if (same) { agree++; continue; }
    if ((a.kind === "spread") !== (b.kind === "spread")) flipped++;
    else swapped++;
  }
  return {
    agree: (agree / PAIRS) * 100,
    flipped: (flipped / PAIRS) * 100,
    swapped: (swapped / PAIRS) * 100,
  };
}

/**
 * SWEEP=1 prints how fast the answer comes apart as the birth time moves,
 * instead of testing a single offset. Lets the tolerance be chosen from the
 * curve rather than asserted.
 */
if (process.env.SWEEP) {
  console.log("HOW MUCH BIRTH-TIME ERROR THE ANSWER SURVIVES");
  console.log("  minutes off   same answer   different lineage");
  for (const mins of [1, 2, 4, 8, 15, 30, 60]) {
    const r = agreementRate(0, mins);
    console.log(
      `  ${String(mins).padStart(9)}   ${r.agree.toFixed(1).padStart(10)}%   ${r.swapped.toFixed(1).padStart(16)}%`,
    );
  }
  console.log("");
  process.exit(0);
}

const monthApart = agreementRate(30, 0);
const dayApart = agreementRate(1, 0);
const minutesApart = agreementRate(0, 4);

console.log("CHECK 2 - about the person, or the year?");
console.log(`  charts 30 days apart agree:   ${monthApart.agree.toFixed(1)}%  (want low - a slow marker like the lunar node barely moves in a month, so if this is high the answer is really "everyone born this month")`);
console.log(`  charts 24 hours apart agree:  ${dayApart.agree.toFixed(1)}%  (want clearly under 100 - the day matters)`);
console.log(`  charts 4 minutes apart agree: ${minutesApart.agree.toFixed(1)}%  (want high - not jumpy)`);
console.log(`    of the 4-minute disagreements:`);
console.log(`      answer appeared or vanished: ${minutesApart.flipped.toFixed(1)}% of all charts`);
console.log(`      a different lineage came out: ${minutesApart.swapped.toFixed(1)}% of all charts`);
const check2 = monthApart.agree < 70 && dayApart.agree < 90 && minutesApart.agree > 90;
if (!check2) failures++;
console.log(`  ${check2 ? "PASS" : "FAIL"}\n`);

// ── Check 3 ──
const spreadPct = (dist.spread / dist.total) * 100;
console.log("CHECK 3 - can someone get no clear answer?");
console.log(`  one clear lineage: ${((dist.single / dist.total) * 100).toFixed(1)}%`);
console.log(`  two held together: ${((dist.paired / dist.total) * 100).toFixed(1)}%`);
console.log(`  no clear answer:   ${spreadPct.toFixed(1)}%  (target 15-25%)`);
const check3 = spreadPct >= 15 && spreadPct <= 25;
console.log(`  ${check3 ? "PASS" : "TUNE"}  (thresholds are adjustable - not a blocker)\n`);

// ── Check 4 ──
const shuffledPositions = makePositionCache(true);
const scoredShuffled = scoreAll(samples, shuffledPositions);
const baselineShuffled = buildBaseline(scoredShuffled.map((x) => x.byLineage), RANKED_LINEAGES, "sim-shuffled");
const distShuffled = topLineageDistribution(baselineShuffled, scoredShuffled);
const rankedShuffled = [...distShuffled.counts.entries()].sort((a, b) => b[1] - a[1]);

let sameAnswer = 0;
for (let i = 0; i < scored.length; i++) {
  const a = verdictOf(baseline, scored[i]);
  const b = verdictOf(baselineShuffled, scoredShuffled[i]);
  if (a.kind === "single" && b.kind === "single" && a.primary === b.primary) sameAnswer++;
}
const agreeWithNonsense = (sameAnswer / scored.length) * 100;

console.log("CHECK 4 - reading the sky, or itself?");
console.log(`  with star positions shuffled, top lineage: ${rankedShuffled.length ? ((rankedShuffled[0][1] / distShuffled.total) * 100).toFixed(1) : "0"}% (${rankedShuffled[0]?.[0] ?? "-"})`);
console.log(`  real and shuffled give the same answer: ${agreeWithNonsense.toFixed(1)}%  (want low)`);
const check4 = agreeWithNonsense < 20;
if (!check4) failures++;
console.log(`  ${check4 ? "PASS" : "FAIL"}\n`);

console.log("=".repeat(58));
console.log(
  failures === 0
    ? "GATE PASSED - Layer 1 can ship."
    : `GATE FAILED - ${failures} blocking check(s). Layer 1 does not ship as-is.`,
);
console.log("=".repeat(58) + "\n");
