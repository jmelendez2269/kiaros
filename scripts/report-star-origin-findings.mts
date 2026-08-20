/**
 * report-star-origin-findings.mts
 *
 * Not a gate - a scoping question for the findings report (k14).
 *
 * The findings section has to carry three products: the ~39% with no clear
 * lineage, the Mini tier, and unknown-birth-time buyers. Before writing 45
 * star meanings this asks what actually has to exist: how many findings a
 * chart has, how often the report can lead with something tight, whether the
 * leads repeat, and which stars carry the load.
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, type CatalogStar, STARS } from "../lib/artifacts/star-origin/stars.ts";
import { selectFindings, FINDINGS_ORB, bandFor } from "../lib/artifacts/star-origin/findings.ts";

const N = Number(process.argv[2] ?? 2000);
const ORB = Number(process.argv[3] ?? FINDINGS_ORB);
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
  [40.71,-74.01,"America/New_York"],[34.05,-118.24,"America/Los_Angeles"],[51.51,-0.13,"Europe/London"],
  [-33.87,151.21,"Australia/Sydney"],[35.68,139.65,"Asia/Tokyo"],[19.43,-99.13,"America/Mexico_City"],
  [52.52,13.4,"Europe/Berlin"],[-23.55,-46.63,"America/Sao_Paulo"],[28.61,77.21,"Asia/Kolkata"],
  [-26.2,28.05,"Africa/Johannesburg"],[55.76,37.62,"Europe/Moscow"],[1.35,103.82,"Asia/Singapore"],
];
const pad = (n: number) => String(n).padStart(2, "0");
const START = Date.UTC(1950,0,1), END = Date.UTC(2010,11,31);

const samples = Array.from({length: N}, () => {
  const d = new Date(START + rand() * (END - START));
  const [lat,lng,timezone] = CITIES[Math.floor(rand()*CITIES.length)];
  return {
    birth: { date:`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`,
             time:`${pad(Math.floor(rand()*24))}:${pad(Math.floor(rand()*60))}`,
             timezone, lat, lng, timeUnknown: NO_TIME } as BirthData,
    year: d.getUTCFullYear(),
  };
});

const posCache = new Map<number, ReadonlyArray<{star:CatalogStar;longitude:number}>>();
const posFor = (y:number) => { let p = posCache.get(y); if(!p){p=starPositionsForYear(y);posCache.set(y,p);} return p; };

const all = samples.map((s) => {
  const chart = computeNatalChart(s.birth, "whole_sign");
  return selectFindings(chart, s.year, { orb: ORB, starPositions: posFor(s.year) });
});

const pct = (n: number) => `${((n / N) * 100).toFixed(1)}%`;
console.log(`\n${N} charts, findings orb ${ORB} deg${NO_TIME ? ", BIRTH TIME UNKNOWN" : ""}.\n`);

console.log(`  have nothing at all:                       ${pct(all.filter(f=>f.length===0).length)}`);
for (const k of [1,2,3,4,5]) {
  console.log(`  have ${k} or more findings:                   ${pct(all.filter(f=>f.length>=k).length)}`);
}
console.log(`  average findings per chart:                ${(all.reduce((a,f)=>a+f.length,0)/N).toFixed(2)}`);

const PERSONAL = new Set(["sun","moon","ascendant"]);
console.log(`\n  lead finding lands on Sun/Moon/Asc:        ${pct(all.filter(f=>f[0]&&PERSONAL.has(f[0].marker)).length)}`);
for (const b of ["exact","close","within_range"] as const) {
  console.log(`  lead finding is "${b}"${" ".repeat(20-b.length)} ${pct(all.filter(f=>f[0]&&f[0].band===b).length)}`);
}
console.log(`  has at least one "exact" (<=1 deg):        ${pct(all.filter(f=>f.some(x=>x.band==="exact")).length)}`);

// How often does one star get hit twice inside the three we write up? That is
// the same paragraph printed twice, so writtenUp() drops down the list instead.
const dupTop3 = all.filter((f) => {
  const ids = f.slice(0, 3).map((x) => x.star.id);
  return new Set(ids).size < ids.length;
}).length;
console.log(`\n  top 3 by strength repeat a star:           ${pct(dupTop3)}`);
const shortAfterDedupe = all.filter((f) => new Set(f.map((x) => x.star.id)).size < 3).length;
console.log(`  fewer than 3 DISTINCT stars available:     ${pct(shortAfterDedupe)}`);

const leads = new Map<string, number>();
for (const f of all) if (f[0]) leads.set(f[0].star.name, (leads.get(f[0].star.name) ?? 0) + 1);
console.log(`\n  What the report leads with (top 12 of ${leads.size} distinct):`);
for (const [name, n] of [...leads.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12)) {
  console.log(`    ${name.padEnd(24)}${pct(n)}`);
}

// Which star meanings actually get read, and which are dead weight.
const appears = new Map<string, number>();
for (const f of all) for (const x of f) appears.set(x.star.name, (appears.get(x.star.name) ?? 0) + 1);
const never = STARS.filter(s => !appears.has(s.name)).map(s => s.name);
console.log(`\n  distinct stars appearing anywhere in a report: ${appears.size} of ${STARS.length}`);
if (never.length) console.log(`  never appears in ${N} charts: ${never.join(", ")}`);

// Which markers carry findings - tells us which body voices have to be written.
const byMarker = new Map<string, number>();
for (const f of all) for (const x of f) byMarker.set(x.marker, (byMarker.get(x.marker) ?? 0) + 1);
console.log(`\n  Findings by marker (how often each body voice is needed):`);
for (const [m, n] of [...byMarker.entries()].sort((a,b)=>b[1]-a[1])) {
  console.log(`    ${m.padEnd(14)}${(n/N).toFixed(2)} per chart`);
}
console.log("");
