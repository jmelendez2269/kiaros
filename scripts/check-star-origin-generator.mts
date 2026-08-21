/**
 * check-star-origin-generator.mts
 *
 * Does the generator produce a valid artifact for every chart, and does the
 * contract actually refuse the things it says it refuses?
 *
 * The second half matters more than the first. A contract that only ever gets
 * called with good input is decoration. Each refusal below corresponds to
 * something that would put an untrue statement in front of a buyer:
 * a lineage sold to someone with no birth time, a Mini carrying an origin it
 * promised not to make, a tier that needs Layer 2 while Layer 2 does not exist.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
 *     --import ./scripts/register-alias.mjs scripts/check-star-origin-generator.mts [N]
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { scoreChart } from "../lib/artifacts/star-origin/scoring.ts";
import { buildBaseline, isNotable, DECIDING_MARKERS } from "../lib/artifacts/star-origin/baseline.ts";
import { groupOf, isRanked } from "../lib/artifacts/star-origin/lineages.ts";
import { generateStarOrigin } from "../lib/artifacts/star-origin/generator.ts";
import { StarOriginContractError, LINEAGE_SECTIONS } from "../lib/artifacts/star-origin/contract.ts";

const N = Number(process.argv[2] ?? 400);
const SCORING_ORB = 2.5, NOTABLE = 1.5;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260821);
const CITIES: ReadonlyArray<[number, number, string]> = [
  [40.71, -74.01, "America/New_York"], [51.51, -0.13, "Europe/London"],
  [-33.87, 151.21, "Australia/Sydney"], [35.68, 139.65, "Asia/Tokyo"],
  [19.43, -99.13, "America/Mexico_City"], [-23.55, -46.63, "America/Sao_Paulo"],
];
const pad = (n: number) => String(n).padStart(2, "0");
const START = Date.UTC(1950, 0, 1), END = Date.UTC(2010, 11, 31);

const posCache = new Map<number, ReadonlyArray<{ star: CatalogStar; longitude: number }>>();
const posFor = (y: number) => { let p = posCache.get(y); if (!p) { p = starPositionsForYear(y); posCache.set(y, p); } return p; };

function makeBirth(timeUnknown = false) {
  const d = new Date(START + rand() * (END - START));
  const [lat, lng, timezone] = CITIES[Math.floor(rand() * CITIES.length)];
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const time = `${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}`;
  return {
    birth: { date, time, timezone, lat, lng, timeUnknown } as BirthData,
    year: d.getUTCFullYear(),
    normalized: {
      date, time: timeUnknown ? null : time, timeUnknown,
      city: "Test", country: "Test", timezone, latitude: lat, longitude: lng,
    },
  };
}

// --- baseline ---------------------------------------------------------------
process.stdout.write(`Building baseline from ${N} charts... `);
const samples = Array.from({ length: N }, () => {
  const s = makeBirth();
  const chart = computeNatalChart(s.birth, "whole_sign");
  const r = scoreChart(chart, s.year, { orb: SCORING_ORB, starPositions: posFor(s.year) });
  const byLineage = new Map<string, number>();
  for (const [l, v] of r.byLineage) {
    if (!isRanked(l)) continue;
    const k = groupOf(l);
    byLineage.set(k, (byLineage.get(k) ?? 0) + v);
  }
  return byLineage;
});
const RANKED = [...new Set(samples.flatMap((s) => [...s.keys()]))];
const baseline = buildBaseline(samples, RANKED, "generator-check");
console.log("done.\n");

const common = {
  baseline, baselineVersion: "generator-check",
  ephemerisProvider: "astronomia", ephemerisVersion: "4.2.0",
};

// --- 1. every chart generates ----------------------------------------------
let ok = 0;
const kinds = new Map<string, number>();
const failures: string[] = [];
for (let i = 0; i < N; i++) {
  const s = makeBirth();
  const chart = computeNatalChart(s.birth, "whole_sign");
  try {
    const art = generateStarOrigin({
      artifactId: `art_${i}`, displayName: null, tier: "standard",
      normalizedBirth: s.normalized, chart, year: s.year,
      chartFingerprint: `sha256:${"a".repeat(64)}`,
      starPositions: posFor(s.year), ...common,
    });
    ok++;
    kinds.set(art.result.kind, (kinds.get(art.result.kind) ?? 0) + 1);
  } catch (e) {
    failures.push(`chart ${i}: ${(e as Error).message}`);
  }
}
console.log(`STANDARD tier over ${N} charts`);
console.log(`  generated and passed the contract: ${ok}/${N}`);
for (const [k, v] of kinds) console.log(`    ${k.padEnd(16)}${((v / N) * 100).toFixed(1)}%`);
for (const f of failures.slice(0, 5)) console.log(`  FAILED ${f}`);

// --- 2. mini, with no birth time -------------------------------------------
let miniOk = 0, miniLeak = 0;
for (let i = 0; i < 60; i++) {
  const s = makeBirth(true);
  const chart = computeNatalChart(s.birth, "whole_sign");
  try {
    const art = generateStarOrigin({
      artifactId: `mini_${i}`, displayName: null, tier: "mini",
      normalizedBirth: s.normalized, chart, year: s.year,
      chartFingerprint: `sha256:${"b".repeat(64)}`,
      starPositions: posFor(s.year), ...common,
    });
    miniOk++;
    if (art.sections.some((x) => LINEAGE_SECTIONS.has(x.id)) || art.map.length > 0) miniLeak++;
  } catch (e) {
    failures.push(`mini ${i}: ${(e as Error).message}`);
  }
}
console.log(`\nMINI tier, birth time unknown, over 60 charts`);
console.log(`  generated and passed the contract: ${miniOk}/60`);
console.log(`  leaked a lineage claim:            ${miniLeak}  ${miniLeak === 0 ? "(good)" : "(BUG)"}`);

// --- 3. the refusals --------------------------------------------------------
console.log(`\nThe contract must REFUSE these`);
const refusals: Array<[string, () => unknown]> = [
  ["standard tier with no birth time", () => {
    const s = makeBirth(true);
    return generateStarOrigin({
      artifactId: "bad_1", displayName: null, tier: "standard",
      normalizedBirth: s.normalized, chart: computeNatalChart(s.birth, "whole_sign"),
      year: s.year, chartFingerprint: `sha256:${"c".repeat(64)}`, ...common,
    });
  }],
  ["extended tier while Layer 2 is unbuilt", () => {
    const s = makeBirth();
    return generateStarOrigin({
      artifactId: "bad_2", displayName: null, tier: "extended",
      normalizedBirth: s.normalized, chart: computeNatalChart(s.birth, "whole_sign"),
      year: s.year, chartFingerprint: `sha256:${"d".repeat(64)}`, ...common,
    });
  }],
  ["print tier while Layer 2 is unbuilt", () => {
    const s = makeBirth();
    return generateStarOrigin({
      artifactId: "bad_3", displayName: null, tier: "print",
      normalizedBirth: s.normalized, chart: computeNatalChart(s.birth, "whole_sign"),
      year: s.year, chartFingerprint: `sha256:${"e".repeat(64)}`, ...common,
    });
  }],
  ["a birth date that is not a real date", () => {
    const s = makeBirth();
    return generateStarOrigin({
      artifactId: "bad_4", displayName: null, tier: "standard",
      normalizedBirth: { ...s.normalized, date: "1991-02-30" },
      chart: computeNatalChart(s.birth, "whole_sign"),
      year: s.year, chartFingerprint: `sha256:${"f".repeat(64)}`, ...common,
    });
  }],
];
let refused = 0;
for (const [label, run] of refusals) {
  try {
    run();
    console.log(`  ${label.padEnd(44)} NOT REFUSED  <- BUG`);
  } catch (e) {
    const right = e instanceof StarOriginContractError;
    console.log(`  ${label.padEnd(44)} refused${right ? "" : " (wrong error type)"}`);
    if (right) refused++;
  }
}

const allGood = ok === N && miniOk === 60 && miniLeak === 0 && refused === refusals.length;
console.log(`\n${allGood ? "PASS - the generator holds and the contract bites." : "FAIL"}`);
if (!allGood) process.exitCode = 1;
