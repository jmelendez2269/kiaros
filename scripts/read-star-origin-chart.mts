/**
 * read-star-origin-chart.mts
 *
 * Run one REAL birth chart through the whole Star Origin pipeline and print
 * the report a buyer would get. This is Check 5 from the spec.
 *
 * Check 5 goes last, and the spec is blunt about why: it is the easiest one to
 * fool yourself with. Reading your own report and finding it accurate proves
 * almost nothing - a well-written reading about anybody sounds like it is
 * about you. What this run is actually good for:
 *
 *   - the pipeline survives a real chart rather than a generated one
 *   - the positions can be checked against a chart you already trust
 *   - the workings table can be checked line by line
 *   - the writing can be judged as writing
 *
 * What it cannot tell you is whether the method works. That is what Checks 1-4
 * were for, and they are the ones that could have failed.
 *
 * Birth data is passed on the command line and never written to disk. Nothing
 * here stores it.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
 *     --import ./scripts/register-alias.mjs \
 *     scripts/read-star-origin-chart.mts \
 *     --date 1987-03-14 --time 09:25 --tz America/New_York \
 *     --lat 40.71 --lng -74.01 [--name Jack] [--no-time]
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { scoreChart } from "../lib/artifacts/star-origin/scoring.ts";
import {
  buildBaseline, classifyByNotable, isNotable, DECIDING_MARKERS,
} from "../lib/artifacts/star-origin/baseline.ts";
import { selectFindings, writtenUp, findingsOrbFor } from "../lib/artifacts/star-origin/findings.ts";
import {
  composeFinding, composeLineage, decidedByFor, lineageSectionOpening,
  formatPosition, workingsRow,
} from "../lib/artifacts/star-origin/content/compose.ts";

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const flag = (name: string) => argv.includes(`--${name}`);

const date = arg("date");
const time = arg("time");
const tz = arg("tz");
const lat = Number(arg("lat"));
const lng = Number(arg("lng"));
const displayName = arg("name") ?? "";
const noTime = flag("no-time") || !time;

if (!date || !tz || !Number.isFinite(lat) || !Number.isFinite(lng)) {
  console.error(
    "\nNeed at least: --date YYYY-MM-DD --tz Area/City --lat N --lng N" +
    "\nAdd --time HH:MM for a timed chart, or --no-time to run it without one." +
    "\nLongitude is negative west of Greenwich.\n",
  );
  process.exit(2);
}

const birth: BirthData = {
  date, time: noTime ? "12:00" : time!, timezone: tz, lat, lng, timeUnknown: noTime,
};
const year = Number(date.slice(0, 4));

// --- the same settings the gate runs on ------------------------------------
const LINEAGE_ORB = 2.5;
const NOTABLE = 1.5;
const BASELINE_N = Number(arg("baseline") ?? 4000);

const GROUP_INTO: Record<string, string> = {
  orion_betelgeuse: "orion", orion_rigel: "orion", orion_bellatrix: "orion",
  orion_mintaka: "orion", orion_alnilam: "orion", orion_alnitak: "orion",
  hadar: "centaurus",
};
const NOT_RANKED = new Set(["aldebaran", "antares", "altair", "capella", "deneb", "procyon",
  "tau_ceti", "regulus", "canopus", "fomalhaut", "spica", "pollux", "alnair", "hyades",
  "cassiopeia", "ophiuchus", "super_galactic_centre"]);

const posCache = new Map<number, ReadonlyArray<{ star: CatalogStar; longitude: number }>>();
const posFor = (y: number) => { let p = posCache.get(y); if (!p) { p = starPositionsForYear(y); posCache.set(y, p); } return p; };

function analyse(b: BirthData, y: number) {
  const chart = computeNatalChart(b, "whole_sign");
  const r = scoreChart(chart, y, { orb: LINEAGE_ORB, starPositions: posFor(y) });
  const byLineage = new Map<string, number>();
  const notable = new Set<string>();
  for (const [l, v] of r.byLineage) {
    if (NOT_RANKED.has(l)) continue;
    const k = GROUP_INTO[l] ?? l;
    byLineage.set(k, (byLineage.get(k) ?? 0) + v);
  }
  for (const c of r.contacts) {
    if (!c.star.lineage || NOT_RANKED.has(c.star.lineage)) continue;
    if (!isNotable(c, NOTABLE, DECIDING_MARKERS)) continue;
    notable.add(GROUP_INTO[c.star.lineage] ?? c.star.lineage);
  }
  return { chart, contacts: r.contacts, byLineage, notable };
}

// --- baseline --------------------------------------------------------------
// Fixed seed, so the same birth data always produces the same report. A
// baseline that shifted between runs would mean a buyer could be re-sent their
// own report and find it had changed, which is not a thing this can do.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260819);
const CITIES: ReadonlyArray<[number, number, string]> = [
  [40.71, -74.01, "America/New_York"], [34.05, -118.24, "America/Los_Angeles"],
  [51.51, -0.13, "Europe/London"], [-33.87, 151.21, "Australia/Sydney"],
  [35.68, 139.65, "Asia/Tokyo"], [19.43, -99.13, "America/Mexico_City"],
  [52.52, 13.4, "Europe/Berlin"], [-23.55, -46.63, "America/Sao_Paulo"],
  [28.61, 77.21, "Asia/Kolkata"], [-26.2, 28.05, "Africa/Johannesburg"],
  [55.76, 37.62, "Europe/Moscow"], [1.35, 103.82, "Asia/Singapore"],
];
const pad = (n: number) => String(n).padStart(2, "0");
const START = Date.UTC(1950, 0, 1), END = Date.UTC(2010, 11, 31);

process.stderr.write(`Building the baseline from ${BASELINE_N} charts... `);
const samples = Array.from({ length: BASELINE_N }, () => {
  const d = new Date(START + rand() * (END - START));
  const [la, ln, zone] = CITIES[Math.floor(rand() * CITIES.length)];
  return analyse({
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}`,
    timezone: zone, lat: la, lng: ln, timeUnknown: false,
  } as BirthData, d.getUTCFullYear()).byLineage;
});
const RANKED = [...new Set(samples.flatMap((s) => [...s.keys()]))];
const baseline = buildBaseline(samples, RANKED, "check5");
process.stderr.write("done.\n");

// --- the report ------------------------------------------------------------
const me = analyse(birth, year);
const verdict = classifyByNotable(baseline, me.byLineage, me.notable);

const wrap = (text: string, width = 74, indent = "    ") =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= width) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []).map((l) => indent + l).join("\n");

function leadFor(lineageId: string) {
  // Must be a notable contact - the Midheaven scores highest of any marker and
  // is barred from naming a lineage, so points alone would let the copy claim
  // something the engine refuses to.
  const best = me.contacts
    .filter((c) => c.star.lineage && (GROUP_INTO[c.star.lineage] ?? c.star.lineage) === lineageId)
    .filter((c) => isNotable(c, NOTABLE, DECIDING_MARKERS))
    .sort((a, b) => b.points - a.points)[0];
  return best ? { starName: best.star.name, marker: best.marker } : undefined;
}

const rule = "=".repeat(78);
console.log(`\n${rule}`);
console.log(`STAR ORIGIN${displayName ? ` — ${displayName}` : ""}`);
console.log(`${date}${noTime ? "  (birth time unknown)" : `  ${time}`}  ${tz}  ${lat}, ${lng}`);
console.log(rule);

// The chart itself, so it can be checked against one already trusted. If these
// are wrong nothing downstream is worth reading.
console.log(`\nCHART CHECK — verify these against a chart you already trust`);
const c = me.chart;
const rows: Array<[string, number | undefined]> = [
  ["Sun", c.sun.longitude], ["Moon", c.moon.longitude], ["Mercury", c.mercury.longitude],
  ["Venus", c.venus.longitude], ["Mars", c.mars.longitude], ["Jupiter", c.jupiter.longitude],
  ["Saturn", c.saturn.longitude], ["Ascendant", c.ascendantLongitude],
  ["Midheaven", c.midheavenLongitude], ["North Node", c.northNodeLongitude],
  ["South Node", c.southNodeLongitude],
];
for (const [label, lon] of rows) {
  console.log(`  ${label.padEnd(12)}${lon === undefined ? "(needs a birth time)" : formatPosition(lon)}`);
}

console.log(`\n${rule}`);
console.log(`WHERE YOU RESONATE   [${verdict.kind}]`);
console.log(rule + "\n");
console.log(wrap(lineageSectionOpening(verdict.kind)) + "\n");

if (verdict.kind !== "spread") {
  const parts = verdict.kind === "single"
    ? [{ id: verdict.primary, standing: verdict.standing, kind: "single" as const }]
    : [
        { id: verdict.primary, standing: verdict.standings[0], kind: "paired" as const },
        { id: verdict.secondary, standing: verdict.standings[1], kind: "paired" as const },
      ];
  for (const p of parts) {
    const block = composeLineage({
      lineageId: p.id,
      standing: p.standing,
      kind: p.kind,
      decidedBy: decidedByFor(p.kind, me.notable.size),
      leadContact: leadFor(p.id),
    });
    console.log(`  ${block.title.toUpperCase()}`);
    if (block.subtitle) console.log(`  ${block.subtitle}`);
    console.log("");
    for (const line of block.body) console.log(wrap(line) + "\n");
  }
}

const orb = findingsOrbFor(me.chart);
const findings = selectFindings(me.chart, year, { orb, starPositions: posFor(year) });
console.log(`${rule}`);
console.log(`YOUR STRONGEST MARKERS   ${findings.length} findings at ${orb} deg`);
console.log(rule + "\n");
for (const f of writtenUp(findings)) {
  const block = composeFinding(f);
  console.log(`  ${block.title.toUpperCase()}`);
  console.log(`  ${block.subtitle}\n`);
  for (const line of block.body) console.log(wrap(line) + "\n");
}

console.log(`${rule}`);
console.log(`THE WORKINGS`);
console.log(rule);
console.log(`  ${"star".padEnd(22)}${"met".padEnd(12)}${"star sat at".padEnd(20)}${"which sat at".padEnd(20)}apart`);
for (const f of findings) {
  const r = workingsRow(f);
  console.log(`  ${r.star.padEnd(22)}${r.marker.padEnd(12)}${r.starPosition.padEnd(20)}${r.markerPosition.padEnd(20)}${r.separation}`);
}

// What the lineage half was working from, which is a tighter orb and a smaller
// set of stars than the findings above. Worth seeing separately or the two
// halves look like they disagree.
console.log(`\n  Lineage contacts (2.5 deg, ranked lineages only):`);
const ranked = me.contacts
  .filter((x) => x.star.lineage && !NOT_RANKED.has(x.star.lineage))
  .sort((a, b) => b.points - a.points);
if (!ranked.length) console.log(`    none`);
for (const x of ranked) {
  const notableMark = isNotable(x, NOTABLE, DECIDING_MARKERS) ? "  <- notable" : "";
  console.log(`    ${x.star.name.padEnd(20)}${x.marker.padEnd(12)}${x.orb.toFixed(2)} deg${notableMark}`);
}
console.log("");
