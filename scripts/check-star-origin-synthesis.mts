/**
 * check-star-origin-synthesis.mts
 *
 * Does the fence hold?
 *
 * The synthesis section is the only per-buyer writing in the report, so it is
 * the only place an untrue sentence can get in. Everything that stops that is
 * in validateSynthesis, and a validator nobody has fed bad input to is not a
 * validator - it is a comment.
 *
 * So this hand-writes the failures we actually fear and asserts each one is
 * caught. No API calls, no key, no cost, deterministic.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
 *     --import ./scripts/register-alias.mjs scripts/check-star-origin-synthesis.mts
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { chartFacts, allowedNames } from "../lib/artifacts/star-origin/lifetime/facts.ts";
import { validateSynthesis, type Synthesis } from "../lib/artifacts/star-origin/lifetime/synthesis.ts";

// A real chart, so the fact ids are real ones.
const birth: BirthData = {
  date: "1991-06-09", time: "01:35", timezone: "America/New_York",
  lat: 28.5383, lng: -81.3792, timeUnknown: false,
};
const chart = computeNatalChart(birth, "whole_sign");
const facts = chartFacts(chart);
const names = allowedNames(facts, ["Rigel", "Rasalhague", "Praesepe", "Hyades", "Pollux"], "Orion");

console.log(`\nChart facts available to the synthesis: ${facts.length}`);
for (const f of facts.slice(0, 6)) console.log(`  [${f.id}]  ${f.statement}`);
console.log(`  ... and ${facts.length - 6} more (${facts.filter((f) => f.kind === "aspect").length} aspects)\n`);

const good: Synthesis = {
  opening: "The hunter's inheritance lands, in your chart, on a mind built to talk rather than to fight.",
  paragraphs: [
    "Your Sun sits in Gemini, and that is the first thing worth saying about how Orion arrives in you. The line is about standing in conflict; Gemini is about finding the words for things. Put together, you are not the one who wins the argument by force. You are the one who names what the argument is actually about, which is a rarer and far more useful capacity, and which is why people bring you into rooms that have gone wrong.",
    "Mercury in Gemini doubles it. Where somebody else with this line would go quiet and endure, you talk — and the talking is the work, not an avoidance of it. This is the specific shape of your version of the line, and it is worth knowing that it is a version rather than the whole thing.",
    "Saturn in Aquarius asks for the long form of all of this. Nothing about the way you do it will be fast, and the results arrive on a timescale that has embarrassed you next to people who move quicker and get less far. That is the trade and it has always been the trade.",
  ],
  tension: "Orion is a line about not leaving. Gemini is a sign about moving on. You have felt both of those pull at once for as long as you can remember, and neither one of them is the wrong half of you.",
  citedFactIds: ["placement.sun", "placement.mercury", "placement.saturn"],
};

interface Case { label: string; synthesis: Synthesis; mustCatch: string }

const cases: Case[] = [
  {
    label: "cites a fact the chart does not have",
    mustCatch: "invented fact",
    synthesis: { ...good, citedFactIds: [...good.citedFactIds, "aspect.sun.chiron"] },
  },
  {
    label: "names a star that is not in the chart",
    mustCatch: "unknown name",
    synthesis: {
      ...good,
      paragraphs: [...good.paragraphs.slice(0, 2), "Your contact with Betelgeuse deepens all of this considerably."],
    },
  },
  {
    label: "predicts an event",
    mustCatch: "forbidden topic",
    synthesis: { ...good, tension: "You will meet the person who changes this." },
  },
  {
    label: "touches health",
    mustCatch: "forbidden topic",
    synthesis: { ...good, tension: "This placement often shows up as anxiety disorder and needs medication." },
  },
  {
    label: "touches money",
    mustCatch: "forbidden topic",
    synthesis: { ...good, tension: "Your income will rise once you accept this about yourself." },
  },
  {
    label: "dates something",
    mustCatch: "forbidden topic",
    synthesis: { ...good, tension: "2027 is when this finally resolves for you." },
  },
  {
    label: "generic filler with almost no chart in it",
    mustCatch: "too generic",
    synthesis: { ...good, citedFactIds: ["placement.sun"] },
  },
  {
    label: "wrong length",
    mustCatch: "length",
    synthesis: { ...good, paragraphs: [good.paragraphs[0]] },
  },
  {
    label: "wellness jargon the voice rules ban",
    mustCatch: "forbidden topic",
    synthesis: { ...good, tension: "This is your soul contract and its frequency is unmistakable." },
  },
];

console.log("The validator must REJECT each of these:\n");
let caught = 0;
for (const c of cases) {
  const rejections = validateSynthesis(c.synthesis, facts, names);
  const hit = rejections.some((r) => r.reason === c.mustCatch);
  if (hit) caught++;
  const detail =
    rejections.find((r) => r.reason === c.mustCatch)?.detail ??
    (rejections.map((r) => r.reason).join(", ") || "nothing");
  console.log(`  ${hit ? "caught " : "MISSED "} ${c.label.padEnd(46)} ${hit ? `(${detail})` : `<- BUG, got: ${detail}`}`);
}

const goodRejections = validateSynthesis(good, facts, names);
console.log(`\nAnd it must ACCEPT a good one:`);
console.log(`  ${goodRejections.length === 0 ? "accepted" : "REJECTED <- BUG"}  ${goodRejections.map((r) => `${r.reason}: ${r.detail}`).join("; ")}`);

const pass = caught === cases.length && goodRejections.length === 0;
console.log(`\n${pass ? `PASS - ${caught}/${cases.length} rejected, good one accepted.` : "FAIL"}\n`);
if (!pass) process.exitCode = 1;
