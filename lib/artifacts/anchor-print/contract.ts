import type { AspectType, Planet, ZodiacSign } from "../../../types/blueprint.ts";

export const ANCHOR_PRINT_SCHEMA_VERSION = "kairos.natal-report.v2" as const;
export const ANCHOR_PRINT_TEMPLATE_VERSION = "natal-report.obsidian-almanac.v2" as const;
export const ANCHOR_PRINT_SKU = "KAI-ETSY-ANCHOR-V1" as const;
export const ANCHOR_PRINT_PRICE_USD = 34 as const;
export const ANCHOR_PRODUCT_NAME = "Personal Natal Astrology Report + Anchor Print" as const;

export const ANCHOR_RETENTION_POLICY = {
  rawPersonalizationDaysAfterClosure: 30,
  normalizedCalculationDaysAfterClosure: 180,
  generatedFileDaysAfterClosure: 180,
  supportCorrespondenceDaysAfterClosure: 365,
  minimalBirthDataFreeOrderLedgerYears: 7,
  eligibleDeletionRequestTargetDays: 30,
  legalRetentionOverrideRequiresReview: true,
} as const;

export const ANCHOR_SERVICE_POLICY = {
  deliveryBusinessDaysAfterCompleteInput: 3,
  clarificationPausesDeliveryClock: true,
  kairosCorrectionBusinessDays: 2,
  defectReportWindowDays: 14,
  cancellationAllowedBeforeGeneration: true,
  changedInputsAfterGenerationAreNewPersonalization: true,
  selfPurchaseOnlyAtLaunch: true,
  giftingEnabledAtLaunch: false,
} as const;

export const ANCHOR_PLANETS: readonly Planet[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export const ANCHOR_NON_MOON_PLANETS = ANCHOR_PLANETS.filter(
  (planet): planet is Exclude<Planet, "Moon"> => planet !== "Moon",
);

export const ANCHOR_REPORT_SECTION_IDS = [
  "chart_signature",
  "identity_and_vitality",
  "emotional_world",
  "rising_and_chart_ruler",
  "mind_and_communication",
  "love_and_values",
  "desire_and_action",
  "growth_and_opportunity",
  "responsibility_and_maturity",
  "generational_currents",
  "major_aspects",
  "relationship_patterns",
  "work_and_calling",
  "integration_and_practice",
] as const;

export type AnchorReportSectionId = (typeof ANCHOR_REPORT_SECTION_IDS)[number];
export type AnchorPaperSize = "letter" | "a4";
export type AnchorDocumentKind = "report" | "anchor_print";

export interface AnchorNormalizedBirth {
  date: string;
  time: string | null;
  timeUnknown: boolean;
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface AnchorPlanetPlacement {
  planet: Exclude<Planet, "Moon">;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  house: number | null;
  retrograde: boolean;
}

export interface AnchorExactMoon {
  kind: "exact";
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  house: number;
}

export interface AnchorDateStableMoon {
  kind: "date_stable";
  sign: ZodiacSign;
  degreeRange: readonly [number, number];
}

export interface AnchorUncertainMoon {
  kind: "sign_uncertain";
  possibleSigns: readonly [ZodiacSign, ZodiacSign];
}

export type AnchorMoonPlacement =
  | AnchorExactMoon
  | AnchorDateStableMoon
  | AnchorUncertainMoon;

export interface AnchorAngles {
  ascendantLongitude: number | null;
  ascendantSign: ZodiacSign | null;
  midheavenLongitude: number | null;
  midheavenSign: ZodiacSign | null;
}

export interface AnchorAspect {
  first: Planet;
  second: Planet;
  type: AspectType;
  orb: number;
}

export interface AnchorCalculationProvenance {
  zodiac: "tropical";
  houseSystem: "whole_sign";
  calculationVersion: string;
  ephemerisProvider: string;
  ephemerisVersion: string;
  timezoneProvenance: string;
  chartFingerprint: string;
}

export interface AnchorCalculation {
  placements: readonly AnchorPlanetPlacement[];
  moon: AnchorMoonPlacement;
  angles: AnchorAngles;
  aspects: readonly AnchorAspect[];
  provenance: AnchorCalculationProvenance;
}

export interface AnchorNarrativeSection {
  id: AnchorReportSectionId;
  eyebrow: string;
  title: string;
  summary: string;
  paragraphs: readonly [string, string];
  keyPoints: readonly [string, string, string];
  sourceFactIds: readonly string[];
}

export interface AnchorNarrativeTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AnchorNarrative {
  generationMethod: "human" | "ai_assisted_human_reviewed";
  model: string | null;
  promptVersion: string;
  tokenUsage: AnchorNarrativeTokenUsage | null;
  openingLetter: readonly [string, string];
  sections: readonly AnchorNarrativeSection[];
  reflectionPrompts: readonly [string, string, string, string, string, string, string, string];
}

export interface AnchorPrintInput {
  artifactId: string;
  displayName: string | null;
  normalizedBirth: AnchorNormalizedBirth;
  calculation: AnchorCalculation;
  narrative: AnchorNarrative;
}

export interface AnchorPlacementRow {
  planet: Planet;
  position: string;
  house: string | null;
  retrograde: boolean;
  certainty: "exact" | "date_stable" | "sign_uncertain";
}

export interface AnchorAspectRow {
  label: string;
  orb: string;
  sourceFactId: string;
}

export interface AnchorReferencePage {
  title: string;
  subtitle: string;
  chartDescription: string;
  placements: readonly AnchorPlacementRow[];
  aspects: readonly AnchorAspectRow[];
  methodNote: string;
  uncertaintyNote: string | null;
}

export interface AnchorPatternEntry {
  label: string;
  count: number;
}

export interface AnchorPatternSummary {
  elements: readonly AnchorPatternEntry[];
  modalities: readonly AnchorPatternEntry[];
  polarities: readonly AnchorPatternEntry[];
  houseEmphasis: readonly AnchorPatternEntry[];
  caveat: string | null;
}

export interface AnchorReportDocument {
  kind: "report";
  title: string;
  subtitle: string;
  pageCount: 26;
  openingLetter: readonly [string, string];
  reference: AnchorReferencePage;
  patterns: AnchorPatternSummary;
  sections: readonly AnchorNarrativeSection[];
  reflectionPrompts: AnchorNarrative["reflectionPrompts"];
  scopeNote: string;
}

export interface AnchorKeepsakeItem {
  label: string;
  title: string;
  text: string;
}

export interface AnchorKeepsakeDocument {
  kind: "anchor_print";
  title: string;
  subtitle: string;
  items: readonly [
    AnchorKeepsakeItem,
    AnchorKeepsakeItem,
    AnchorKeepsakeItem,
    AnchorKeepsakeItem,
    AnchorKeepsakeItem,
    AnchorKeepsakeItem,
  ];
  uncertaintyNote: string | null;
  scopeNote: string;
}

export interface AnchorFileVariant {
  documentKind: AnchorDocumentKind;
  paperSize: AnchorPaperSize;
  fileName: string;
  pageWidthMm: number;
  pageHeightMm: number;
  maximumBytes: number;
}

export interface AnchorPrintArtifact {
  schemaVersion: typeof ANCHOR_PRINT_SCHEMA_VERSION;
  templateVersion: typeof ANCHOR_PRINT_TEMPLATE_VERSION;
  artifactId: string;
  product: {
    name: typeof ANCHOR_PRODUCT_NAME;
    sku: typeof ANCHOR_PRINT_SKU;
    priceUsd: typeof ANCHOR_PRINT_PRICE_USD;
  };
  retentionPolicy: typeof ANCHOR_RETENTION_POLICY;
  servicePolicy: typeof ANCHOR_SERVICE_POLICY;
  displayName: string | null;
  privateArtifact: true;
  workflow: {
    status: "draft";
    revision: 1;
    humanReviewRequired: true;
    deliveryReady: false;
    generatedFileChecksum: null;
    deliveredAt: null;
  };
  birthLabel: string;
  timeKnown: boolean;
  calculation: AnchorCalculation;
  narrativeProvenance: Pick<
    AnchorNarrative,
    "generationMethod" | "model" | "promptVersion" | "tokenUsage"
  >;
  factIds: readonly string[];
  report: AnchorReportDocument;
  anchorPrint: AnchorKeepsakeDocument;
  files: readonly [AnchorFileVariant, AnchorFileVariant, AnchorFileVariant, AnchorFileVariant];
  accessibility: {
    minimumBodyPointSize: 11;
    minimumTextContrast: 4.5;
    selectableTextRequired: true;
    taggedReadingOrderRequired: true;
    documentLanguageRequired: true;
    chartTextEquivalentRequired: true;
    colorOnlyMeaningForbidden: true;
    targetStandard: "PDF/UA-1-compatible";
    publicConformanceClaimAllowed: false;
  };
  fulfillmentBoundary: {
    createsKairosAccount: false;
    createsProductEntitlement: false;
    subscribesToMarketing: false;
    requiresOffMarketplacePurchase: false;
  };
}

export class AnchorPrintContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnchorPrintContractError";
  }
}
