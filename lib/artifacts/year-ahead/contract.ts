import type { AspectType, Planet, ZodiacSign } from "../../../types/blueprint.ts";

export const YEAR_AHEAD_SCHEMA_VERSION = "kairos.year-ahead.v1" as const;
export const YEAR_AHEAD_TEMPLATE_VERSION = "year-ahead.celestial-almanac.v1" as const;

export const YEAR_AHEAD_PRODUCTS = {
  year_ahead_report: {
    label: "Year Ahead Solar Return & Transit Forecast",
    sku: "KAI-ETSY-YEAR-AHEAD-REPORT-V1",
    description: "The birthday-to-birthday interpretive forecast in US Letter and A4.",
  },
  celestial_year_map: {
    label: "Celestial Year Map",
    sku: "KAI-ETSY-CELESTIAL-YEAR-MAP-V1",
    description: "The standalone annual timing wall print in five print sizes.",
  },
} as const;

export type YearAheadProductKey = keyof typeof YEAR_AHEAD_PRODUCTS;
export type YearAheadPaperSize = "letter" | "a4";

export const CELESTIAL_YEAR_MAP_PRINT_SIZES = ["8x10", "11x14", "16x20", "a4", "a3"] as const;
export type CelestialYearMapPrintSize = (typeof CELESTIAL_YEAR_MAP_PRINT_SIZES)[number];

export const YEAR_AHEAD_QA_ITEM_IDS = [
  "solar_return",
  "profection",
  "activation_windows",
  "narrative",
  "layout",
  "disclosures",
  "accessibility",
] as const;
export type YearAheadQaItemId = (typeof YEAR_AHEAD_QA_ITEM_IDS)[number];

export const YEAR_AHEAD_QA_LABELS: Record<YearAheadQaItemId, string> = {
  solar_return: "Solar-return time, location, angles, and placements checked",
  profection: "Age, profected house, sign, and Lord of the Year checked",
  activation_windows: "Top three windows and their date ranges checked",
  narrative: "Interpretation or map labels are specific, grounded, and free of unsupported predictions",
  layout: "Purchased file set reviewed at its intended print sizes",
  disclosures: "Reflective-use, AI-assistance, and uncertainty disclosures present",
  accessibility: "Reading order, contrast, text equivalents, and non-color cues checked",
};

export interface YearAheadPlace {
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface YearAheadNormalizedBirth extends YearAheadPlace {
  date: string;
  time: string;
}

export interface YearAheadInput {
  artifactId: string;
  displayName: string | null;
  targetBirthdayYear: number;
  normalizedBirth: YearAheadNormalizedBirth;
  returnPlace: YearAheadPlace;
}

export interface YearAheadPlacement {
  planet: Planet;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  house: number;
}

export interface YearAheadProfection {
  age: number;
  house: number;
  sign: ZodiacSign;
  lord: Planet;
  theme: string;
  topic: string;
}

export type YearAheadLifeArea =
  | "identity"
  | "resources"
  | "communication"
  | "home"
  | "creativity"
  | "wellbeing"
  | "relationships"
  | "transformation"
  | "meaning"
  | "calling"
  | "community"
  | "restoration";

export interface YearAheadActivationWindow {
  id: "activation.1" | "activation.2" | "activation.3";
  rank: 1 | 2 | 3;
  title: string;
  startDate: string;
  peakDate: string;
  endDate: string;
  transitingPlanet: Planet;
  natalPoint: Planet | "Ascendant" | "Midheaven";
  aspect: AspectType;
  peakOrb: number;
  applyingAtPeak: boolean;
  natalHouse: number;
  lifeArea: YearAheadLifeArea;
  profectionRelevant: boolean;
  score: number;
}

export interface YearAheadQuarter {
  quarter: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
  activationIds: readonly YearAheadActivationWindow["id"][];
}

export interface YearAheadFact {
  id: string;
  statement: string;
}

export interface YearAheadCalculation {
  forecastStart: string;
  forecastEnd: string;
  solarReturnExactUtc: string;
  solarReturnSunErrorDegrees: number;
  profection: YearAheadProfection;
  natalPlacements: readonly YearAheadPlacement[];
  solarReturnPlacements: readonly YearAheadPlacement[];
  solarReturnAngles: {
    ascendantLongitude: number;
    ascendantSign: ZodiacSign;
    midheavenLongitude: number;
    midheavenSign: ZodiacSign;
  };
  activationWindows: readonly [
    YearAheadActivationWindow,
    YearAheadActivationWindow,
    YearAheadActivationWindow,
  ];
  quarters: readonly [YearAheadQuarter, YearAheadQuarter, YearAheadQuarter, YearAheadQuarter];
  facts: readonly YearAheadFact[];
  provenance: {
    zodiac: "tropical";
    natalHouseSystem: "whole_sign";
    solarReturnHouseSystem: "whole_sign";
    calculationVersion: typeof YEAR_AHEAD_SCHEMA_VERSION;
    ephemerisProvider: "astronomia";
    ephemerisVersion: "4.2.0";
    chartFingerprint: string;
  };
}

export const YEAR_AHEAD_LIFE_SECTION_IDS = [
  "relationships",
  "work_and_resources",
  "home_and_belonging",
  "inner_growth",
] as const;
export type YearAheadLifeSectionId = (typeof YEAR_AHEAD_LIFE_SECTION_IDS)[number];

export interface YearAheadNarrativeBlock {
  title: string;
  summary: string;
  paragraphs: readonly [string, string];
  anchors: readonly [string, string, string];
  sourceFactIds: readonly string[];
}

export interface YearAheadWindowNarrative extends YearAheadNarrativeBlock {
  windowId: YearAheadActivationWindow["id"];
  invitation: string;
}

export interface YearAheadLifeNarrative extends YearAheadNarrativeBlock {
  id: YearAheadLifeSectionId;
}

export interface YearAheadQuarterNarrative {
  quarter: 1 | 2 | 3 | 4;
  title: string;
  summary: string;
  paragraph: string;
  practices: readonly [string, string];
  sourceFactIds: readonly string[];
}

export interface YearAheadNarrative {
  generationMethod: "ai_assisted_human_reviewed";
  model: string;
  promptVersion: string;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  openingLetter: readonly [string, string];
  annualTheme: YearAheadNarrativeBlock;
  activationWindows: readonly [
    YearAheadWindowNarrative,
    YearAheadWindowNarrative,
    YearAheadWindowNarrative,
  ];
  lifeAreas: readonly [
    YearAheadLifeNarrative,
    YearAheadLifeNarrative,
    YearAheadLifeNarrative,
    YearAheadLifeNarrative,
  ];
  quarters: readonly [
    YearAheadQuarterNarrative,
    YearAheadQuarterNarrative,
    YearAheadQuarterNarrative,
    YearAheadQuarterNarrative,
  ];
  reflectionPrompts: readonly [string, string, string, string, string, string, string, string];
}

export interface YearAheadFileVariant {
  documentKind: "report" | "year_map";
  size: YearAheadPaperSize | CelestialYearMapPrintSize;
  fileName: string;
  pageWidthMm: number;
  pageHeightMm: number;
  maximumBytes: number;
}

export interface YearAheadArtifact {
  schemaVersion: typeof YEAR_AHEAD_SCHEMA_VERSION;
  templateVersion: typeof YEAR_AHEAD_TEMPLATE_VERSION;
  artifactId: string;
  displayName: string | null;
  targetBirthdayYear: number;
  privateArtifact: true;
  input: YearAheadInput;
  calculation: YearAheadCalculation;
  narrative: YearAheadNarrative | null;
  files: readonly YearAheadFileVariant[];
  scopeNote: string;
  accessibility: {
    minimumBodyPointSize: 11;
    minimumTextContrast: 4.5;
    selectableTextRequired: true;
    colorOnlyMeaningForbidden: true;
    publicConformanceClaimAllowed: false;
  };
  fulfillmentBoundary: {
    createsKairosAccount: false;
    createsProductEntitlement: false;
    subscribesToMarketing: false;
    requiresOffMarketplacePurchase: false;
  };
}

export class YearAheadContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YearAheadContractError";
  }
}
