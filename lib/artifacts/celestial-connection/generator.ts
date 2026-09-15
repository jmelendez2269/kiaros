import {
  CONNECTION_DOMAIN_SECTION_IDS, CONNECTION_MAP_PRINT_SIZES,
  CELESTIAL_CONNECTION_SCHEMA_VERSION, CELESTIAL_CONNECTION_TEMPLATE_VERSION,
  CelestialConnectionContractError,
  type CelestialConnectionArtifact, type CelestialConnectionCalculation,
  type CelestialConnectionFileVariant, type CelestialConnectionInput,
  type CelestialConnectionNarrative, type CelestialConnectionPaperSize, type ConnectionMapPrintSize,
} from "./contract.ts";

const MAXIMUM_FILE_BYTES = 10 * 1024 * 1024;
const PAGE_DIMENSIONS: Record<CelestialConnectionPaperSize | ConnectionMapPrintSize, readonly [number, number]> = {
  letter: [215.9, 279.4], a4: [210, 297], "8x10": [203.2, 254], "11x14": [279.4, 355.6],
  "16x20": [406.4, 508], a3: [297, 420],
};
function fail(message: string): never { throw new CelestialConnectionContractError(message); }
function validateCalculation(calculation: CelestialConnectionCalculation): void {
  if (!/^sha256:[a-f0-9]{64}$/.test(calculation.provenance.chartFingerprint)) fail("Celestial Connection calculation needs a valid chart fingerprint.");
  if (calculation.signatures.length !== 3) fail("Exactly three relationship signatures are required.");
  calculation.signatures.forEach((item, index) => {
    if (item.rank !== index + 1 || item.id !== `signature.${index + 1}` || item.orb < 0) fail("Relationship signatures must be valid and ordered 1–3.");
  });
  if (calculation.compositePlacements.length < 8) fail("The composite chart is incomplete.");
}
function validateNarrative(narrative: CelestialConnectionNarrative | null, calculation: CelestialConnectionCalculation): void {
  if (!narrative) return;
  if (narrative.signatures.length !== 3 || narrative.domains.length !== 5 || narrative.reflectionPrompts.length !== 8) fail("The relationship narrative is incomplete.");
  if (narrative.domains.some((section, index) => section.id !== CONNECTION_DOMAIN_SECTION_IDS[index])) fail("Relationship chapters are out of order.");
  const allowed = new Set(calculation.facts.map((fact) => fact.id));
  const blocks = [narrative.relationshipEssence, ...narrative.signatures, ...narrative.domains, narrative.compositeCore];
  for (const block of blocks) if (!block.sourceFactIds.length || block.sourceFactIds.some((id) => !allowed.has(id))) fail("Every narrative block must cite available calculation facts.");
  narrative.signatures.forEach((block, index) => { if (block.signatureId !== `signature.${index + 1}` || !block.sourceFactIds.includes(block.signatureId)) fail("Each Top 3 chapter must cite its matching signature."); });
}
function variant(artifactId: string, documentKind: CelestialConnectionFileVariant["documentKind"], size: CelestialConnectionFileVariant["size"]): CelestialConnectionFileVariant {
  const [pageWidthMm, pageHeightMm] = PAGE_DIMENSIONS[size];
  return { documentKind, size, fileName: `${artifactId}_${documentKind === "report" ? "celestial-connection-report" : "celestial-connection-map"}_${size}.pdf`, pageWidthMm, pageHeightMm, maximumBytes: MAXIMUM_FILE_BYTES };
}
export function generateCelestialConnectionArtifact({ input, calculation, narrative }: { input: CelestialConnectionInput; calculation: CelestialConnectionCalculation; narrative: CelestialConnectionNarrative | null }): CelestialConnectionArtifact {
  validateCalculation(calculation); validateNarrative(narrative, calculation);
  return {
    schemaVersion: CELESTIAL_CONNECTION_SCHEMA_VERSION, templateVersion: CELESTIAL_CONNECTION_TEMPLATE_VERSION,
    artifactId: input.artifactId, privateArtifact: true, input, calculation, narrative,
    files: [variant(input.artifactId, "report", "letter"), variant(input.artifactId, "report", "a4"), ...CONNECTION_MAP_PRINT_SIZES.map((size) => variant(input.artifactId, "connection_map", size))],
    scopeNote: "Reflective relationship astrology for personal use—not a diagnosis, compatibility verdict, prediction, or substitute for communication, consent, safety, or professional advice. The purchase includes personalized PDF files only and does not include a Kairos account, subscription, activation, or off-marketplace purchase.",
    accessibility: { minimumBodyPointSize: 11, minimumTextContrast: 4.5, selectableTextRequired: true, colorOnlyMeaningForbidden: true, publicConformanceClaimAllowed: false },
    fulfillmentBoundary: { createsKairosAccount: false, createsProductEntitlement: false, subscribesToMarketing: false, requiresOffMarketplacePurchase: false },
  };
}
export function assertConnectionReportDeliverable(artifact: CelestialConnectionArtifact): void {
  validateCalculation(artifact.calculation); validateNarrative(artifact.narrative, artifact.calculation);
  if (!artifact.narrative) fail("Generate and review the relationship interpretation before report export.");
}
export function assertConnectionMapDeliverable(artifact: CelestialConnectionArtifact): void { validateCalculation(artifact.calculation); }
