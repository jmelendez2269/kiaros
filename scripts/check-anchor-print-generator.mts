import assert from "node:assert/strict";

import {
  ANCHOR_PRODUCT_NAME,
  ANCHOR_REPORT_SECTION_IDS,
  generateAnchorPrint,
  renderAnchorPrintHtml,
  type AnchorPrintInput,
} from "../lib/artifacts/anchor-print/index.ts";
import {
  knownTimeAnchorFixture,
  unknownTimeAnchorFixture,
} from "../lib/artifacts/anchor-print/fixtures.ts";

let assertions = 0;

function check(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function rejectsContract(
  create: () => unknown,
  pattern: RegExp,
  message: string,
): void {
  assert.throws(create, pattern, message);
  assertions += 1;
}

function pageCount(html: string): number {
  return html.match(/class="artifact-page\b/g)?.length ?? 0;
}

const knownInput = knownTimeAnchorFixture();
const unknownInput = unknownTimeAnchorFixture();
const knownArtifact = generateAnchorPrint(knownInput);
const unknownArtifact = generateAnchorPrint(unknownInput);

equal(knownArtifact.product.name, ANCHOR_PRODUCT_NAME, "full report package has the approved product name");
equal(knownArtifact.product.priceUsd, 34, "launch hypothesis remains $34");
equal(knownArtifact.report.pageCount, 26, "report contract declares twenty-six pages");
equal(knownArtifact.report.sections.length, 14, "report contains fourteen developed chapters");
deepEqual(
  knownArtifact.report.sections.map((section) => section.id),
  ANCHOR_REPORT_SECTION_IDS,
  "report chapters remain in the approved reading order",
);
check(
  knownArtifact.report.sections.every((section) =>
    section.paragraphs.every((paragraph) => paragraph.length >= 260) &&
    section.keyPoints.length === 3 &&
    section.sourceFactIds.length > 0
  ),
  "every chapter contains developed prose, practical anchors, and traceable facts",
);
deepEqual(
  knownArtifact.files.map((file) => file.documentKind + ":" + file.paperSize),
  ["report:letter", "report:a4", "anchor_print:letter", "anchor_print:a4"],
  "package exposes both documents in both paper sizes",
);
check(
  knownArtifact.files.every((file) => file.maximumBytes === 10 * 1024 * 1024),
  "every file keeps the ten-megabyte boundary",
);
equal(knownArtifact.anchorPrint.items.length, 6, "keepsake contains six concise natal anchors");
check(knownArtifact.timeKnown, "known-time fixture remains time-aware");
check(
  knownArtifact.report.reference.placements.every((placement) => placement.house !== null),
  "known-time report includes houses",
);
check(
  knownArtifact.factIds.includes("angle.Ascendant") &&
  knownArtifact.factIds.includes("angle.Midheaven"),
  "known-time report exposes both chart angles as facts",
);

check(!unknownArtifact.timeKnown, "unknown-time fixture remains untimed");
check(
  unknownArtifact.report.reference.placements.every((placement) => placement.house === null),
  "unknown-time report omits every house",
);
check(
  !unknownArtifact.factIds.includes("angle.Ascendant") &&
  unknownArtifact.factIds.includes("time.unknown"),
  "unknown-time report suppresses angles and records its boundary",
);
check(
  Boolean(unknownArtifact.report.reference.uncertaintyNote) &&
  Boolean(unknownArtifact.anchorPrint.uncertaintyNote),
  "unknown-time boundary appears in both delivered documents",
);

for (const artifact of [knownArtifact, unknownArtifact]) {
  for (const paperSize of ["letter", "a4"] as const) {
    const reportHtml = renderAnchorPrintHtml(artifact, paperSize, "report");
    const printHtml = renderAnchorPrintHtml(artifact, paperSize, "anchor_print");
    equal(pageCount(reportHtml), 26, artifact.artifactId + "/" + paperSize + " renders twenty-six report pages");
    equal(pageCount(printHtml), 1, artifact.artifactId + "/" + paperSize + " renders one keepsake page");
    check(reportHtml.includes("Questions worth returning to"), "report contains reflection integration");
    check(!reportHtml.includes("How this report was made"), "report no longer contains the method page");
    check(reportHtml.includes("Plan your life with the sky"), "report contains the full-page Kairos Planner advertisement");
    check(reportHtml.includes("https://kairosplanner.xyz"), "report contains the Kairos Planner website link");
    equal((reportHtml.match(/class="artifact-page product-tour-page"/g) ?? []).length, 6, "report contains six product-tour screenshot pages");
    check(reportHtml.includes("Today, made useful"), "product tour begins with the Today experience");
    check(reportHtml.includes("Continue the conversation with context"), "product tour identifies optional Oracle context");
    check(printHtml.includes("Use with the accompanying twenty-six-page report"), "keepsake identifies the full report");
  }
}

const shallow = knownTimeAnchorFixture();
shallow.narrative = {
  ...shallow.narrative,
  sections: shallow.narrative.sections.map((section, index) =>
    index === 0 ? { ...section, paragraphs: ["Too short.", section.paragraphs[1]] } : section
  ),
};
rejectsContract(
  () => generateAnchorPrint(shallow),
  /must contain at least 260 characters/,
  "thin chapter prose fails closed",
);

const missingChapter = knownTimeAnchorFixture();
missingChapter.narrative = {
  ...missingChapter.narrative,
  sections: missingChapter.narrative.sections.slice(0, -1),
};
rejectsContract(
  () => generateAnchorPrint(missingChapter),
  /exactly fourteen report sections/,
  "missing report chapter fails closed",
);

const proxyTime = unknownTimeAnchorFixture();
proxyTime.normalizedBirth = { ...proxyTime.normalizedBirth, time: "12:00" };
rejectsContract(
  () => generateAnchorPrint(proxyTime),
  /must not retain a proxy birth time/,
  "unknown-time report cannot smuggle in noon",
);

const impossibleAngle = unknownTimeAnchorFixture();
impossibleAngle.calculation = {
  ...impossibleAngle.calculation,
  angles: {
    ...impossibleAngle.calculation.angles,
    ascendantLongitude: 8.2,
    ascendantSign: "Aries",
  },
};
rejectsContract(
  () => generateAnchorPrint(impossibleAngle),
  /angles must be suppressed/,
  "unknown-time report cannot claim an Ascendant",
);

const missingAiTokenUsage: AnchorPrintInput = knownTimeAnchorFixture();
missingAiTokenUsage.narrative = { ...missingAiTokenUsage.narrative, tokenUsage: null };
rejectsContract(
  () => generateAnchorPrint(missingAiTokenUsage),
  /must record token usage/,
  "AI-assisted report requires token provenance",
);

console.log(`Natal report generator checks passed (${assertions} assertions).`);
