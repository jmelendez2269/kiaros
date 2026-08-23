/**
 * compare-star-origin-synthesis.mts
 *
 * Same chart, same prompt, two models. Printed unlabelled, in random order.
 *
 * "Which model is more personable" is a real question and it is a question
 * about taste, which means nobody can settle it by arguing and the person who
 * owns the product is the only one whose answer counts. What can be arranged
 * is that they answer it without knowing which is which — because knowing
 * which model wrote a passage is more than enough to decide that you prefer
 * it.
 *
 * So: both outputs, shuffled, no labels. Read them, pick one, then run again
 * with --reveal to find out what you picked. Run it a few times; one sample of
 * two is not a preference, it is a coin.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
 *     --import ./scripts/register-alias.mjs \
 *     scripts/compare-star-origin-synthesis.mts [--reveal] [--a slug] [--b slug]
 *
 * Needs gateway auth: AI_GATEWAY_API_KEY, or `vercel env pull .env.local`
 * for VERCEL_OIDC_TOKEN. Every Vercel team gets $5/month of free credits and
 * this costs a few cents a run.
 */
import { computeNatalChart, type BirthData } from "../lib/ephemeris/astronomia-adapter.ts";
import { starPositionsForYear } from "../lib/artifacts/star-origin/stars.ts";
import { selectFindings } from "../lib/artifacts/star-origin/findings.ts";
import { chartFacts, allowedNames } from "../lib/artifacts/star-origin/lifetime/facts.ts";
import { generateSynthesis, type SynthesisResult } from "../lib/artifacts/star-origin/lifetime/synthesis.ts";
import { LINEAGE_MEANINGS } from "../lib/artifacts/star-origin/content/lineage-meanings.ts";

const argv = process.argv.slice(2);
const arg = (n: string, fallback: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const reveal = argv.includes("--reveal");

const MODEL_A = arg("a", "openai/gpt-5.4");
const MODEL_B = arg("b", "anthropic/claude-opus-4.6");

// Jack's chart. Orion, specifically Rigel.
const birth: BirthData = {
  date: "1991-06-09", time: "01:35", timezone: "America/New_York",
  lat: 28.5383, lng: -81.3792, timeUnknown: false,
};
const YEAR = 1991;
const LINEAGE = "orion";

const chart = computeNatalChart(birth, "whole_sign");
const positions = starPositionsForYear(YEAR);
const findings = selectFindings(chart, YEAR, { starPositions: positions });
const facts = chartFacts(chart);
const meaning = LINEAGE_MEANINGS[LINEAGE];

const req = {
  lineageName: meaning.displayName,
  lineageSummary: [meaning.nature, meaning.longing, meaning.purpose, meaning.cost].join(" "),
  starContacts: findings.map(
    (f) => `${f.star.name} meeting your ${f.marker.replace("_", " ")}, ${f.orb.toFixed(2)}° apart`,
  ),
  facts,
  allowedNames: allowedNames(facts, findings.map((f) => f.star.name), meaning.displayName),
};

const wrap = (t: string, w = 76, ind = "    ") =>
  t.split(" ").reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= w) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []).map((l) => ind + l).join("\n");

function render(label: string, r: SynthesisResult | null, rejections: unknown) {
  console.log(`\n${"=".repeat(80)}\n  PASSAGE ${label}\n${"=".repeat(80)}\n`);
  if (!r) {
    console.log(`    (rejected — the section would be omitted)\n`);
    console.log(`    ${JSON.stringify(rejections)}\n`);
    return;
  }
  console.log(wrap(r.synthesis.opening) + "\n");
  for (const p of r.synthesis.paragraphs) console.log(wrap(p) + "\n");
  console.log(wrap(r.synthesis.tension) + "\n");
  console.log(`    — cites ${r.synthesis.citedFactIds.length} chart facts, ${r.attempts} attempt(s)`);
}

const run = async (model: string) => {
  process.stderr.write(`generating with ${model}... `);
  try {
    const out = await generateSynthesis(req, { model });
    process.stderr.write(out.result ? "ok\n" : "rejected\n");
    return out;
  } catch (error) {
    process.stderr.write("failed\n");
    console.error(
      `\n  ${model} could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      `  Gateway auth needed — set AI_GATEWAY_API_KEY, or run "vercel env pull .env.local".\n`,
    );
    process.exit(1);
  }
};

const [a, b] = await Promise.all([run(MODEL_A), run(MODEL_B)]);

// Shuffle, so the order carries no information either.
const flip = Math.random() < 0.5;
const first = flip ? { model: MODEL_B, out: b } : { model: MODEL_A, out: a };
const second = flip ? { model: MODEL_A, out: a } : { model: MODEL_B, out: b };

console.log(`\n  Same chart, same prompt, two models. Read both before deciding.`);
render("ONE", first.out.result, first.out.rejections);
render("TWO", second.out.result, second.out.rejections);

console.log(`\n${"=".repeat(80)}`);
if (reveal) {
  console.log(`  ONE was ${first.model}`);
  console.log(`  TWO was ${second.model}`);
} else {
  console.log(`  Which one sounds like Kairos? Decide, then re-run with --reveal.`);
  console.log(`  Run it a few times — one sample of two is a coin, not a preference.`);
}
console.log(`${"=".repeat(80)}\n`);
