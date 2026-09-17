import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import {
  YEAR_AHEAD_LIFE_SECTION_IDS,
  YearAheadContractError,
  type YearAheadCalculation,
  type YearAheadLifeSectionId,
  type YearAheadNarrative,
} from "./contract.ts";

export const YEAR_AHEAD_NARRATIVE_MODEL = "claude-sonnet-4-6" as const;
export const YEAR_AHEAD_NARRATIVE_PROMPT_VERSION = "year-ahead.production.v1" as const;

const SourceIds = z.array(z.string().min(1)).min(1);
const Block = z.object({
  title: z.string().min(8).max(90),
  summary: z.string().min(100).max(340),
  paragraphs: z.tuple([
    z.string().min(300).max(1_350),
    z.string().min(300).max(1_350),
  ]),
  anchors: z.tuple([
    z.string().min(35).max(240),
    z.string().min(35).max(240),
    z.string().min(35).max(240),
  ]),
  sourceFactIds: SourceIds,
});

const DraftSchema = z.object({
  openingLetter: z.tuple([
    z.string().min(240).max(1_250),
    z.string().min(240).max(1_250),
  ]),
  annualTheme: Block,
  activationWindows: z.tuple([
    Block.extend({ windowId: z.literal("activation.1"), invitation: z.string().min(60).max(320) }),
    Block.extend({ windowId: z.literal("activation.2"), invitation: z.string().min(60).max(320) }),
    Block.extend({ windowId: z.literal("activation.3"), invitation: z.string().min(60).max(320) }),
  ]),
  lifeAreas: z.tuple([
    Block.extend({ id: z.literal("relationships") }),
    Block.extend({ id: z.literal("work_and_resources") }),
    Block.extend({ id: z.literal("home_and_belonging") }),
    Block.extend({ id: z.literal("inner_growth") }),
  ]),
  quarters: z.tuple([
    quarterSchema(1), quarterSchema(2), quarterSchema(3), quarterSchema(4),
  ]),
  reflectionPrompts: z.tuple([
    z.string().min(35).max(280), z.string().min(35).max(280),
    z.string().min(35).max(280), z.string().min(35).max(280),
    z.string().min(35).max(280), z.string().min(35).max(280),
    z.string().min(35).max(280), z.string().min(35).max(280),
  ]),
});

function quarterSchema(quarter: 1 | 2 | 3 | 4) {
  return z.object({
    quarter: z.literal(quarter),
    title: z.string().min(8).max(80),
    summary: z.string().min(90).max(300),
    paragraph: z.string().min(300).max(1_350),
    practices: z.tuple([z.string().min(35).max(220), z.string().min(35).max(220)]),
    sourceFactIds: SourceIds,
  });
}

const LIFE_BRIEFS: Record<YearAheadLifeSectionId, string> = {
  relationships: "Synthesize partnership, collaboration, boundaries, receptivity, and relational timing without predicting a relationship event.",
  work_and_resources: "Synthesize vocation, visible contribution, capacity, money themes, and responsible timing without promising career or financial outcomes.",
  home_and_belonging: "Synthesize home, family, community, roots, privacy, and belonging without inventing family circumstances.",
  inner_growth: "Synthesize identity, meaning, creativity, restoration, and the inner practice that can hold the year without diagnosing or claiming healing.",
};

const SYSTEM = `You write a premium birthday-to-birthday astrology forecast for Kairos.

VOICE
Warm, grounded, psychologically literate, mystical-but-practical, and specific. Write in second person. Astrology is a reflective timing map, never a verdict. A difficult transit is a terrain requiring care, not a punishment; a supportive transit is an opening, not a guarantee.

FACT FENCE
Use only the supplied CALCULATION FACTS. Never invent or alter a date, planet, sign, degree, house, angle, aspect, orb, annual profection, Lord of the Year, or activation window. Every interpretive block must cite every fact id it uses. Do not introduce eclipses, lunations, progressions, synastry, numerology, Human Design, fixed stars, or other techniques that are not supplied.

TIMING DISCIPLINE
The three activation windows are the report's primary timing hierarchy. Explain the whole date range and the closest date without claiming an event will occur. The solar return describes annual atmosphere; natal promise and profection provide context. Do not treat a single exact date as a deadline.

SAFETY
Do not guarantee love, money, career, pregnancy, health, legal, spiritual, or other outcomes. Do not diagnose mental health, trauma, attachment, illness, or personality disorders. Do not imply access to private history. Never tell the reader to surrender authority to astrology.

DEPTH
Return every required field. Each long block must contain two genuinely developed, non-repetitive paragraphs and three practical anchors. Each quarter needs one developed paragraph and two grounded practices. Write eight substantive reflection questions. Make the interpretation specific enough that every major claim can be traced to a supplied fact.

STYLE
Plain prose inside fields. No markdown, headings, bullets, emoji, zodiac glyphs, model references, or discussion of prompts, tokens, source facts, validation, or generation.`;

function prompt(calculation: YearAheadCalculation, correction: string): string {
  return [
    `FORECAST SPAN: ${calculation.forecastStart} through ${calculation.forecastEnd}`,
    "",
    "CALCULATION FACTS — the only factual claims you may use:",
    ...calculation.facts.map((fact) => `- [${fact.id}] ${fact.statement}`),
    "",
    "REQUIRED LIFE-AREA CHAPTERS:",
    ...YEAR_AHEAD_LIFE_SECTION_IDS.map((id) => `- ${id}: ${LIFE_BRIEFS[id]}`),
    "",
    "REQUIRED QUARTER RANGES:",
    ...calculation.quarters.map((quarter) =>
      `- Quarter ${quarter.quarter}: ${quarter.startDate} through ${quarter.endDate}; selected windows: ${quarter.activationIds.join(", ") || "none"}.`,
    ),
    "",
    "Annual Theme should prioritize profection.year, solar_return.angles, and the solar-return placement of the Lord of the Year.",
    "Each activation-window block must cite its matching activation fact id.",
    "Quarter chapters may describe pacing and integration; cite only facts that actually support the statements.",
    correction,
  ].join("\n");
}

function validateSources(draft: z.infer<typeof DraftSchema>, calculation: YearAheadCalculation): void {
  const allowed = new Set(calculation.facts.map((fact) => fact.id));
  const blocks = [draft.annualTheme, ...draft.activationWindows, ...draft.lifeAreas, ...draft.quarters];
  for (const block of blocks) {
    for (const source of block.sourceFactIds) {
      if (!allowed.has(source)) throw new YearAheadContractError(`Narrative cites unavailable fact: ${source}.`);
    }
  }
  draft.activationWindows.forEach((block, index) => {
    const required = `activation.${index + 1}`;
    if (!block.sourceFactIds.includes(required)) {
      throw new YearAheadContractError(`${required} narrative must cite ${required}.`);
    }
  });
}

export async function generateYearAheadNarrative(
  calculation: YearAheadCalculation,
): Promise<YearAheadNarrative> {
  let correction = "";
  let lastError = "The model did not return a valid forecast.";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await generateObject({
        model: anthropic(YEAR_AHEAD_NARRATIVE_MODEL),
        schema: DraftSchema,
        system: SYSTEM,
        prompt: prompt(calculation, correction),
      });
      validateSources(response.object, calculation);
      const inputTokens = response.usage.inputTokens ?? 0;
      const outputTokens = response.usage.outputTokens ?? 0;
      return {
        ...response.object,
        generationMethod: "ai_assisted_human_reviewed",
        model: YEAR_AHEAD_NARRATIVE_MODEL,
        promptVersion: YEAR_AHEAD_NARRATIVE_PROMPT_VERSION,
        tokenUsage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      };
    } catch (error) {
      lastError = NoObjectGeneratedError.isInstance(error)
        ? "The model response did not match the required forecast structure."
        : error instanceof Error ? error.message : "The forecast could not be validated.";
      correction = `\nThe prior attempt was rejected: ${lastError}\nReturn a corrected, complete forecast.`;
    }
  }
  throw new YearAheadContractError(`Year Ahead narrative generation failed closed: ${lastError}`);
}
