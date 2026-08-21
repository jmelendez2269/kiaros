/**
 * preview-star-origin-report.mts
 *
 * The whole report, end to end, for real charts - lineage section and findings
 * section together, classified by the actual engine rather than by hand.
 *
 * The findings preview already proves the no-lineage half. This proves the
 * other half and, more importantly, proves they read as one document. A buyer
 * who gets a lineage still reads the findings section underneath it; if the
 * two halves repeat each other or contradict each other, this is where it
 * shows.
 *
 * It also checks that every ranked lineage has a meaning written, and that
 * every lineage x result-kind combination composes.
 *
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs \
 *     scripts/preview-star-origin-report.mts [howMany] [baselineSize]
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { scoreChart } from "../lib/artifacts/star-origin/scoring.ts";
import {
  buildBaseline, classifyByNotable, isNotable,
  DECIDING_MARKERS,
} from "../lib/artifacts/star-origin/baseline.ts";
import { selectFindings, writtenUp, findingsOrbFor } from "../lib/artifacts/star-origin/findings.ts";
import { LINEAGE_MEANINGS, missingLineageMeanings } from "../lib/artifacts/star-origin/content/lineage-meanings.ts";
import { composeFinding, composeLineage, decidedByFor, lineageSectionOpening, workingsRow } from "../lib/artifacts/star-origin/content/compose.ts";

const HOW_MANY = Number(process.argv[2] ?? 4);
const BASELINE_N = Number(process.argv[3] ?? 1500);
const LINEAGE_ORB = 2.5;
const NOTABLE = 1.5;

const GROUP_INTO: Record<string, string> = {
  orion_betelgeuse: "orion", orion_rigel: "orion", orion_bellatrix: "orion",
  orion_mintaka: "orion", orion_alnilam: "orion", orion_alnitak: "orion",
  hadar: "centaurus",
};
const NOT_RANKED = new Set(["aldebaran", "antares", "altair", "capella", "deneb", "procyon",
  "tau_ceti", "regulus", "canopus", "fomalhaut", "spica", "pollux", "alnair", "hyades",
  "cassiopeia", "ophiuchus", "super_galactic_centre"]);

// --- completeness ----------------------------------------------------------
const RANKED_IDS = ["pleiades", "lyra", "orion", "sirius", "arcturus", "andromeda",
  "centaurus", "eridanus", "polaris", "draco", "reticulum", "galactic_centre"];
const missing = missingLineageMeanings(RANKED_IDS);
const orphans = Object.keys(LINEAGE_MEANINGS).filter((id) => !RANKED_IDS.includes(id));

const failures: string[] = [];
for (const id of RANKED_IDS) {
  for (const kind of ["single", "paired"] as const) {
    for (const standingValue of [99, 92, 87, 50]) {
      try {
        const c = composeLineage({
          lineageId: id, standing: standingValue, kind,
          decidedBy: decidedByFor(kind, kind === "single" ? 1 : 2),
          leadContact: { starName: "Rigel", marker: "sun", orb: 0.8 },
        });
        if (c.body.some((s) => s.includes("undefined") || !s.trim().endsWith("."))) {
          failures.push(`${id} x ${kind} x ${standingValue}: malformed`);
        }
      } catch (e) {
        failures.push(`${id} x ${kind}: ${(e as Error).message}`);
      }
    }
  }
}

console.log(`\nLineage content completeness`);
console.log(`  ranked lineages:            ${RANKED_IDS.length}`);
console.log(`  lineage meanings written:   ${Object.keys(LINEAGE_MEANINGS).length}`);
console.log(`  combinations composed:      ${RANKED_IDS.length * 2 * 4}`);
if (missing.length) console.log(`  MISSING:                    ${missing.join(", ")}`);
if (orphans.length) console.log(`  meanings with no lineage:   ${orphans.join(", ")}`);
for (const f of failures.slice(0, 10)) console.log(`  FAILED: ${f}`);
const complete = !missing.length && !orphans.length && !failures.length;
console.log(`  ${complete ? "COMPLETE - every ranked lineage can be written up." : "INCOMPLETE"}`);
if (!complete) process.exitCode = 1;

// --- sample charts ---------------------------------------------------------
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
  [35.68, 139.65, "Asia/Tokyo"], [-23.55, -46.63, "America/Sao_Paulo"],
];
const pad = (n: number) => String(n).padStart(2, "0");
const START = Date.UTC(1950, 0, 1), END = Date.UTC(2010, 11, 31);
const makeBirth = () => {
  const d = new Date(START + rand() * (END - START));
  const [lat, lng, timezone] = CITIES[Math.floor(rand() * CITIES.length)];
  return {
    birth: {
      date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      time: `${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}`,
      timezone, lat, lng, timeUnknown: false,
    } as BirthData,
    year: d.getUTCFullYear(),
  };
};

const posCache = new Map<number, ReadonlyArray<{ star: CatalogStar; longitude: number }>>();
const posFor = (y: number) => { let p = posCache.get(y); if (!p) { p = starPositionsForYear(y); posCache.set(y, p); } return p; };

function analyse(birth: BirthData, year: number) {
  const chart = computeNatalChart(birth, "whole_sign");
  const r = scoreChart(chart, year, { orb: LINEAGE_ORB, starPositions: posFor(year) });
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

console.log(`\nBuilding baseline from ${BASELINE_N} charts...`);
const scored = Array.from({ length: BASELINE_N }, () => {
  const s = makeBirth();
  return analyse(s.birth, s.year);
});
const RANKED = [...new Set(scored.flatMap((s) => [...s.byLineage.keys()]))];
const baseline = buildBaseline(scored.map((s) => s.byLineage), RANKED, "preview");

const wrap = (text: string, width = 76, indent = "    ") =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= width) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []).map((l) => indent + l).join("\n");

/**
 * The contact that actually produced a lineage answer.
 *
 * It must be a NOTABLE one. Sorting by points alone would happily report "what
 * produced it was your Midheaven meeting Vega" - the Midheaven scores 10, the
 * highest there is, and is explicitly barred from naming a lineage because
 * letting it decide doubled the number of charts that change answer on a
 * four-minute shift. The bar is in `isNotable`, and the sentence the report
 * prints has to agree with it or the copy quietly undoes the decision.
 */
function leadFor(contacts: ReturnType<typeof analyse>["contacts"], lineageId: string) {
  const mine = contacts
    .filter((c) => c.star.lineage && (GROUP_INTO[c.star.lineage] ?? c.star.lineage) === lineageId)
    .filter((c) => isNotable(c, NOTABLE, DECIDING_MARKERS))
    .sort((a, b) => b.points - a.points)[0];
  return mine ? { starName: mine.star.name, marker: mine.marker, orb: mine.orb } : undefined;
}

let shown = 0, tried = 0;
const seenKinds = new Set<string>();
while (shown < HOW_MANY && tried < 400) {
  tried++;
  const s = makeBirth();
  const a = analyse(s.birth, s.year);
  const verdict = classifyByNotable(baseline, a.byLineage, a.notable);

  // Show one of each kind first, so a short run is not four of the same thing.
  if (shown < 3 && seenKinds.has(verdict.kind) && seenKinds.size < 3) continue;
  seenKinds.add(verdict.kind);
  shown++;

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Chart ${shown}  ${s.birth.date} ${s.birth.time}  ${s.birth.timezone}   [${verdict.kind}]`);
  console.log(`${"=".repeat(80)}`);

  console.log(`\n  WHERE YOU RESONATE\n`);
  console.log(wrap(lineageSectionOpening(verdict.kind)));
  console.log("");
  if (verdict.kind !== "spread") {
    const parts =
      verdict.kind === "single"
        ? [{ id: verdict.primary, standing: verdict.standing, kind: "single" as const }]
        : [
            { id: verdict.primary, standing: verdict.standings[0], kind: "paired" as const },
            { id: verdict.secondary, standing: verdict.standings[1], kind: "paired" as const },
          ];
    for (const p of parts) {
      const c = composeLineage({
        lineageId: p.id,
        standing: p.standing,
        kind: p.kind,
        decidedBy: decidedByFor(p.kind, a.notable.size),
        leadContact: leadFor(a.contacts, p.id),
      });
      console.log(`  ${c.title.toUpperCase()}`);
      if (c.subtitle) console.log(`  ${c.subtitle}`);
      console.log("");
      for (const line of c.body) console.log(wrap(line) + "\n");
    }
  }

  const lineageStarId = verdict.kind === "spread"
    ? undefined
    : a.contacts
        .filter((c) => c.star.lineage && (GROUP_INTO[c.star.lineage] ?? c.star.lineage) === verdict.primary)
        .filter((c) => isNotable(c, NOTABLE, DECIDING_MARKERS))
        .sort((x, y) => y.points - x.points)[0]?.star.id;

  const orb = findingsOrbFor(a.chart);
  const findings = selectFindings(a.chart, s.year, { orb, starPositions: posFor(s.year) });
  console.log(`  YOUR STRONGEST MARKERS`);
  console.log(`  ${findings.length} findings at ${orb} deg\n`);
  for (const f of writtenUp(findings, undefined, lineageStarId)) {
    const c = composeFinding(f);
    console.log(`  ${c.title}`);
    for (const line of c.body) console.log(wrap(line) + "\n");
  }

  console.log(`  THE WORKINGS`);
  console.log(`  ${"star".padEnd(22)}${"met".padEnd(12)}${"star sat at".padEnd(20)}${"which sat at".padEnd(20)}apart`);
  for (const f of findings) {
    const r = workingsRow(f);
    console.log(`  ${r.star.padEnd(22)}${r.marker.padEnd(12)}${r.starPosition.padEnd(20)}${r.markerPosition.padEnd(20)}${r.separation}`);
  }
}
console.log("");
