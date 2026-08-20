/**
 * preview-star-origin-findings.mts
 *
 * Two jobs.
 *
 * First, the completeness check: every catalogue star needs a meaning and
 * every scoring marker needs a voice, or some buyer eventually opens a report
 * with a hole in it. This fails loudly rather than at generation time.
 *
 * Second, it prints what a buyer would actually read, for real charts, so the
 * writing gets judged as writing rather than as a coverage percentage.
 *
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs \
 *     scripts/preview-star-origin-findings.mts [howMany] [no-time]
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, STARS, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { MARKER_POINTS } from "../lib/artifacts/star-origin/scoring.ts";
import { selectFindings, writtenUp, findingsOrbFor } from "../lib/artifacts/star-origin/findings.ts";
import { STAR_MEANINGS, missingMeanings } from "../lib/artifacts/star-origin/content/star-meanings.ts";
import { BODY_VOICES } from "../lib/artifacts/star-origin/content/body-voices.ts";
import { composeFinding, workingsRow } from "../lib/artifacts/star-origin/content/compose.ts";

// --- completeness ----------------------------------------------------------
const missingStars = missingMeanings(STARS.map((s) => s.id));
const missingMarkers = Object.keys(MARKER_POINTS).filter((m) => !(m in BODY_VOICES));
const orphanMeanings = Object.keys(STAR_MEANINGS).filter(
  (id) => !STARS.some((s) => s.id === id),
);

console.log(`\nContent completeness`);
console.log(`  catalogue stars:            ${STARS.length}`);
console.log(`  star meanings written:      ${Object.keys(STAR_MEANINGS).length}`);
console.log(`  scoring markers:            ${Object.keys(MARKER_POINTS).length}`);
console.log(`  marker voices written:      ${Object.keys(BODY_VOICES).length}`);
if (missingStars.length) console.log(`  MISSING star meanings:      ${missingStars.join(", ")}`);
if (missingMarkers.length) console.log(`  MISSING marker voices:      ${missingMarkers.join(", ")}`);
if (orphanMeanings.length) console.log(`  meanings with no star:      ${orphanMeanings.join(", ")}`);
// Every star can land on every marker, so compose all 45 x 11 rather than
// sampling charts and hoping the rare pairs came up.
const failures: string[] = [];
for (const star of STARS) {
  for (const marker of Object.keys(MARKER_POINTS)) {
    for (const band of ["exact", "close", "within_range"] as const) {
      try {
        const c = composeFinding({
          findingId: `probe.${marker}.${star.id}`,
          marker, markerLongitude: 100, star, starLongitude: 100.5,
          orb: 0.5, closeness: 0.9, strength: 5, band,
        });
        if (c.body.some((s) => !s.trim().endsWith(".") || s.includes("undefined"))) {
          failures.push(`${star.id} x ${marker} x ${band}: malformed sentence`);
        }
      } catch (e) {
        failures.push(`${star.id} x ${marker} x ${band}: ${(e as Error).message}`);
      }
    }
  }
}
console.log(`  combinations composed:      ${STARS.length * Object.keys(MARKER_POINTS).length * 3}`);
for (const f of failures.slice(0, 10)) console.log(`  FAILED: ${f}`);

const complete =
  !missingStars.length && !missingMarkers.length && !orphanMeanings.length && !failures.length;
console.log(`  ${complete ? "COMPLETE - every star and marker can be written up." : "INCOMPLETE"}`);
if (!complete) process.exitCode = 1;

// --- what a buyer reads ----------------------------------------------------
const HOW_MANY = Number(process.argv[2] ?? 3);
const NO_TIME = process.argv.includes("no-time");

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260820);
const CITIES: ReadonlyArray<[number, number, string]> = [
  [40.71, -74.01, "America/New_York"], [51.51, -0.13, "Europe/London"],
  [-33.87, 151.21, "Australia/Sydney"], [19.43, -99.13, "America/Mexico_City"],
];
const pad = (n: number) => String(n).padStart(2, "0");
const START = Date.UTC(1950, 0, 1), END = Date.UTC(2010, 11, 31);

const wrap = (text: string, width = 76, indent = "    ") =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= width) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []).map((l) => indent + l).join("\n");

const posCache = new Map<number, ReadonlyArray<{ star: CatalogStar; longitude: number }>>();
const posFor = (y: number) => { let p = posCache.get(y); if (!p) { p = starPositionsForYear(y); posCache.set(y, p); } return p; };

for (let i = 0; i < HOW_MANY; i++) {
  const d = new Date(START + rand() * (END - START));
  const [lat, lng, timezone] = CITIES[Math.floor(rand() * CITIES.length)];
  const birth: BirthData = {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}`,
    timezone, lat, lng, timeUnknown: NO_TIME,
  };
  const chart = computeNatalChart(birth, "whole_sign");
  const year = d.getUTCFullYear();
  const orb = findingsOrbFor(chart);
  const findings = selectFindings(chart, year, { orb, starPositions: posFor(year) });

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Chart ${i + 1}  ${birth.date}${NO_TIME ? " (birth time unknown)" : ` ${birth.time}`}  ${timezone}`);
  console.log(`${findings.length} findings at ${orb} deg.`);
  console.log(`${"=".repeat(80)}`);

  for (const f of writtenUp(findings)) {
    const c = composeFinding(f);
    console.log(`\n  ${c.title.toUpperCase()}`);
    console.log(`  ${c.subtitle}\n`);
    for (const s of c.body) console.log(wrap(s) + "\n");
    console.log(`      [${c.source}]`);
  }

  console.log(`\n  THE WORKINGS`);
  console.log(`  ${"star".padEnd(22)}${"met".padEnd(12)}${"star sat at".padEnd(20)}${"which sat at".padEnd(20)}apart`);
  for (const f of findings) {
    const r = workingsRow(f);
    console.log(`  ${r.star.padEnd(22)}${r.marker.padEnd(12)}${r.starPosition.padEnd(20)}${r.markerPosition.padEnd(20)}${r.separation}`);
  }
}
console.log("");
