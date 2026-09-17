import {
  CELESTIAL_YEAR_MAP_PRINT_SIZES,
  YEAR_AHEAD_LIFE_SECTION_IDS,
  YEAR_AHEAD_SCHEMA_VERSION,
  YEAR_AHEAD_TEMPLATE_VERSION,
  YearAheadContractError,
  type CelestialYearMapPrintSize,
  type YearAheadArtifact,
  type YearAheadCalculation,
  type YearAheadFileVariant,
  type YearAheadInput,
  type YearAheadNarrative,
  type YearAheadPaperSize,
} from "./contract.ts";

const MAXIMUM_FILE_BYTES = 10 * 1024 * 1024;

const PAGE_DIMENSIONS: Record<YearAheadPaperSize | CelestialYearMapPrintSize, readonly [number, number]> = {
  letter: [215.9, 279.4],
  a4: [210, 297],
  "8x10": [203.2, 254],
  "11x14": [279.4, 355.6],
  "16x20": [406.4, 508],
  a3: [297, 420],
};

function fail(message: string): never {
  throw new YearAheadContractError(message);
}

function validateCalculation(calculation: YearAheadCalculation): void {
  if (!/^sha256:[a-f0-9]{64}$/.test(calculation.provenance.chartFingerprint)) {
    fail("Year Ahead calculation needs a valid chart fingerprint.");
  }
  if (calculation.solarReturnSunErrorDegrees > 0.01) {
    fail("Solar-return root is not precise enough for export.");
  }
  if (calculation.activationWindows.length !== 3) fail("Exactly three activation windows are required.");
  calculation.activationWindows.forEach((window, index) => {
    if (window.rank !== index + 1 || window.id !== `activation.${index + 1}`) {
      fail("Activation windows must be ranked and ordered 1–3.");
    }
    if (window.startDate > window.peakDate || window.peakDate > window.endDate) {
      fail(`${window.id} dates are out of order.`);
    }
  });
  if (calculation.quarters.length !== 4) fail("Exactly four forecast quarters are required.");
}

function validateNarrative(narrative: YearAheadNarrative | null, calculation: YearAheadCalculation): void {
  if (!narrative) return;
  if (narrative.activationWindows.length !== 3 || narrative.lifeAreas.length !== 4 || narrative.quarters.length !== 4) {
    fail("The Year Ahead narrative is incomplete.");
  }
  const allowedFacts = new Set(calculation.facts.map((fact) => fact.id));
  const blocks = [narrative.annualTheme, ...narrative.activationWindows, ...narrative.lifeAreas, ...narrative.quarters];
  for (const block of blocks) {
    if (!block.sourceFactIds.length || block.sourceFactIds.some((id) => !allowedFacts.has(id))) {
      fail("Every narrative block must cite available calculation facts.");
    }
  }
  if (narrative.reflectionPrompts.length !== 8) fail("Exactly eight reflection prompts are required.");
  if (narrative.lifeAreas.some((section, index) => section.id !== YEAR_AHEAD_LIFE_SECTION_IDS[index])) {
    fail("Life-area chapters must use the required order.");
  }
}

function variant(
  artifactId: string,
  documentKind: YearAheadFileVariant["documentKind"],
  size: YearAheadFileVariant["size"],
): YearAheadFileVariant {
  const [pageWidthMm, pageHeightMm] = PAGE_DIMENSIONS[size];
  return {
    documentKind,
    size,
    fileName: `${artifactId}_${documentKind === "report" ? "year-ahead-report" : "celestial-year-map"}_${size}.pdf`,
    pageWidthMm,
    pageHeightMm,
    maximumBytes: MAXIMUM_FILE_BYTES,
  };
}

export function generateYearAheadArtifact({
  input,
  calculation,
  narrative,
}: {
  input: YearAheadInput;
  calculation: YearAheadCalculation;
  narrative: YearAheadNarrative | null;
}): YearAheadArtifact {
  validateCalculation(calculation);
  validateNarrative(narrative, calculation);
  return {
    schemaVersion: YEAR_AHEAD_SCHEMA_VERSION,
    templateVersion: YEAR_AHEAD_TEMPLATE_VERSION,
    artifactId: input.artifactId,
    displayName: input.displayName,
    targetBirthdayYear: input.targetBirthdayYear,
    privateArtifact: true,
    input,
    calculation,
    narrative,
    files: [
      variant(input.artifactId, "report", "letter"),
      variant(input.artifactId, "report", "a4"),
      ...CELESTIAL_YEAR_MAP_PRINT_SIZES.map((size) => variant(input.artifactId, "year_map", size)),
    ],
    scopeNote:
      "Reflective astrology for personal use—not medical, mental-health, legal, financial, or other professional advice. Timing windows describe symbolic emphasis, not guaranteed events or deadlines. The purchase includes personalized PDF files only and does not include a Kairos account, subscription, Blueprint, Stelloquy, activation, or off-marketplace purchase.",
    accessibility: {
      minimumBodyPointSize: 11,
      minimumTextContrast: 4.5,
      selectableTextRequired: true,
      colorOnlyMeaningForbidden: true,
      publicConformanceClaimAllowed: false,
    },
    fulfillmentBoundary: {
      createsKairosAccount: false,
      createsProductEntitlement: false,
      subscribesToMarketing: false,
      requiresOffMarketplacePurchase: false,
    },
  };
}

export function assertYearAheadReportDeliverable(artifact: YearAheadArtifact): void {
  validateCalculation(artifact.calculation);
  validateNarrative(artifact.narrative, artifact.calculation);
  if (!artifact.narrative) fail("Generate and review the interpretive narrative before report export.");
}

export function assertYearMapDeliverable(artifact: YearAheadArtifact): void {
  validateCalculation(artifact.calculation);
}
