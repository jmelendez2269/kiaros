import assert from "node:assert/strict";

import {
  approveStarOriginWorkflowRecord,
  createStarOriginEtsyWorkflowRecord,
  createStarOriginWorkflowRecord,
  isStarOriginOrderReadyForExternalDelivery,
  recordStarOriginExport,
  rejectStarOriginWorkflowRecord,
  StarOriginWorkflowError,
  synthesizeStarOriginWorkflowRecord,
} from "../lib/artifacts/star-origin/workflow.ts";
import { STAR_ORIGIN_QA_ITEM_IDS } from "../lib/artifacts/star-origin/contract.ts";
import { renderStarOriginHtml } from "../lib/artifacts/star-origin/template.ts";
import { topThreeResonances } from "../lib/artifacts/star-origin/profile.ts";
import { renderStarFamilyChartPrintHtml } from "../lib/artifacts/star-origin/chart-print-template.ts";

const founderInput = {
  displayName: "Founder fixture",
  tier: "standard" as const,
  normalizedBirth: {
    date: "1991-06-09",
    time: "01:35",
    timeUnknown: false,
    city: "Orlando",
    country: "United States",
    timezone: "America/New_York",
    latitude: 28.5383,
    longitude: -81.3792,
  },
};

console.log("Building the fixed production baseline and founder report...");
const generated = createStarOriginWorkflowRecord(founderInput, new Date("2026-08-24T12:00:00Z"));
assert.equal(generated.stage, "generated");
assert.equal(generated.artifact.result.kind, "single");
if (generated.artifact.result.kind === "single") {
  assert.equal(generated.artifact.result.primary.lineageId, "orion");
}
assert.equal(generated.artifact.review.state, "not_required");
assert.ok(generated.artifact.workings.length >= 3);
assert.equal(generated.artifact.chartPrint.markers.length, 14);
assert.equal(generated.artifact.chartPrint.highlights.length, 3);
assert.equal(generated.artifact.chartPrintFiles.length, 5);
const topThree = topThreeResonances(generated.artifact.result, generated.artifact.map);
assert.equal(topThree.length, 3);
assert.equal(topThree[0].row.lineageId, "orion");
assert.deepEqual(topThree.map((entry) => entry.rank), [1, 2, 3]);
const profileSection = generated.artifact.sections.find(
  (section) => section.id === "the_twelve_families",
);
assert.ok(profileSection);
assert.equal(profileSection.title, "Your top three resonances");
assert.ok(profileSection.paragraphs.length >= 30);
for (const entry of topThree) {
  assert.ok(
    profileSection.paragraphs.some((paragraph) =>
      paragraph.startsWith(entry.rank + ". " + entry.row.displayName + " — "),
    ),
  );
}
console.log("  ok  the report ranks three resonances and gives the supporting lines full depth");
assert.deepEqual(
  generated.artifact.chartPrint.highlights.map((highlight) => highlight.displayName),
  topThree.map((entry) => entry.row.displayName),
);
const chartPrintHtml = renderStarFamilyChartPrintHtml(
  generated.artifact,
  "11x14",
);
assert.match(chartPrintHtml, /@page \{ size:279\.4mm 355\.6mm/);
assert.match(chartPrintHtml, /Star Family Birth Chart/);
assert.match(chartPrintHtml, /Orion/);
assert.match(chartPrintHtml, /Lyra/);
assert.match(chartPrintHtml, /Andromeda/);
assert.doesNotMatch(chartPrintHtml, /A chart can carry more than one recognisable line/);
console.log("  ok  the standalone vector chart contains the exact top-three contacts without interpretation prose");

await assert.rejects(
  synthesizeStarOriginWorkflowRecord(generated.reportId, "reviewer_fixture", false),
  (error: unknown) =>
    error instanceof StarOriginWorkflowError && error.code === "consent_required",
);
console.log("  ok  external AI is blocked without explicit consent");

assert.throws(
  () =>
    recordStarOriginExport(generated.reportId, {
      documentKind: "report",
      paperSize: "letter",
      fileName: "blocked.pdf",
      sha256: "a".repeat(64),
      bytes: 100,
      exportedBy: "reviewer_fixture",
      exportedAt: "2026-08-24T12:01:00Z",
    }),
  (error: unknown) =>
    error instanceof StarOriginWorkflowError && error.code === "invalid_transition",
);
console.log("  ok  export is blocked before operator approval");

const approved = approveStarOriginWorkflowRecord(
  generated.reportId,
  "reviewer_fixture",
  new Date("2026-08-24T12:02:00Z"),
  STAR_ORIGIN_QA_ITEM_IDS,
);
assert.equal(approved.stage, "approved");
const html = renderStarOriginHtml(approved.artifact, "letter");
assert.match(html, /<!doctype html>/i);
assert.match(html, /Orion/);
assert.match(html, /The workings/);
assert.doesNotMatch(html, /undefined|\[object Object\]/);
console.log("  ok  the accessible Letter report template renders without unresolved values");
const exported = recordStarOriginExport(approved.reportId, {
  documentKind: "report",
  paperSize: "letter",
  fileName: approved.artifact.files[0].fileName,
  sha256: "b".repeat(64),
  bytes: 1234,
  exportedBy: "reviewer_fixture",
  exportedAt: "2026-08-24T12:03:00Z",
});
assert.equal(exported.exports.length, 1);
console.log("  ok  approved composed reports can record a private export");
const withChartExport = recordStarOriginExport(approved.reportId, {
  documentKind: "chart_print",
  paperSize: "11x14",
  fileName: approved.artifact.chartPrintFiles.find(
    (file) => file.printSize === "11x14",
  )!.fileName,
  sha256: "c".repeat(64),
  bytes: 2345,
  exportedBy: "reviewer_fixture",
  exportedAt: "2026-08-24T12:03:30Z",
});
assert.equal(withChartExport.exports.length, 2);
assert.equal(withChartExport.exports[1].documentKind, "chart_print");
console.log("  ok  the standalone chart export is audited independently of the report");

const etsySource = {
  source: "etsy" as const,
  shopId: "kairos",
  receiptId: "receipt-star-origin-1001",
  transactionId: "transaction-star-origin-2001",
  unitIndex: 1,
  quantity: 1,
  listingId: "listing-star-origin-report",
  purchasedAt: "2026-08-25T14:00:00.000Z",
};
const reportOrder = createStarOriginEtsyWorkflowRecord(
  {
    productKey: "star_origin_report",
    source: etsySource,
    supportEmail: "buyer@example.com",
  },
  founderInput,
  "operator_fixture",
  new Date("2026-08-25T14:01:00.000Z"),
);
assert.equal(reportOrder.order?.sku, "KAI-ETSY-STAR-ORIGIN-REPORT-V1");
assert.equal(
  createStarOriginEtsyWorkflowRecord(
    {
      productKey: "star_origin_report",
      source: etsySource,
      supportEmail: "buyer@example.com",
    },
    founderInput,
    "operator_fixture",
  ).reportId,
  reportOrder.reportId,
);
assert.throws(
  () =>
    createStarOriginEtsyWorkflowRecord(
      {
        productKey: "star_family_chart",
        source: etsySource,
        supportEmail: "buyer@example.com",
      },
      founderInput,
      "operator_fixture",
    ),
  (error: unknown) =>
    error instanceof StarOriginWorkflowError &&
    error.code === "idempotency_conflict",
);
const approvedReportOrder = approveStarOriginWorkflowRecord(
  reportOrder.reportId,
  "reviewer_fixture",
  new Date("2026-08-25T14:02:00.000Z"),
  STAR_ORIGIN_QA_ITEM_IDS,
);
assert.throws(
  () =>
    recordStarOriginExport(approvedReportOrder.reportId, {
      documentKind: "chart_print",
      paperSize: "11x14",
      fileName: "wrong-product.pdf",
      sha256: "d".repeat(64),
      bytes: 100,
      exportedBy: "reviewer_fixture",
      exportedAt: "2026-08-25T14:03:00.000Z",
    }),
  (error: unknown) =>
    error instanceof StarOriginWorkflowError &&
    error.code === "invalid_transition",
);
for (const [index, paperSize] of (["letter", "a4"] as const).entries()) {
  recordStarOriginExport(approvedReportOrder.reportId, {
    documentKind: "report",
    paperSize,
    fileName: `star-origin-order-${paperSize}.pdf`,
    sha256: String(index + 1).repeat(64),
    bytes: 1000 + index,
    exportedBy: "reviewer_fixture",
    exportedAt: `2026-08-25T14:0${4 + index}:00.000Z`,
  });
}
assert.equal(
  isStarOriginOrderReadyForExternalDelivery(
    createStarOriginEtsyWorkflowRecord(
      {
        productKey: "star_origin_report",
        source: etsySource,
        supportEmail: "buyer@example.com",
      },
      founderInput,
      "operator_fixture",
    ),
  ),
  true,
);
console.log("  ok  Etsy intake is idempotent and report orders require exactly their two promised files");

const chartOrder = createStarOriginEtsyWorkflowRecord(
  {
    productKey: "star_family_chart",
    source: {
      ...etsySource,
      receiptId: "receipt-star-chart-1002",
      transactionId: "transaction-star-chart-2002",
      listingId: "listing-star-family-chart",
    },
    supportEmail: "chart-buyer@example.com",
  },
  { ...founderInput, displayName: "Chart buyer" },
  "operator_fixture",
  new Date("2026-08-25T14:10:00.000Z"),
);
approveStarOriginWorkflowRecord(
  chartOrder.reportId,
  "reviewer_fixture",
  new Date("2026-08-25T14:11:00.000Z"),
  STAR_ORIGIN_QA_ITEM_IDS,
);
assert.throws(
  () =>
    recordStarOriginExport(chartOrder.reportId, {
      documentKind: "report",
      paperSize: "letter",
      fileName: "wrong-product.pdf",
      sha256: "e".repeat(64),
      bytes: 100,
      exportedBy: "reviewer_fixture",
      exportedAt: "2026-08-25T14:12:00.000Z",
    }),
  (error: unknown) =>
    error instanceof StarOriginWorkflowError &&
    error.code === "invalid_transition",
);
for (const [index, paperSize] of (
  ["8x10", "11x14", "16x20", "a4", "a3"] as const
).entries()) {
  recordStarOriginExport(chartOrder.reportId, {
    documentKind: "chart_print",
    paperSize,
    fileName: `star-family-chart-order-${paperSize}.pdf`,
    sha256: ("abcdef"[index] ?? "f").repeat(64),
    bytes: 2000 + index,
    exportedBy: "reviewer_fixture",
    exportedAt: `2026-08-25T14:${13 + index}:00.000Z`,
  });
}
assert.equal(
  isStarOriginOrderReadyForExternalDelivery(
    createStarOriginEtsyWorkflowRecord(
      {
        productKey: "star_family_chart",
        source: {
          ...etsySource,
          receiptId: "receipt-star-chart-1002",
          transactionId: "transaction-star-chart-2002",
          listingId: "listing-star-family-chart",
        },
        supportEmail: "chart-buyer@example.com",
      },
      { ...founderInput, displayName: "Chart buyer" },
      "operator_fixture",
    ),
  ),
  true,
);
console.log("  ok  wall-print orders expose no report and require all five celestial sizes");

const revision = createStarOriginWorkflowRecord(
  { ...founderInput, displayName: "Revision fixture" },
  new Date("2026-08-24T12:04:00Z"),
);
const rejected = rejectStarOriginWorkflowRecord(
  revision.reportId,
  "reviewer_fixture",
  "Tighten the opening before delivery.",
  new Date("2026-08-24T12:05:00Z"),
);
assert.equal(rejected.stage, "rejected");
assert.equal(rejected.reviewNote, "Tighten the opening before delivery.");
console.log("  ok  rejection requires and records a revision note");

console.log("PASS - the local Star Origin review workflow holds.");
