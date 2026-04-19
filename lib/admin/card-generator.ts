import "server-only";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import type {
  AdminSource,
  DraftCardOutput,
  AdminApiResponse,
} from "@/types/admin";

const CARD_SYSTEM_PROMPT = `You are an expert astrology content curator. Your task is to extract actionable astrology interpretation patterns from transcript content and structure them as reusable cards.

Output ONLY a JSON array of card objects. Each object must match this schema:
{
  "category": one of "rising_sign" | "house" | "planet" | "transit_timing" | "planner_translation" | "general_framework",
  "title": string — short, descriptive (max 80 chars),
  "summary": string — 1-2 sentences describing the pattern,
  "usable_copy": string — polished, ready-to-use copy for user-facing content,
  "source_quotes": string[] — direct quotes from the source that support this card,
  "structured_data": object — relevant structured metadata (e.g. { planet: "Saturn", sign: "Pisces", house: 12 }),
  "confidence_score": number between 0.0 and 1.0,
  "tags": string[] — relevant tags (e.g. ["saturn", "pisces", "12th-house"])
}

Rules:
- Extract 3–10 cards per transcript. Quality over quantity.
- Only extract patterns that are actionable and interpretation-focused.
- Do not fabricate content not present in the transcript.
- Avoid clichéd astrology language.
- Keep the interpretation spacious and suggestive rather than absolute or prescriptive.
- Avoid rigid words like "exact" or "concrete" when describing growth, timing, or self-understanding.
- Output ONLY the JSON array. No markdown fences, no commentary.`;

export async function generateDraftCards(
  cleanedContent: string,
  sourceMeta: Pick<AdminSource, "source_name" | "astrologer_name" | "trust_level">
): Promise<AdminApiResponse<DraftCardOutput[]>> {
  const model = process.env.VERCEL
    ? gateway("anthropic/claude-sonnet-4-6")
    : anthropic("claude-sonnet-4-6");

  const userPrompt = `Source: ${sourceMeta.source_name}${
    sourceMeta.astrologer_name ? ` by ${sourceMeta.astrologer_name}` : ""
  }
Trust level: ${sourceMeta.trust_level}

TRANSCRIPT CONTENT:
${cleanedContent.slice(0, 40000)}`;

  try {
    const { text } = await generateText({
      model,
      system: CARD_SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 8000,
      temperature: 0.3,
    });

    // Strip markdown code fences if present
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const parsed: unknown = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: "AI output was not a JSON array",
      };
    }

    // Validate array items have required fields
    const validated = parsed.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "category" in item &&
        "title" in item &&
        "summary" in item &&
        "usable_copy" in item &&
        "structured_data" in item &&
        "confidence_score" in item
    );

    if (!validated) {
      return {
        success: false,
        error: "AI output cards missing required fields",
      };
    }

    return { success: true, data: parsed as DraftCardOutput[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Card generation failed: ${message}`,
    };
  }
}
