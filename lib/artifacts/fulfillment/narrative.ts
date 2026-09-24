import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import {
  ANCHOR_REPORT_SECTION_IDS,
  AnchorPrintContractError,
  type AnchorCalculation,
  type AnchorNarrative,
  type AnchorNarrativeSection,
  type AnchorReportSectionId,
} from "../anchor-print/contract.ts";
import { buildAnchorNarrativeFacts } from "../anchor-print/production.ts";

export const ANCHOR_NARRATIVE_MODEL = "claude-sonnet-4-6" as const;
export const ANCHOR_NARRATIVE_PROMPT_VERSION = "natal-report.production.v1" as const;

const SectionSchema = z.object({
  id: z.enum(ANCHOR_REPORT_SECTION_IDS),
  eyebrow: z.string().min(3).max(50),
  title: z.string().min(8).max(90),
  summary: z.string().min(90).max(300),
  paragraphs: z.array(z.string().min(260).max(1_250)).length(2),
  keyPoints: z.array(z.string().min(30).max(220)).length(3),
  sourceFactIds: z.array(z.string().min(1)).min(1),
});

const NarrativeDraftSchema = z.object({
  openingLetter: z.array(z.string().min(220).max(1_200)).length(2),
  sections: z.array(SectionSchema).length(ANCHOR_REPORT_SECTION_IDS.length),
  reflectionPrompts: z.array(z.string().min(30).max(260)).length(8),
});

type NarrativeDraft = z.infer<typeof NarrativeDraftSchema>;

const SECTION_BRIEF: Record<AnchorReportSectionId, string> = {
  chart_signature: "Synthesize the chart's strongest element, modality, polarity, placement, and aspect patterns without flattening contradictions.",
  identity_and_vitality: "Interpret the Sun as identity, vitality, authorship, and conscious direction.",
  emotional_world: "Interpret the Moon only to the degree permitted by its certainty; never manufacture Moon precision.",
  rising_and_chart_ruler: "When time is known, interpret the Ascendant and its traditional ruler. When unknown, explain the boundary and use only stable facts.",
  mind_and_communication: "Interpret Mercury, its sign, house when available, retrograde state, and relevant aspects.",
  love_and_values: "Interpret Venus as values, receptivity, attraction, pleasure, and relating style.",
  desire_and_action: "Interpret Mars as desire, assertion, action, conflict, and protective instinct.",
  growth_and_opportunity: "Interpret Jupiter as growth, meaning, confidence, and opportunity without promising outcomes.",
  responsibility_and_maturity: "Interpret Saturn as structure, consequence, time, boundaries, and earned authority.",
  generational_currents: "Interpret Uranus, Neptune, and Pluto as generational context made personal only through supplied houses and aspects.",
  major_aspects: "Explain the most structurally important supplied aspects as relationships between chart functions.",
  relationship_patterns: "Synthesize relationship needs and tensions from supplied Venus, Moon certainty, Mars, angles, and aspects without diagnosing attachment.",
  work_and_calling: "Reflect on vocation and contribution from supplied Saturn, Sun, Midheaven and houses when available; never promise a career outcome.",
  integration_and_practice: "Bring the chart together into a grounded, repeatable practice that supports agency rather than prediction.",
};

const SYSTEM = `You write a premium, personalized natal astrology report for Kairos.

VOICE
Warm, grounded, psychologically literate, mystical-but-practical, and specific. Write in second person. Treat astrology as a reflective map, never a verdict. Contradictions are meaningful tensions, not defects. Avoid generic horoscope language, inflated spiritual claims, and hustle language.

FACT FENCE
Use only the supplied CHART FACTS. Never invent or alter a sign, degree, house, angle, aspect, orb, retrograde, element pattern, modality pattern, polarity pattern, chart ruler, or Moon certainty. Every section must list every fact id it relies on in sourceFactIds. When birth time is unknown, do not interpret houses, Ascendant, Midheaven, chart ruler, exact Moon degree, or Moon aspects.

SAFETY
Do not predict events or timing. Do not guarantee love, wealth, career, healing, pregnancy, health, legal, or spiritual outcomes. Do not diagnose mental health, attachment style, trauma, illness, or personality disorders. Do not claim access to family history or private experiences. Never tell the reader to surrender authority to astrology.

DEPTH AND SHAPE
Return exactly fourteen sections, one for every required id. Each section has a concise eyebrow, an inviting title, a specific summary, exactly two developed paragraphs, exactly three practical anchors, and grounded citations. Each paragraph must materially interpret this chart; avoid repetition across chapters. Return exactly two opening-letter paragraphs and eight substantive reflection questions.

STYLE
Plain prose only inside fields. No markdown, headings, bullets, zodiac glyphs, or emoji. Do not mention the prompt, model, AI, tokens, source facts, validation, or generation process.`;

function buildPrompt(calculation: AnchorCalculation, timeUnknown: boolean, correction: string): string {
  const facts = buildAnchorNarrativeFacts(calculation, timeUnknown);
  return [
    `BIRTH-TIME STATUS: ${timeUnknown ? "unknown" : "known"}`,
    "",
    "CHART FACTS — the only factual claims you may use:",
    ...facts.map((fact) => `- [${fact.id}] ${fact.statement}`),
    "",
    "REQUIRED CHAPTERS:",
    ...ANCHOR_REPORT_SECTION_IDS.map((id) => `- ${id}: ${SECTION_BRIEF[id]}`),
    "",
    "The opening letter should explain how to read the report with curiosity and agency, then identify the chart's central tensions using supplied facts.",
    "Reflection prompts must arise from the supplied chart and invite observation or practice rather than prediction.",
    correction,
  ].join("\n");
}

function orderAndValidateDraft(
  draft: NarrativeDraft,
  calculation: AnchorCalculation,
  timeUnknown: boolean,
): readonly AnchorNarrativeSection[] {
  const facts = buildAnchorNarrativeFacts(calculation, timeUnknown);
  const allowedFacts = new Set(facts.map((fact) => fact.id));
  const byId = new Map<AnchorReportSectionId, AnchorNarrativeSection>();
  for (const section of draft.sections) {
    if (byId.has(section.id)) {
      throw new AnchorPrintContractError(`duplicate narrative section: ${section.id}`);
    }
    for (const factId of section.sourceFactIds) {
      if (!allowedFacts.has(factId)) {
        throw new AnchorPrintContractError(`${section.id} cites unavailable fact: ${factId}`);
      }
    }
    byId.set(section.id, section);
  }
  return ANCHOR_REPORT_SECTION_IDS.map((id) => {
    const section = byId.get(id);
    if (!section) throw new AnchorPrintContractError(`missing narrative section: ${id}`);
    return section;
  });
}

export async function generateProductionAnchorNarrative(
  calculation: AnchorCalculation,
  timeUnknown: boolean,
): Promise<AnchorNarrative> {
  let correction = "";
  let lastError = "The model did not return a valid report.";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await generateObject({
        model: anthropic(ANCHOR_NARRATIVE_MODEL),
        schema: NarrativeDraftSchema,
        system: SYSTEM,
        prompt: buildPrompt(calculation, timeUnknown, correction),
      });
      const sections = orderAndValidateDraft(response.object, calculation, timeUnknown);
      const inputTokens = response.usage.inputTokens ?? 0;
      const outputTokens = response.usage.outputTokens ?? 0;
      return {
        generationMethod: "ai_assisted_human_reviewed",
        model: ANCHOR_NARRATIVE_MODEL,
        promptVersion: ANCHOR_NARRATIVE_PROMPT_VERSION,
        tokenUsage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        openingLetter: response.object.openingLetter,
        sections,
        reflectionPrompts: response.object.reflectionPrompts,
      };
    } catch (error) {
      lastError = NoObjectGeneratedError.isInstance(error)
        ? "The model response did not match the required report structure."
        : error instanceof Error
          ? error.message
          : "The report could not be validated.";
      correction = `\nYour prior attempt was rejected: ${lastError}\nReturn a corrected complete report. Do not omit any chapter.`;
    }
  }

  throw new AnchorPrintContractError(`Personalized narrative generation failed closed: ${lastError}`);
}
