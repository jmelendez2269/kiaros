import { anthropic } from "@ai-sdk/anthropic";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import {
  CONNECTION_DOMAIN_SECTION_IDS, CelestialConnectionContractError,
  type CelestialConnectionCalculation, type CelestialConnectionInput,
  type CelestialConnectionNarrative, type ConnectionDomainSectionId,
} from "./contract.ts";

export const CONNECTION_NARRATIVE_MODEL = "claude-sonnet-4-6" as const;
export const CONNECTION_NARRATIVE_PROMPT_VERSION = "celestial-connection.production.v1" as const;
const Sources = z.array(z.string().min(1)).min(1);
const Block = z.object({
  title: z.string().min(8).max(90), summary: z.string().min(100).max(340),
  paragraphs: z.tuple([z.string().min(300).max(1_350), z.string().min(300).max(1_350)]),
  anchors: z.tuple([z.string().min(35).max(240), z.string().min(35).max(240), z.string().min(35).max(240)]),
  sourceFactIds: Sources,
});
const DraftSchema = z.object({
  openingLetter: z.tuple([z.string().min(240).max(1_250), z.string().min(240).max(1_250)]),
  relationshipEssence: Block,
  signatures: z.tuple([
    Block.extend({ signatureId: z.literal("signature.1"), repairPractice: z.string().min(60).max(320) }),
    Block.extend({ signatureId: z.literal("signature.2"), repairPractice: z.string().min(60).max(320) }),
    Block.extend({ signatureId: z.literal("signature.3"), repairPractice: z.string().min(60).max(320) }),
  ]),
  domains: z.tuple([
    Block.extend({ id: z.literal("emotional_rhythm") }), Block.extend({ id: z.literal("communication") }),
    Block.extend({ id: z.literal("affection_and_values") }), Block.extend({ id: z.literal("friction_and_repair") }),
    Block.extend({ id: z.literal("shared_growth") }),
  ]),
  compositeCore: Block,
  reflectionPrompts: z.tuple([z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280), z.string().min(35).max(280)]),
});
const DOMAIN_BRIEFS: Record<ConnectionDomainSectionId, string> = {
  emotional_rhythm: "How feelings, reassurance, privacy, and regulation may be experienced without diagnosing attachment or mental health.",
  communication: "How ideas, listening, interpretation, disagreement, and repair may move between the two people.",
  affection_and_values: "How appreciation, pleasure, values, reciprocity, and—only for romantic context—attraction may be expressed.",
  friction_and_repair: "Where pace, power, responsibility, or difference needs care; describe repair practices without labeling either person as harmful.",
  shared_growth: "What the composite center suggests the relationship can practice or create without claiming destiny, permanence, or a guaranteed future.",
};
const SYSTEM = `You write a premium Kairos synastry and composite relationship report.

VOICE
Warm, grounded, balanced, psychologically literate, mystical-but-practical, and specific. Address both people with equal dignity. Astrology is a reflective language for patterns, never a compatibility score or verdict.

FACT FENCE
Use only the supplied CALCULATION FACTS. Never invent or alter a placement, sign, degree, house, angle, aspect, orb, or composite point. Every interpretive block must cite every fact id it uses. Do not introduce transits, progressions, fixed stars, Human Design, numerology, past lives, karmic contracts, or soulmate claims.

RELATIONSHIP DISCIPLINE
Respect the supplied relationship type. Do not romanticize a friendship, family relationship, or creative partnership. Do not assume gender, sexuality, monogamy, relationship duration, living arrangement, conflict history, or private behavior. Describe each aspect as a shared field with choices—not as one person causing the other.

SAFETY
Do not diagnose attachment style, trauma, abuse, narcissism, mental health, sexuality, or personality disorders. Do not guarantee compatibility, marriage, separation, sex, children, healing, money, success, or permanence. Never tell either reader to stay, leave, forgive, surrender authority, or ignore direct evidence and safety.

DEPTH AND STYLE
Return every required field. Each long block needs two genuinely developed, non-repetitive paragraphs and three practical anchors. Write eight substantive reflection questions. Plain prose only: no markdown, bullets, emoji, zodiac glyphs, model references, or discussion of prompts, tokens, source facts, validation, or generation.`;
function prompt(input: CelestialConnectionInput, calculation: CelestialConnectionCalculation, correction: string): string {
  return [
    `RELATIONSHIP TYPE: ${input.relationshipType.replace(/_/g, " ")}`,
    `PEOPLE: ${input.personA.displayName} and ${input.personB.displayName}`,
    "", "CALCULATION FACTS—the only factual claims you may use:",
    ...calculation.facts.map((fact) => `- [${fact.id}] ${fact.statement}`),
    "", "REQUIRED DOMAIN CHAPTERS:", ...CONNECTION_DOMAIN_SECTION_IDS.map((id) => `- ${id}: ${DOMAIN_BRIEFS[id]}`),
    "", "The Relationship Essence should prioritize the three ranked signatures and composite Sun, Moon, Venus, and Saturn when supplied.",
    "Each Top 3 chapter must cite its matching signature id. Honor precision.scope wherever time is unknown.", correction,
  ].join("\n");
}
function validateSources(draft: z.infer<typeof DraftSchema>, calculation: CelestialConnectionCalculation): void {
  const allowed = new Set(calculation.facts.map((fact) => fact.id));
  for (const block of [draft.relationshipEssence, ...draft.signatures, ...draft.domains, draft.compositeCore]) {
    for (const source of block.sourceFactIds) if (!allowed.has(source)) throw new CelestialConnectionContractError(`Narrative cites unavailable fact: ${source}.`);
  }
  draft.signatures.forEach((block, index) => { const required = `signature.${index + 1}`; if (!block.sourceFactIds.includes(required)) throw new CelestialConnectionContractError(`${required} narrative must cite ${required}.`); });
}
export async function generateCelestialConnectionNarrative(input: CelestialConnectionInput, calculation: CelestialConnectionCalculation): Promise<CelestialConnectionNarrative> {
  let correction = ""; let lastError = "The model did not return a valid relationship report.";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await generateText({ model: anthropic(CONNECTION_NARRATIVE_MODEL), output: Output.object({ schema: DraftSchema }), system: SYSTEM, prompt: prompt(input, calculation, correction) });
      validateSources(response.output, calculation);
      const usage = response.totalUsage;
      return { ...response.output, generationMethod: "ai_assisted_human_reviewed", model: CONNECTION_NARRATIVE_MODEL,
        promptVersion: CONNECTION_NARRATIVE_PROMPT_VERSION,
        tokenUsage: { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0, totalTokens: usage.totalTokens ?? 0 } };
    } catch (error) {
      lastError = NoObjectGeneratedError.isInstance(error) ? "The model response did not match the required relationship structure." : error instanceof Error ? error.message : "The relationship report could not be validated.";
      correction = `\nThe prior attempt was rejected: ${lastError}\nReturn a corrected, complete report.`;
    }
  }
  throw new CelestialConnectionContractError(`Celestial Connection narrative generation failed closed: ${lastError}`);
}
