import assert from "node:assert/strict";

import { calculateYearAhead, findSolarReturnExactUtc } from "../lib/artifacts/year-ahead/calculation.ts";
import {
  CELESTIAL_YEAR_MAP_PRINT_SIZES,
  YEAR_AHEAD_LIFE_SECTION_IDS,
  YEAR_AHEAD_QA_ITEM_IDS,
  type YearAheadInput,
  type YearAheadNarrative,
} from "../lib/artifacts/year-ahead/contract.ts";
import { generateYearAheadArtifact } from "../lib/artifacts/year-ahead/generator.ts";
import { renderYearAheadReportHtml } from "../lib/artifacts/year-ahead/template.ts";
import { renderCelestialYearMapHtml } from "../lib/artifacts/year-ahead/year-map-template.ts";
import {
  approveYearAheadWorkflowRecord,
  createYearAheadEtsyWorkflowRecord,
  isYearAheadReadyForExternalDelivery,
  recordYearAheadExport,
  synthesizeYearAheadWorkflowRecord,
  YearAheadWorkflowError,
} from "../lib/artifacts/year-ahead/workflow.ts";

async function main() {

const input: YearAheadInput = {
  artifactId: "year_fixture_founder_2026",
  displayName: "Founder Fixture",
  targetBirthdayYear: 2026,
  normalizedBirth: {
    date: "1991-06-09",
    time: "01:35",
    city: "Orlando",
    country: "United States",
    timezone: "America/New_York",
    latitude: 28.5383,
    longitude: -81.3792,
  },
  returnPlace: {
    city: "Orlando",
    country: "United States",
    timezone: "America/New_York",
    latitude: 28.5383,
    longitude: -81.3792,
  },
};

console.log("Calculating the founder birthday year...");
const calculation = calculateYearAhead(input);
assert.equal(calculation.profection.age, 35);
assert.equal(calculation.profection.house, 12);
assert.equal(calculation.activationWindows.length, 3);
assert.equal(new Set(calculation.activationWindows.map((window) => `${window.transitingPlanet}.${window.aspect}.${window.natalPoint}`)).size, 3);
assert.ok(calculation.solarReturnSunErrorDegrees < 0.01);
assert.match(calculation.provenance.chartFingerprint, /^sha256:[a-f0-9]{64}$/);
for (const window of calculation.activationWindows) {
  assert.ok(window.startDate <= window.peakDate && window.peakDate <= window.endDate);
  assert.ok(calculation.facts.some((fact) => fact.id === window.id));
}
const nextReturn = findSolarReturnExactUtc(
  calculation.natalPlacements.find((item) => item.planet === "Sun")!.longitude,
  input.normalizedBirth.date,
  2027,
);
assert.ok(nextReturn.getUTCFullYear() === 2027);
console.log("  ok  exact solar return, annual profection, and three distinct traceable windows");

function block(title: string, sourceFactIds: readonly string[]) {
  return {
    title,
    summary: "A specific summary that keeps the calculated timing visible while preserving agency, nuance, and room for the reader's lived experience throughout the birthday year.",
    paragraphs: [
      "This developed fixture paragraph represents a full interpretive passage grounded in the cited calculation facts. It describes symbolic emphasis as a season of attention, holds tension without turning it into fate, and keeps the reader's choices visible throughout the year. The language is intentionally substantial enough to exercise the premium long-form page layout and its readable measure.",
      "A second developed fixture paragraph adds another layer without promising an event. It connects the annual atmosphere to practical observation, names both possibility and pressure, and invites the reader to notice what becomes more available through deliberate pacing. This content exists only for local contract and print verification.",
    ] as const,
    anchors: [
      "Track the pattern in a weekly note before assigning it a fixed meaning or outcome.",
      "Choose one grounded action that supports capacity during the wider timing window.",
      "Review what changed after the window closes, including what did not happen.",
    ] as const,
    sourceFactIds,
  };
}

const narrative: YearAheadNarrative = {
  generationMethod: "ai_assisted_human_reviewed",
  model: "fixture-model",
  promptVersion: "year-ahead.fixture.v1",
  tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
  openingLetter: [block("Opening", ["profection.year"]).paragraphs[0], block("Opening", ["profection.year"]).paragraphs[1]],
  annualTheme: block("The year of restorative authority", ["profection.year", "solar_return.angles"]),
  activationWindows: calculation.activationWindows.map((window) => ({
    ...block(`Window ${window.rank}: ${window.title}`, [window.id, "profection.year"]),
    windowId: window.id,
    invitation: "Meet this window as a period for observation and deliberate response, not as a deadline or a promise that a particular event must arrive.",
  })) as unknown as YearAheadNarrative["activationWindows"],
  lifeAreas: YEAR_AHEAD_LIFE_SECTION_IDS.map((id) => ({ ...block(`A grounded view of ${id.replace(/_/g, " ")}`, ["profection.year", "solar_return.Venus"]), id })) as unknown as YearAheadNarrative["lifeAreas"],
  quarters: calculation.quarters.map((quarter) => ({
    quarter: quarter.quarter,
    title: `Quarter ${quarter.quarter} compass`,
    summary: "A paced quarter summary that distinguishes activation from integration and gives the reader a clear way to orient without treating the calendar as destiny.",
    paragraph: block("Quarter", ["profection.year"]).paragraphs[0],
    practices: ["Keep one weekly observation tied to the active annual theme.", "Leave recovery room around any selected activation window."] as const,
    sourceFactIds: ["profection.year"],
  })) as unknown as YearAheadNarrative["quarters"],
  reflectionPrompts: [
    "Where does restoration ask for structure rather than withdrawal this year?",
    "What changes when a timing window is treated as a season instead of a deadline?",
    "Which relationships support reciprocal pacing and clear agreements?",
    "What form of contribution feels both visible and sustainable?",
    "Where might home or belonging need a more honest boundary?",
    "What evidence will help distinguish intuition from urgency?",
    "Which practice makes room for both effort and recovery?",
    "What would a compassionate year-end review be willing to notice?",
  ],
};

const artifact = generateYearAheadArtifact({ input, calculation, narrative });
const reportHtml = renderYearAheadReportHtml(artifact, "letter");
assert.match(reportHtml, /Year Ahead/);
assert.match(reportHtml, /Your Top 3 activation windows/);
assert.match(reportHtml, /Questions to carry through the year/);
assert.doesNotMatch(reportHtml, /undefined|\[object Object\]/);
const mapHtml = renderCelestialYearMapHtml(artifact, "11x14");
assert.match(mapHtml, /@page\{size:279\.4mm 355\.6mm/);
assert.match(mapHtml, /How to read the orbit/);
for (const window of calculation.activationWindows) assert.match(mapHtml, new RegExp(window.transitingPlanet));
console.log("  ok  seventeen-page report source and self-explanatory wall map render from one calculation");

const source = {
  source: "etsy" as const,
  shopId: "kairos",
  receiptId: "year-map-1001",
  transactionId: "year-map-tx-1001",
  unitIndex: 1,
  quantity: 1,
  listingId: "celestial-year-map",
  purchasedAt: "2026-08-25T18:00:00.000Z",
};
const mapOrder = createYearAheadEtsyWorkflowRecord(
  { productKey: "celestial_year_map", source, supportEmail: "buyer@example.com" },
  { ...input, artifactId: undefined } as Omit<YearAheadInput, "artifactId">,
  "operator_fixture",
  new Date("2026-08-25T18:01:00.000Z"),
);
assert.equal(mapOrder.stage, "calculated");
assert.equal(mapOrder.order.sku, "KAI-ETSY-CELESTIAL-YEAR-MAP-V1");
assert.equal(createYearAheadEtsyWorkflowRecord(
  { productKey: "celestial_year_map", source, supportEmail: "buyer@example.com" },
  { ...input, artifactId: undefined } as Omit<YearAheadInput, "artifactId">,
  "operator_fixture",
).reportId, mapOrder.reportId);
assert.throws(() => approveYearAheadWorkflowRecord(mapOrder.reportId, "reviewer_fixture", []), YearAheadWorkflowError);
const approvedMap = approveYearAheadWorkflowRecord(mapOrder.reportId, "reviewer_fixture", YEAR_AHEAD_QA_ITEM_IDS);
for (const [index, size] of CELESTIAL_YEAR_MAP_PRINT_SIZES.entries()) {
  recordYearAheadExport(approvedMap.reportId, {
    documentKind: "year_map", size, fileName: `map-${size}.pdf`, sha256: String(index + 1).repeat(64),
    bytes: 1_000 + index, exportedBy: "reviewer_fixture", exportedAt: `2026-08-25T18:1${index}:00.000Z`,
  });
}
assert.equal(isYearAheadReadyForExternalDelivery(approvedMap), false);
assert.equal(isYearAheadReadyForExternalDelivery(createYearAheadEtsyWorkflowRecord(
  { productKey: "celestial_year_map", source, supportEmail: "buyer@example.com" },
  { ...input, artifactId: undefined } as Omit<YearAheadInput, "artifactId">,
  "operator_fixture",
)), true);

const reportSource = { ...source, receiptId: "year-report-1002", transactionId: "year-report-tx-1002", listingId: "year-ahead-report" };
const reportOrder = createYearAheadEtsyWorkflowRecord(
  { productKey: "year_ahead_report", source: reportSource, supportEmail: "buyer@example.com" },
  { ...input, artifactId: undefined } as Omit<YearAheadInput, "artifactId">,
  "operator_fixture",
);
await assert.rejects(synthesizeYearAheadWorkflowRecord(reportOrder.reportId, "operator_fixture", false),
  (error: unknown) => error instanceof YearAheadWorkflowError && error.code === "consent_required");
assert.throws(() => approveYearAheadWorkflowRecord(reportOrder.reportId, "reviewer_fixture", YEAR_AHEAD_QA_ITEM_IDS), YearAheadWorkflowError);
console.log("  ok  SKU-specific QA, idempotency, export completeness, and AI-consent boundaries hold");

console.log("Year Ahead workflow checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
