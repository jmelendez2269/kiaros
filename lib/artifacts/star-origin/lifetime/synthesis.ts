/**
 * synthesis.ts
 *
 * The one section of a Star Origin report that is written per buyer.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS BUILT THE WAY IT IS
 *
 * Everything else in this report is composed from files a person wrote and
 * signed off, which is why it needs no per-order review. This section is not,
 * and that is a real cost: it puts unreviewed prose in front of a paying
 * customer unless something else catches a bad one.
 *
 * So the model is not trusted, it is fenced. Three fences, in order of how
 * much they matter:
 *
 *  1. IT CANNOT INTRODUCE FACTS. Every claim it makes must cite a fact id from
 *     a list this code computed. Any proper noun it uses that is not in the
 *     allowed set is a rejection. A synthesis that mentions a planet the buyer
 *     does not have, or a star that is not in their chart, would contradict
 *     the workings table on the last page - which is the one thing that must
 *     never happen, because the workings table is the reason to trust us.
 *
 *  2. IT CANNOT PREDICT OR DIAGNOSE. Health, death, pregnancy, money, legal
 *     outcomes and dated events are checked for and rejected. This is a
 *     reflective reading, and the difference between that and a forecast is
 *     the difference between a product and a liability.
 *
 *  3. IT IS GENERATED ONCE. The result is keyed to the chart fingerprint and
 *     stored by the caller. A buyer who is re-sent their report gets the same
 *     words. A report that changed between readings would not be a report.
 *
 * If validation fails twice, the section is OMITTED and the rest of the report
 * ships without it. That is the whole safety story: the failure mode is a
 * slightly shorter report, never a wrong one.
 * ---------------------------------------------------------------------------
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ChartFact } from "./facts.ts";

export const SYNTHESIS_PROMPT_VERSION = "star-origin.lifetime.v1" as const;
export const SYNTHESIS_MODEL = "claude-opus-5" as const;

const SynthesisSchema = z.object({
  opening: z
    .string()
    .describe("One sentence: how this star line actually lands in THIS chart specifically."),
  paragraphs: z
    .array(z.string())
    .describe("Three or four paragraphs. Each one must turn on a named placement or aspect."),
  tension: z
    .string()
    .describe("The place where the star inheritance and the rest of the chart pull against each other."),
  citedFactIds: z
    .array(z.string())
    .describe("Every fact id used above. Must be ids from the supplied list, verbatim."),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;

const SYSTEM = `You write one section of a fixed-star astrology report. The report has already been written; your section goes at the end and does one job the rest cannot: it says how this person's star inheritance actually plays out in their particular chart.

VOICE
Write with conviction. "This is what you carry", never "you might consider whether". Second person. Warm, direct, unhurried. You are not hedging and you are not selling.
Do not be generic. A sentence that would be true of anybody is a failed sentence — every paragraph must turn on a specific placement or aspect that you name.
No bullet points, no headings, no lists. Continuous prose.

THE ONE HARD RULE
You may only use facts from the CHART FACTS list given to you. You may not introduce a placement, an aspect, a star, a sign, a house or a degree that is not in that list. If you want to say something and the fact is not there, say something else. Every fact you lean on goes in citedFactIds, using the id exactly as given.

NEVER
- Predict an event, or say when anything will happen.
- Say anything about health, illness, death, pregnancy, fertility, money, income, legal matters, or safety.
- Mention other astrologers, other methods, other readings, or this being a reading.
- Refer to the reader's family members as though you know them.
- Use the words "energy", "vibration", "frequency", "manifest", "alignment", "journey" or "soul contract".

LENGTH
opening: one sentence. paragraphs: three or four, each 60–110 words. tension: two or three sentences.`;

/**
 * Phrases that must not appear. Checked after generation, not just asked for.
 *
 * These are deliberately narrow. The first version matched any "will" followed
 * by a verb, and it rejected a perfectly good sentence — "the results will
 * arrive on a timescale that has embarrassed you" is not a prediction, it is a
 * plain description of how someone's life has gone. A validator that fires on
 * good output does not fail safe: it silently deletes the section from reports
 * that deserved to keep it, and because the failure mode is a missing section
 * rather than an error, nobody ever finds out. So the event rule now requires
 * a personal subject and an event-shaped verb, which is what the real risk
 * actually looks like.
 */
const FORBIDDEN = [
  /\byou(?:'ll| will) (?:meet|marry|find someone|lose|inherit|receive|be given|become)\b/i,
  /\b(?:this|that|it) will (?:happen|occur|come to pass|change) (?:in|within|by|on)\b/i,
  /\b(?:cancer|illness|disease|diagnos|depression|anxiety disorder|medication)\b/i,
  /\b(?:pregnan|fertility|conceive|miscarr)\b/i,
  /\b(?:die|death|dying|fatal|lifespan)\b/i,
  /\b(?:invest|salary|income|wealth|debt|lawsuit|lawyer|court)\b/i,
  /\b(?:in|within|over the next) \d+ (?:days|weeks|months|years)\b/i,
  /\b(?:20\d\d)\b/,
  /\b(?:vibration|frequency|manifest|soul contract)\b/i,
];

export interface SynthesisRejection {
  reason: string;
  detail: string;
}

/**
 * Check a synthesis against the facts it was given.
 *
 * Runs with no network and no model, so it is cheap, deterministic, and
 * testable on hand-written bad input - which is the only way to know a
 * validator works.
 */
export function validateSynthesis(
  synthesis: Synthesis,
  facts: readonly ChartFact[],
  allowedNames: ReadonlySet<string>,
): SynthesisRejection[] {
  const rejections: SynthesisRejection[] = [];
  const factIds = new Set(facts.map((f) => f.id));
  const prose = [synthesis.opening, ...synthesis.paragraphs, synthesis.tension].join("\n\n");

  if (synthesis.paragraphs.length < 3 || synthesis.paragraphs.length > 4) {
    rejections.push({
      reason: "length",
      detail: `expected 3 or 4 paragraphs, got ${synthesis.paragraphs.length}`,
    });
  }

  for (const id of synthesis.citedFactIds) {
    if (!factIds.has(id)) {
      rejections.push({ reason: "invented fact", detail: `cited ${id}, which is not in this chart` });
    }
  }
  if (synthesis.citedFactIds.length < 3) {
    rejections.push({
      reason: "too generic",
      detail: `only ${synthesis.citedFactIds.length} facts cited; this would read as horoscope filler`,
    });
  }

  for (const pattern of FORBIDDEN) {
    const hit = prose.match(pattern);
    if (hit) rejections.push({ reason: "forbidden topic", detail: `matched "${hit[0]}"` });
  }

  // Any capitalised word that looks like an astrological proper noun and is
  // not in the allowed set. Catches a star or planet the chart does not have.
  const CAPITALISED = /\b[A-Z][a-z]{2,}\b/g;
  const KNOWN_ORDINARY = new Set([
    "The", "This", "That", "There", "These", "Those", "You", "Your", "Yours",
    "What", "When", "Where", "Which", "While", "Who", "Whose", "Why", "How",
    "And", "But", "For", "Not", "Nor", "Yet", "One", "Two", "Three", "Four",
    "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Every", "Each", "Some",
    "Most", "Much", "Many", "Nobody", "Nothing", "Something", "Someone",
    "Anyone", "Anything", "Because", "Before", "After", "Since", "Until",
    "Both", "Neither", "Either", "Once", "Only", "Even", "Still", "Then",
    "Their", "They", "Them", "Its", "His", "Her", "Hers", "Ours", "Was",
    "Were", "Have", "Has", "Had", "Been", "Being", "Are", "Its", "But",
  ]);
  for (const match of prose.matchAll(CAPITALISED)) {
    const word = match[0];
    if (KNOWN_ORDINARY.has(word)) continue;
    if (allowedNames.has(word)) continue;
    // Mid-sentence only: a capital after a full stop is just a sentence start.
    const before = prose.slice(Math.max(0, match.index - 2), match.index);
    if (/^[.!?]\s$/.test(before) || match.index === 0) continue;
    rejections.push({ reason: "unknown name", detail: `used "${word}", which is not in this chart` });
  }

  return rejections;
}

export interface SynthesisRequest {
  lineageName: string;
  /** The lineage write-up the buyer has already read, so this does not repeat it. */
  lineageSummary: string;
  /** The star contacts, already stated in plain language. */
  starContacts: readonly string[];
  facts: readonly ChartFact[];
  allowedNames: ReadonlySet<string>;
}

export interface SynthesisResult {
  synthesis: Synthesis;
  model: string;
  promptVersion: string;
  attempts: number;
  usage: { inputTokens: number; outputTokens: number };
}

function buildUserMessage(req: SynthesisRequest): string {
  return [
    `STAR LINE: ${req.lineageName}`,
    "",
    "WHAT THE READER HAS ALREADY BEEN TOLD (do not repeat it — build on it):",
    req.lineageSummary,
    "",
    "THEIR STAR CONTACTS:",
    ...req.starContacts.map((s) => `- ${s}`),
    "",
    "CHART FACTS — the only facts you may use. Cite by id.",
    ...req.facts.map((f) => `- [${f.id}] ${f.statement}`),
    "",
    "Write the section. Say how this line actually lands in this particular chart, and where the chart argues with it.",
  ].join("\n");
}

/**
 * Generate the section, or return null and let the report ship without it.
 *
 * Two attempts. The second is told exactly what was wrong with the first,
 * which fixes almost every rejection - they are usually a single invented
 * name rather than a wholesale misunderstanding. After that it gives up on
 * purpose: a report that is one section shorter is a fine outcome, and a
 * retry loop against a model that keeps failing the same check is not.
 */
export async function generateSynthesis(
  req: SynthesisRequest,
  opts: { client?: Anthropic; maxAttempts?: number } = {},
): Promise<{ result: SynthesisResult | null; rejections: SynthesisRejection[] }> {
  const client = opts.client ?? new Anthropic();
  const maxAttempts = opts.maxAttempts ?? 2;

  let lastRejections: SynthesisRejection[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const correction =
      lastRejections.length > 0
        ? `\n\nYour previous attempt was rejected:\n${lastRejections
            .map((r) => `- ${r.reason}: ${r.detail}`)
            .join("\n")}\nFix these exactly. Do not change anything else.`
        : "";

    const response = await client.messages.parse({
      model: SYNTHESIS_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(SynthesisSchema),
      },
      messages: [{ role: "user", content: buildUserMessage(req) + correction }],
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    // Safety classifiers can decline; check before reading content.
    if (response.stop_reason === "refusal") {
      lastRejections = [
        { reason: "refused", detail: response.stop_details?.explanation ?? "no explanation given" },
      ];
      continue;
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      lastRejections = [{ reason: "unparseable", detail: "the model did not return the required shape" }];
      continue;
    }

    const rejections = validateSynthesis(parsed, req.facts, req.allowedNames);
    if (rejections.length === 0) {
      return {
        result: {
          synthesis: parsed,
          model: SYNTHESIS_MODEL,
          promptVersion: SYNTHESIS_PROMPT_VERSION,
          attempts: attempt,
          usage: { inputTokens, outputTokens },
        },
        rejections: [],
      };
    }
    lastRejections = rejections;
  }

  // Deliberate: the report ships one section shorter rather than wrong.
  return { result: null, rejections: lastRejections };
}
