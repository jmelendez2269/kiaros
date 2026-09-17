import type { AspectType, Planet, ZodiacSign } from "../../../types/blueprint.ts";

export const CELESTIAL_CONNECTION_SCHEMA_VERSION = "kairos.celestial-connection.v1" as const;
export const CELESTIAL_CONNECTION_TEMPLATE_VERSION = "celestial-connection.double-orbit.v1" as const;
export const CELESTIAL_CONNECTION_PRODUCTS = {
  relationship_report: { label: "Celestial Connection Relationship Report", sku: "KAI-ETSY-CELESTIAL-CONNECTION-REPORT-V1" },
  connection_map: { label: "Celestial Connection Map", sku: "KAI-ETSY-CELESTIAL-CONNECTION-MAP-V1" },
} as const;
export type CelestialConnectionProductKey = keyof typeof CELESTIAL_CONNECTION_PRODUCTS;
export type CelestialConnectionPaperSize = "letter" | "a4";
export const CONNECTION_MAP_PRINT_SIZES = ["8x10", "11x14", "16x20", "a4", "a3"] as const;
export type ConnectionMapPrintSize = (typeof CONNECTION_MAP_PRINT_SIZES)[number];
export const CONNECTION_RELATIONSHIP_TYPES = ["romantic", "friendship", "family", "creative_partnership"] as const;
export type ConnectionRelationshipType = (typeof CONNECTION_RELATIONSHIP_TYPES)[number];
export const CONNECTION_RELATIONSHIP_LABELS: Record<ConnectionRelationshipType, string> = {
  romantic: "Romantic partnership", friendship: "Friendship", family: "Family relationship",
  creative_partnership: "Creative or business partnership",
};
export const CELESTIAL_CONNECTION_QA_ITEM_IDS = [
  "birth_data", "time_precision", "synastry_aspects", "composite_chart",
  "narrative", "layout", "disclosures", "accessibility",
] as const;
export type CelestialConnectionQaItemId = (typeof CELESTIAL_CONNECTION_QA_ITEM_IDS)[number];
export const CELESTIAL_CONNECTION_QA_LABELS: Record<CelestialConnectionQaItemId, string> = {
  birth_data: "Both names, dates, times or unknown-time choices, and birth places checked",
  time_precision: "Unknown-time limits and any omitted Moon, angle, or house claims checked",
  synastry_aspects: "Top three aspect pairs, aspect types, orbs, and overlays checked",
  composite_chart: "Composite midpoint placements and labels checked",
  narrative: "Interpretation is specific, balanced, non-diagnostic, and free of outcome promises",
  layout: "Purchased file set reviewed at its intended print sizes",
  disclosures: "Reflective-use, AI-assistance, privacy, and uncertainty disclosures present",
  accessibility: "Reading order, contrast, text equivalents, and non-color cues checked",
};
export interface ConnectionBirthPlace { city: string; country: string; timezone: string; latitude: number; longitude: number; }
export interface ConnectionPersonInput { displayName: string; date: string; time: string | null; timeUnknown: boolean; place: ConnectionBirthPlace; }
export interface CelestialConnectionInput { artifactId: string; relationshipType: ConnectionRelationshipType; personA: ConnectionPersonInput; personB: ConnectionPersonInput; }
export type ConnectionPointName = Planet | "Ascendant" | "Midheaven" | "NorthNode";
export type CompositePointName = Planet | "NorthNode" | "Ascendant" | "Midheaven";
export interface ConnectionPlacement { point: ConnectionPointName; longitude: number; sign: ZodiacSign; degree: number; house: number | null; timeSensitive: boolean; }
export type ConnectionTone = "flowing" | "growth_edge" | "blended";
export type ConnectionDomain =
  | "identity" | "emotional_rhythm" | "communication" | "affection_and_values"
  | "desire_and_momentum" | "growth_and_meaning" | "commitment_and_structure"
  | "freedom_and_change" | "imagination_and_sensitivity" | "depth_and_transformation";
export interface ConnectionSignature {
  id: "signature.1" | "signature.2" | "signature.3"; rank: 1 | 2 | 3; title: string;
  personAPoint: ConnectionPointName; personBPoint: ConnectionPointName; aspect: AspectType;
  angle: number; orb: number; tone: ConnectionTone; domain: ConnectionDomain;
  personAInPersonBHouse: number | null; personBInPersonAHouse: number | null; score: number;
}
export interface CompositePlacement { point: CompositePointName; longitude: number; sign: ZodiacSign; degree: number; }
export interface CelestialConnectionFact { id: string; statement: string; }
export interface CelestialConnectionCalculation {
  personAPlacements: readonly ConnectionPlacement[]; personBPlacements: readonly ConnectionPlacement[];
  signatures: readonly [ConnectionSignature, ConnectionSignature, ConnectionSignature];
  supportingAspects: readonly Omit<ConnectionSignature, "id" | "rank">[];
  compositePlacements: readonly CompositePlacement[];
  precision: { personATimeKnown: boolean; personBTimeKnown: boolean; housesAvailable: boolean; moonAspectsAvailable: boolean; note: string; };
  facts: readonly CelestialConnectionFact[];
  provenance: {
    zodiac: "tropical"; houseSystem: "whole_sign"; compositeMethod: "short_arc_midpoint";
    calculationVersion: typeof CELESTIAL_CONNECTION_SCHEMA_VERSION;
    ephemerisProvider: "astronomia"; ephemerisVersion: "4.2.0"; chartFingerprint: string;
  };
}
export const CONNECTION_DOMAIN_SECTION_IDS = ["emotional_rhythm", "communication", "affection_and_values", "friction_and_repair", "shared_growth"] as const;
export type ConnectionDomainSectionId = (typeof CONNECTION_DOMAIN_SECTION_IDS)[number];
export interface ConnectionNarrativeBlock { title: string; summary: string; paragraphs: readonly [string, string]; anchors: readonly [string, string, string]; sourceFactIds: readonly string[]; }
export interface ConnectionSignatureNarrative extends ConnectionNarrativeBlock { signatureId: ConnectionSignature["id"]; repairPractice: string; }
export interface ConnectionDomainNarrative extends ConnectionNarrativeBlock { id: ConnectionDomainSectionId; }
export interface CelestialConnectionNarrative {
  generationMethod: "ai_assisted_human_reviewed"; model: string; promptVersion: string;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  openingLetter: readonly [string, string]; relationshipEssence: ConnectionNarrativeBlock;
  signatures: readonly [ConnectionSignatureNarrative, ConnectionSignatureNarrative, ConnectionSignatureNarrative];
  domains: readonly [ConnectionDomainNarrative, ConnectionDomainNarrative, ConnectionDomainNarrative, ConnectionDomainNarrative, ConnectionDomainNarrative];
  compositeCore: ConnectionNarrativeBlock;
  reflectionPrompts: readonly [string, string, string, string, string, string, string, string];
}
export interface CelestialConnectionFileVariant {
  documentKind: "report" | "connection_map"; size: CelestialConnectionPaperSize | ConnectionMapPrintSize;
  fileName: string; pageWidthMm: number; pageHeightMm: number; maximumBytes: number;
}
export interface CelestialConnectionArtifact {
  schemaVersion: typeof CELESTIAL_CONNECTION_SCHEMA_VERSION; templateVersion: typeof CELESTIAL_CONNECTION_TEMPLATE_VERSION;
  artifactId: string; privateArtifact: true; input: CelestialConnectionInput;
  calculation: CelestialConnectionCalculation; narrative: CelestialConnectionNarrative | null;
  files: readonly CelestialConnectionFileVariant[]; scopeNote: string;
  accessibility: { minimumBodyPointSize: 11; minimumTextContrast: 4.5; selectableTextRequired: true; colorOnlyMeaningForbidden: true; publicConformanceClaimAllowed: false; };
  fulfillmentBoundary: { createsKairosAccount: false; createsProductEntitlement: false; subscribesToMarketing: false; requiresOffMarketplacePurchase: false; };
}
export class CelestialConnectionContractError extends Error {
  constructor(message: string) { super(message); this.name = "CelestialConnectionContractError"; }
}
