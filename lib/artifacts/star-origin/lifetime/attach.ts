/**
 * attach.ts
 *
 * Puts a generated synthesis onto a report, and puts the review requirement on
 * at the same moment.
 *
 * This is one function rather than two steps on purpose. The dangerous version
 * of this feature is a code path where a report gains model-written prose and
 * the review flag gets set separately — because then there is a version of the
 * code, one refactor away, where the first happens and the second does not.
 * Here they are the same assignment.
 */

import {
  UNREVIEWED,
  type StarOriginArtifact,
  type StarOriginNarrativeSection,
  type SynthesisProvenance,
} from "../contract.ts";
import type { SynthesisResult } from "./synthesis.ts";

export const THIS_LIFETIME_TITLE = "What this means in this lifetime";

/**
 * Attach a synthesis, and mark the report as needing a human.
 *
 * Returns the artifact unchanged when there is no synthesis — a rejected or
 * omitted one is a normal outcome, and the report ships one section shorter
 * with no review needed, exactly as before.
 */
export function attachSynthesis(
  artifact: StarOriginArtifact,
  result: SynthesisResult | null,
): StarOriginArtifact {
  if (!result) return artifact;

  const section: StarOriginNarrativeSection = {
    id: "this_lifetime",
    title: THIS_LIFETIME_TITLE,
    subtitle: "your line, read against the rest of your chart",
    paragraphs: [
      result.synthesis.opening,
      ...result.synthesis.paragraphs,
      result.synthesis.tension,
    ],
    // The synthesis cites chart facts rather than star contacts, and those are
    // a different id space. Its traceability is carried in the provenance
    // below, which records the model, the prompt version, and how many
    // attempts it took.
    sourceContactIds: [],
  };

  const provenance: SynthesisProvenance = {
    model: result.model,
    promptVersion: result.promptVersion,
    attempts: result.attempts,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  };

  // The synthesis goes before "living with it", which is the closing note and
  // has to stay closing.
  const sections = [...artifact.sections];
  const closingAt = sections.findIndex((s) => s.id === "living_with_it");
  if (closingAt === -1) sections.push(section);
  else sections.splice(closingAt, 0, section);

  return {
    ...artifact,
    sections,
    synthesisProvenance: provenance,
    review: UNREVIEWED,
  };
}
