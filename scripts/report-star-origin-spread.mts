/**
 * report-star-origin-spread.mts
 *
 * Not a gate - a product question.
 *
 * About 40% of charts get no clear lineage. The spec says that outcome has to
 * read as well as the others: "here are your strongest fixed stars and what
 * each means for you." This asks whether there is actually enough in those
 * charts to write that from, or whether some people would open the report and
 * find an empty page.
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear, type CatalogStar } from "../lib/artifacts/star-origin/stars.ts";
import { scoreChart, MARKER_POINTS } from "../lib/artifacts/star-origin/scoring.ts";
import { buildBaseline, classifyByNotable, isNotable, DECIDING_MARKERS } from "../lib/artifacts/star-origin/baseline.ts";

const N = Number(process.argv[2] ?? 2000);
const ORB = 2.5;
const NOTABLE = 1.5;

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

const GROUP_INTO: Record<string,string> = {
  orion_betelgeuse:"orion",orion_rigel:"orion",orion_bellatrix:"orion",
  orion_mintaka:"orion",orion_alnilam:"orion",orion_alnitak:"orion",hadar:"centaurus",
};
const NOT_RANKED = new Set(["aldebaran","antares","altair","capella","deneb","procyon","tau_ceti",
  "regulus","canopus","fomalhaut","spica","pollux","alnair","hyades","cassiopeia","ophiuchus","super_galactic_centre"]);

const samples = Array.from({length: N}, () => {
  const d = new Date(START + rand() * (END - START));
  const [lat,lng,timezone] = CITIES[Math.floor(rand()*CITIES.length)];
  return {
    birth: { date:`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`,
             time:`${pad(Math.floor(rand()*24))}:${pad(Math.floor(rand()*60))}`,
             timezone, lat, lng, timeUnknown:false } as BirthData,
    year: d.getUTCFullYear(),
  };
});

const posCache = new Map<number, ReadonlyArray<{star:CatalogStar;longitude:number}>>();
const posFor = (y:number) => { let p = posCache.get(y); if(!p){p=starPositionsForYear(y);posCache.set(y,p);} return p; };

const scored = samples.map((s) => {
  const chart = computeNatalChart(s.birth, "whole_sign");
  const r = scoreChart(chart, s.year, { orb: ORB, starPositions: posFor(s.year) });
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
  return { contacts: r.contacts, byLineage, notable };
});

const RANKED = [...new Set(scored.flatMap(s => [...s.byLineage.keys()]))];
const baseline = buildBaseline(scored.map(s => s.byLineage), RANKED, "sim");

const spread = scored.filter(s => classifyByNotable(baseline, s.byLineage, s.notable).kind === "spread");
console.log(`\n${N} charts.  got a lineage: ${(((N-spread.length)/N)*100).toFixed(1)}%   no clear lineage: ${((spread.length/N)*100).toFixed(1)}%\n`);
console.log(`Looking only at the ${spread.length} charts with NO clear lineage:\n`);

const pct = (n: number) => `${((n / spread.length) * 100).toFixed(1)}%`;
const tightest = (cs: typeof spread[0]["contacts"]) => cs.length ? Math.min(...cs.map(c=>c.orb)) : Infinity;
const personal = (cs: typeof spread[0]["contacts"]) => cs.filter(c => (MARKER_POINTS[c.marker] ?? 0) >= 7);

console.log(`  have at least one star contact at all:      ${pct(spread.filter(s=>s.contacts.length>0).length)}`);
console.log(`  have one within 1.5 deg:                    ${pct(spread.filter(s=>tightest(s.contacts)<=1.5).length)}`);
console.log(`  have one within 1.0 deg:                    ${pct(spread.filter(s=>tightest(s.contacts)<=1.0).length)}`);
console.log(`  have one within 0.5 deg:                    ${pct(spread.filter(s=>tightest(s.contacts)<=0.5).length)}`);
console.log(`  have a contact on Sun, Moon or Ascendant:   ${pct(spread.filter(s=>personal(s.contacts).length>0).length)}`);
console.log(`  have 3 or more contacts to write about:     ${pct(spread.filter(s=>s.contacts.length>=3).length)}`);
const avg = spread.reduce((a,s)=>a+s.contacts.length,0)/spread.length;
console.log(`  average contacts per chart:                 ${avg.toFixed(2)}`);

const counts = new Map<string, number>();
for (const s of spread) {
  const top = [...s.contacts].sort((a,b)=>b.points-a.points)[0];
  if (top) counts.set(top.star.name, (counts.get(top.star.name) ?? 0) + 1);
}
console.log(`\n  Their single strongest fixed star - what the report would lead with:`);
for (const [name, n] of [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 15)) {
  console.log(`    ${name.padEnd(24)}${pct(n)}`);
}
console.log(`\n  distinct stars appearing as someone's strongest: ${counts.size}\n`);

// Does anybody open an empty report? The findings section is not a lineage
// claim, so a wider orb is honest there - "your Sun's nearest star is Regulus,
// 3 degrees off" is simply true, and says nothing about origin.
console.log(`  Nobody should open an empty report. Charts with NO contact at all:`);
for (const wide of [2.5, 3, 4, 5, 6]) {
  let none = 0;
  for (const s of samples) {
    const chart = computeNatalChart(s.birth, "whole_sign");
    const r = scoreChart(chart, s.year, { orb: wide, starPositions: posFor(s.year) });
    if (r.contacts.length === 0) none++;
  }
  console.log(`    within ${String(wide).padEnd(4)}deg: ${((none / N) * 100).toFixed(2)}% of ALL charts have nothing`);
}
console.log("");
