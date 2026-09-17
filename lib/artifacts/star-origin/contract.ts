/**
 * contract.ts
 *
 * The shapes a Star Origin report is allowed to have, and the checks that stop
 * a malformed one reaching a buyer.
 *
 * Modelled on anchor-print's contract, with one structural difference that
 * matters commercially.
 *
 * Anchor-print takes its narrative as INPUT: written per order, by a person or
 * by a model with a person reviewing it. Star Origin does not. Its prose is
 * composed from content files that were written once and signed off once - 12
 * lineage meanings, 48 star meanings, 11 marker voices, and the framings. The
 * generator only selects and orders them.
 *
 * So a Star Origin report needs no per-order review of its writing, because
 * there is no per-order writing. What still needs checking per order is the
 * birth data and the chart, which is a much smaller job. That is the whole
 * reason this product can scale at ten hours a week and anchor-print cannot.
 */

import type { ZodiacSign } from "../../../types/blueprint.ts";

export const STAR_ORIGIN_SCHEMA_VERSION = "kairos.star-origin.v2" as const;
export const STAR_ORIGIN_TEMPLATE_VERSION = "star-origin.plate.v2" as const;

export const STAR_FAMILY_CHART_PRINT_SIZES = [
  "8x10",
  "11x14",
  "16x20",
  "a4",
  "a3",
] as const;

export const STAR_ORIGIN_QA_ITEM_IDS = [
  "calculation",
  "product_scope",
  "layout",
  "accessibility",
  "privacy_metadata",
] as const;

export type StarOriginQaItemId = (typeof STAR_ORIGIN_QA_ITEM_IDS)[number];

export const STAR_ORIGIN_QA_LABELS: Record<StarOriginQaItemId, string> = {
  calculation: "Top-three fixed-star contacts and birth details checked",
  product_scope: "Preview and exports match the purchased Etsy product",
  layout: "Every promised print size reviewed for clipping and legibility",
  accessibility: "Labels, reading order, contrast, and non-color cues checked",
  privacy_metadata: "Filename and buyer-visible metadata contain no private internals",
};
export type StarFamilyChartPrintSize =
  (typeof STAR_FAMILY_CHART_PRINT_SIZES)[number];

/**
 * Prices are NOT set here. Open decisions 5 and 6 in the spec are Jack's and
 * are still open; hard-coding a guess would put a number in the contract that
 * nobody chose. The SKU carries the tier, and price lives with the SKU.
 */
export const STAR_ORIGIN_TIERS = ["mini", "standard", "extended", "print"] as const;
export type StarOriginTier = (typeof STAR_ORIGIN_TIERS)[number];

/**
 * Which tiers may state an origin at all.
 *
 * Mini exists to solve the unknown-birth-time problem honestly: without a
 * birth time the chart loses the Ascendant and the Midheaven, many charts fall
 * to `spread`, and a promise of a lineage could not be kept. Mini never makes
 * the promise, so the buyer self-selects and nothing is oversold. See spec 7.3.
 */
export const TIERS_THAT_MAY_NAME_A_LINEAGE: ReadonlySet<StarOriginTier> = new Set([
  "standard",
  "extended",
  "print",
]);

export const TIERS_REQUIRING_BIRTH_TIME: ReadonlySet<StarOriginTier> = new Set([
  "standard",
  "extended",
  "print",
]);

/**
 * Layer 2 - the goddess placements and named signatures - is gated on the
 * asteroid positions (k9) and is not built. Extended and Print cannot be sold
 * until it is, and this is the machine-readable statement of that so nobody
 * discovers it at checkout.
 */
export const TIERS_REQUIRING_LAYER_2: ReadonlySet<StarOriginTier> = new Set([
  "extended",
  "print",
]);

export const STAR_ORIGIN_SECTION_IDS = [
  "how_to_read_this",
  "where_you_resonate",
  "the_twelve_families",
  "your_strongest_markers",
  "what_you_carry",
  "named_signatures",
  "this_lifetime",
  "living_with_it",
  "the_workings",
] as const;

export type StarOriginSectionId = (typeof STAR_ORIGIN_SECTION_IDS)[number];

/**
 * The only section written per buyer rather than composed from signed-off
 * files. Its presence is what makes a report need a human before it ships.
 */
export const REVIEWED_SECTIONS: ReadonlySet<StarOriginSectionId> = new Set([
  "this_lifetime",
]);

/** Layer 2 sections. Omitted entirely until k9 lands. */
export const LAYER_2_SECTIONS: ReadonlySet<StarOriginSectionId> = new Set([
  "what_you_carry",
  "named_signatures",
]);

/** A lineage claim only appears in these; Mini omits both. */
export const LINEAGE_SECTIONS: ReadonlySet<StarOriginSectionId> = new Set([
  "where_you_resonate",
  "the_twelve_families",
]);

export type StarOriginPaperSize = "letter" | "a4";

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export interface StarOriginNormalizedBirth {
  date: string;
  time: string | null;
  timeUnknown: boolean;
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface StarPoint {
  starId: string;
  displayName: string;
  /** null for the objects that are reported but never rank - see lineages.ts. */
  lineageId: string | null;
  /** Drift applied for the birth year. Stars move ~1 degree per 72 years. */
  longitudeAtBirthEpoch: number;
  sign: ZodiacSign;
  degree: number;
}

/**
 * One star meeting one point of the chart.
 *
 * `mayNameLineage` is recorded rather than recomputed at render time. The
 * Midheaven scores higher than any other marker and is barred from naming a
 * lineage; if the template worked that out for itself it could disagree with
 * the engine, and the copy would quietly reverse a decision the engine
 * enforces.
 */
export interface StarContact {
  /** Narrative sentences point here. */
  contactId: string;
  marker: string;
  markerLongitude: number;
  star: StarPoint;
  orb: number;
  /** Which band of closeness the prose used. */
  band: "exact" | "close" | "within_range";
  mayNameLineage: boolean;
}

export interface LineageScore {
  lineageId: string;
  displayName: string;
  subStrands: readonly string[];
  /** Internal only. Never shown, never compared across lineages. */
  rawPoints: number;
  /** Where this sits among charts that have this lineage at all, 0-100. */
  standing: number;
  contributingContactIds: readonly string[];
}

/** One row of the map: how near this chart came to a line it may not carry. */
export interface LineageProximityRow {
  lineageId: string;
  displayName: string;
  essence: string;
  orb: number;
  nearestStar: string;
  nearestMarker: string;
  isYourLine: boolean;
}

export type StarOriginResult =
  | { kind: "single"; primary: LineageScore; decidedBy: "contact" | "ranked" }
  | { kind: "paired"; primary: LineageScore; secondary: LineageScore }
  | { kind: "spread" };

export interface StarOriginProvenance {
  zodiac: "tropical";
  houseSystem: "whole_sign";
  calculationVersion: string;
  ephemerisProvider: string;
  ephemerisVersion: string;
  timezoneProvenance: string;
  chartFingerprint: string;
  /** The catalogue the star positions came from. */
  starCatalogVersion: string;
  /**
   * The baseline is data. Change the points, the orbs or the star list and it
   * is void. Recording it here is what stops a report and a baseline that
   * never belonged together from shipping as a pair.
   */
  baselineVersion: string;
  /** Every orb that was actually applied, because they differ by section. */
  scoringOrb: number;
  notableOrb: number;
  findingsOrb: number;
}

export interface StarOriginChartMarker {
  markerId: string;
  displayName: string;
  abbreviation: string;
  longitude: number;
  kind: "planet" | "angle" | "node";
}

export interface StarOriginChartHighlight {
  rank: 1 | 2 | 3;
  role: "primary_line" | "co_primary_line" | "supporting_resonance";
  lineageId: string;
  displayName: string;
  starId: string;
  starName: string;
  starLongitude: number;
  markerId: string;
  markerName: string;
  markerLongitude: number;
  orb: number;
}

export interface StarOriginChartPrint {
  risingSign: ZodiacSign | null;
  markers: readonly StarOriginChartMarker[];
  highlights: readonly StarOriginChartHighlight[];
}

export interface StarOriginCalculation {
  contacts: readonly StarContact[];
  lineages: readonly LineageScore[];
  result: StarOriginResult;
  map: readonly LineageProximityRow[];
  chartPrint: StarOriginChartPrint;
  provenance: StarOriginProvenance;
}

// ---------------------------------------------------------------------------
// Narrative - composed, not written per order
// ---------------------------------------------------------------------------

export interface StarOriginNarrativeSection {
  id: StarOriginSectionId;
  title: string;
  /** Printed under the title. May be empty. */
  subtitle: string;
  paragraphs: readonly string[];
  /**
   * Which contacts produced this section. Empty for sections that make no
   * claim about the chart, such as how_to_read_this.
   */
  sourceContactIds: readonly string[];
}

export interface StarOriginNarrative {
  /**
   * Always "composed". The value exists so that a future hand-written or
   * AI-assisted variant cannot be mistaken for this one in an audit.
   */
  generationMethod: "composed";
  /** The content files this was assembled from. */
  contentVersion: string;
  sections: readonly StarOriginNarrativeSection[];
}

export interface StarOriginInput {
  artifactId: string;
  displayName: string | null;
  tier: StarOriginTier;
  normalizedBirth: StarOriginNormalizedBirth;
  calculation: StarOriginCalculation;
  narrative: StarOriginNarrative;
}

export interface WorkingsTableRow {
  star: string;
  constellation: string;
  marker: string;
  starPosition: string;
  markerPosition: string;
  separation: string;
  /** "named the line", "a marking", or empty. */
  tag: string;
}

export interface StarOriginFileVariant {
  paperSize: StarOriginPaperSize;
  fileName: string;
}

export interface StarFamilyChartPrintFileVariant {
  printSize: StarFamilyChartPrintSize;
  fileName: string;
}

export interface StarOriginArtifact {
  schemaVersion: typeof STAR_ORIGIN_SCHEMA_VERSION;
  templateVersion: typeof STAR_ORIGIN_TEMPLATE_VERSION;
  artifactId: string;
  tier: StarOriginTier;
  displayName: string | null;
  normalizedBirth: StarOriginNormalizedBirth;
  /**
   * What was actually found, in structured form.
   *
   * The sections carry the prose; this carries the answer. Fulfilment needs it
   * to know what was sold, support needs it to answer "what did I get", and
   * anything that renders a cover needs it without re-parsing paragraphs.
   */
  result: StarOriginResult;
  provenance: StarOriginProvenance;
  narrativeProvenance: { generationMethod: "composed"; contentVersion: string };
  /**
   * Present only when the report carries a per-buyer section. Its absence is
   * the machine-readable statement that nothing here was model-written.
   */
  synthesisProvenance: SynthesisProvenance | null;
  review: NarrativeReview;
  sections: readonly StarOriginNarrativeSection[];
  workings: readonly WorkingsTableRow[];
  map: readonly LineageProximityRow[];
  chartPrint: StarOriginChartPrint;
  files: readonly StarOriginFileVariant[];
  chartPrintFiles: readonly StarFamilyChartPrintFileVariant[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Where a report's per-buyer writing stands with a human.
 *
 * `pending` is the state a freshly generated report is in and it is not
 * deliverable. There is no way to reach `approved` except by someone saying
 * so, which is the entire point.
 */
export type ReviewState = "not_required" | "pending" | "approved" | "rejected";

export interface NarrativeReview {
  state: ReviewState;
  /** Who approved it. Required to be non-empty when state is approved. */
  reviewer: string | null;
  reviewedAt: string | null;
  /** Why it was sent back. Useful for tuning the prompt against real failures. */
  note: string | null;
}

export const UNREVIEWED: NarrativeReview = {
  state: "pending",
  reviewer: null,
  reviewedAt: null,
  note: null,
};

export const NO_REVIEW_NEEDED: NarrativeReview = {
  state: "not_required",
  reviewer: null,
  reviewedAt: null,
  note: null,
};

/** Recorded on any report carrying a per-buyer section, for the audit trail. */
export interface SynthesisProvenance {
  model: string;
  promptVersion: string;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
}

export class StarOriginContractError extends Error {}

function fail(message: string): never {
  throw new StarOriginContractError(message);
}

function assertNonEmpty(value: string, label: string, maximumLength = 200): void {
  if (value.trim().length === 0) fail(`${label} is required`);
  if (value.length > maximumLength) fail(`${label} exceeds ${maximumLength} characters`);
}

function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail("birth date must use YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`birth date is not a real date: ${value}`);
  }
}

/**
 * The checks that matter, in the order a bad report would fail them.
 *
 * Every one of these exists because breaking it would put something untrue in
 * front of a buyer, not because it would crash.
 */
export function validateStarOriginInput(input: StarOriginInput): void {
  assertNonEmpty(input.artifactId, "artifact id", 64);
  if (input.displayName !== null) assertNonEmpty(input.displayName, "display name", 80);
  if (!STAR_ORIGIN_TIERS.includes(input.tier)) fail(`unknown tier: ${input.tier}`);

  const birth = input.normalizedBirth;
  assertIsoDate(birth.date);
  assertNonEmpty(birth.timezone, "timezone", 64);
  if (birth.timeUnknown !== (birth.time === null)) {
    fail("birth time and timeUnknown disagree");
  }

  // A tier that promises a lineage cannot be run without a birth time. The
  // Ascendant is the heaviest marker there is and it is simply absent.
  if (TIERS_REQUIRING_BIRTH_TIME.has(input.tier) && birth.timeUnknown) {
    fail(`the ${input.tier} tier requires a birth time - sell Mini instead`);
  }

  if (TIERS_REQUIRING_LAYER_2.has(input.tier)) {
    fail(`the ${input.tier} tier needs Layer 2, which is not built yet (k9)`);
  }

  // Mini makes no origin claim, so it must not carry one anywhere.
  const { result } = input.calculation;
  if (!TIERS_THAT_MAY_NAME_A_LINEAGE.has(input.tier) && result.kind !== "spread") {
    fail("the mini tier must not carry a lineage result");
  }
  if (!TIERS_THAT_MAY_NAME_A_LINEAGE.has(input.tier)) {
    for (const section of input.narrative.sections) {
      if (LINEAGE_SECTIONS.has(section.id)) {
        fail(`the mini tier must not include the ${section.id} section`);
      }
    }
  }

  // A lineage may only be named by a contact the engine accepted as notable.
  // Without this the prose could credit the Midheaven, which is barred.
  if (result.kind !== "spread") {
    const named = result.kind === "single" ? [result.primary] : [result.primary, result.secondary];
    const byId = new Map(input.calculation.contacts.map((c) => [c.contactId, c]));
    for (const lineage of named) {
      const eligible = lineage.contributingContactIds
        .map((id) => byId.get(id))
        .filter((c): c is StarContact => c !== undefined)
        .some((c) => c.mayNameLineage);
      if (!eligible) {
        fail(`${lineage.lineageId} was named with no contact that is allowed to name it`);
      }
    }
  }

  const provenance = input.calculation.provenance;
  assertNonEmpty(provenance.starCatalogVersion, "star catalogue version", 64);
  assertNonEmpty(provenance.baselineVersion, "baseline version", 64);
  assertNonEmpty(provenance.chartFingerprint, "chart fingerprint", 128);
  if (!(provenance.notableOrb <= provenance.scoringOrb)) {
    fail("the notable orb must be no wider than the scoring orb");
  }
  if (!(provenance.findingsOrb >= provenance.scoringOrb)) {
    fail("the findings orb must be no tighter than the scoring orb");
  }

  // A contact may be reported inside the findings orb and no wider. If one is,
  // the workings table and the prose are describing different skies.
  for (const contact of input.calculation.contacts) {
    if (contact.orb > provenance.findingsOrb) {
      fail(`contact ${contact.contactId} is outside the findings orb it was found with`);
    }
    if (contact.mayNameLineage && contact.orb > provenance.notableOrb) {
      fail(`contact ${contact.contactId} claims it may name a lineage from outside the notable orb`);
    }
  }

  const chartPrint = input.calculation.chartPrint;
  const markerIds = new Set<string>();
  for (const marker of chartPrint.markers) {
    assertNonEmpty(marker.markerId, "chart marker id", 40);
    assertNonEmpty(marker.displayName, "chart marker name", 40);
    assertNonEmpty(marker.abbreviation, "chart marker abbreviation", 5);
    if (markerIds.has(marker.markerId)) {
      fail("duplicate chart marker: " + marker.markerId);
    }
    markerIds.add(marker.markerId);
    assertLongitude(marker.longitude, marker.markerId + " longitude");
  }
  const expectedHighlightCount = TIERS_THAT_MAY_NAME_A_LINEAGE.has(input.tier) ? 3 : 0;
  if (chartPrint.highlights.length !== expectedHighlightCount) {
    fail(
      "chart print requires " +
        expectedHighlightCount +
        " highlighted resonances for the " +
        input.tier +
        " tier",
    );
  }
  for (const [index, highlight] of chartPrint.highlights.entries()) {
    if (highlight.rank !== index + 1) fail("chart print highlight ranks must be 1, 2, 3");
    if (!markerIds.has(highlight.markerId)) {
      fail("chart print highlight references a missing marker: " + highlight.markerId);
    }
    assertLongitude(highlight.starLongitude, highlight.starName + " longitude");
    assertLongitude(highlight.markerLongitude, highlight.markerName + " longitude");
    if (
      Math.abs(
        angularSeparation(highlight.starLongitude, highlight.markerLongitude) -
          highlight.orb,
      ) > 0.02
    ) {
      fail("chart print highlight orb does not match its recorded longitudes");
    }
  }

  // The report promises three findings. If it cannot keep that, it must not
  // ship silently - the orb rule in findings.ts exists to make this unreachable.
  const written = input.narrative.sections.find((s) => s.id === "your_strongest_markers");
  if (!written) fail("every report must include your_strongest_markers");

  // Sections must be known, unique, and never Layer 2 while Layer 2 is unbuilt.
  const seen = new Set<StarOriginSectionId>();
  for (const section of input.narrative.sections) {
    if (!STAR_ORIGIN_SECTION_IDS.includes(section.id)) {
      fail(`unsupported section: ${section.id}`);
    }
    if (seen.has(section.id)) fail(`duplicate section: ${section.id}`);
    if (LAYER_2_SECTIONS.has(section.id)) {
      fail(`${section.id} belongs to Layer 2, which is not built yet`);
    }
    seen.add(section.id);
    assertNonEmpty(section.title, `title for ${section.id}`);
    if (section.paragraphs.length === 0) fail(`${section.id} has no text`);
    for (const p of section.paragraphs) {
      if (p.trim().length === 0) fail(`${section.id} contains an empty paragraph`);
      if (p.includes("undefined") || p.includes("[object")) {
        fail(`${section.id} contains an unresolved value`);
      }
    }
  }

  // Every sentence has to trace to a contact that exists.
  const contactIds = new Set(input.calculation.contacts.map((c) => c.contactId));
  for (const section of input.narrative.sections) {
    for (const id of section.sourceContactIds) {
      if (!contactIds.has(id)) fail(`${section.id} cites a contact that is not in the chart: ${id}`);
    }
  }
}

/**
 * The last gate before a buyer sees anything.
 *
 * Every other check in this file runs at generation time, which is the right
 * place for them - they are about whether the report is well formed. This one
 * is different: it runs at DELIVERY time, because a report can be perfectly
 * well formed and still not be something a person has looked at yet.
 *
 * It exists as a function rather than a convention because "remember to check
 * the review state before sending" is not a control. The fulfilment layer
 * calls this immediately before it hands over a file, and anything that has
 * not been through a human throws.
 *
 * The asymmetry is deliberate and it is what protects the economics. A report
 * with no per-buyer section is composed entirely from files that were written
 * once and signed off once, so it needs no review and returns immediately.
 * Only the reports carrying a synthesis cost anybody time.
 */
export function assertDeliverable(artifact: StarOriginArtifact): void {
  const perBuyer = artifact.sections.filter((s) => REVIEWED_SECTIONS.has(s.id));

  if (perBuyer.length === 0) {
    if (artifact.synthesisProvenance !== null) {
      fail("a report with no per-buyer section must not claim synthesis provenance");
    }
    if (artifact.review.state !== "not_required") {
      fail(
        `a fully composed report needs no review, but its state is "${artifact.review.state}" — ` +
          "something generated a synthesis and then dropped the section",
      );
    }
    return;
  }

  if (artifact.synthesisProvenance === null) {
    fail("a report carrying a per-buyer section must record which model wrote it");
  }

  switch (artifact.review.state) {
    case "approved":
      if (!artifact.review.reviewer || artifact.review.reviewer.trim().length === 0) {
        fail("approved, but by nobody — an approval needs a name against it");
      }
      if (!artifact.review.reviewedAt) fail("approved, but with no timestamp");
      return;
    case "pending":
      fail("this report has model-written prose that nobody has read yet");
    case "rejected":
      fail(`this report was rejected in review${artifact.review.note ? `: ${artifact.review.note}` : ""}`);
    case "not_required":
      fail("a report carrying model-written prose cannot be marked as needing no review");
  }
}

function assertLongitude(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value >= 360) {
    fail(label + " must be a finite tropical longitude from 0 to under 360");
  }
}

function angularSeparation(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return difference > 180 ? 360 - difference : difference;
}

/**
 * Approve a report for delivery.
 *
 * Takes a reviewer name and will not accept an empty one. Deliberately the
 * only route to `approved` — the state is not settable from a plain object
 * literal anywhere in the fulfilment path.
 */
export function approveReport(
  artifact: StarOriginArtifact,
  reviewer: string,
  now: Date = new Date(),
): StarOriginArtifact {
  if (!reviewer || reviewer.trim().length === 0) {
    fail("an approval needs a reviewer name");
  }
  return {
    ...artifact,
    review: {
      state: "approved",
      reviewer: reviewer.trim(),
      reviewedAt: now.toISOString(),
      note: null,
    },
  };
}

export function rejectReport(
  artifact: StarOriginArtifact,
  reviewer: string,
  note: string,
  now: Date = new Date(),
): StarOriginArtifact {
  if (!reviewer || reviewer.trim().length === 0) fail("a rejection needs a reviewer name");
  if (!note || note.trim().length === 0) {
    fail("a rejection needs a reason — it is the only record of what the model got wrong");
  }
  return {
    ...artifact,
    review: {
      state: "rejected",
      reviewer: reviewer.trim(),
      reviewedAt: now.toISOString(),
      note: note.trim(),
    },
  };
}
