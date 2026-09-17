const assert = require("node:assert/strict");
globalThis.require = require;
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const { calculateYearAhead } = require("../lib/artifacts/year-ahead/calculation.ts");
const { YEAR_AHEAD_LIFE_SECTION_IDS, YEAR_AHEAD_QA_ITEM_IDS, CELESTIAL_YEAR_MAP_PRINT_SIZES } = require("../lib/artifacts/year-ahead/contract.ts");
const { generateYearAheadArtifact } = require("../lib/artifacts/year-ahead/generator.ts");
const { renderYearAheadReportHtml } = require("../lib/artifacts/year-ahead/template.ts");
const { CELESTIAL_YEAR_MAP_DIMENSIONS, renderCelestialYearMapHtml } = require("../lib/artifacts/year-ahead/year-map-template.ts");
const {
  approveYearAheadWorkflowRecord,
  createYearAheadEtsyWorkflowRecord,
  isYearAheadReadyForExternalDelivery,
  recordYearAheadExport,
  synthesizeYearAheadWorkflowRecord,
  YearAheadWorkflowError,
} = require("../lib/artifacts/year-ahead/workflow.ts");

const input = {
  artifactId: "year_fixture_founder_2026",
  displayName: "Founder Fixture",
  targetBirthdayYear: 2026,
  normalizedBirth: {
    date: "1991-06-09", time: "01:35", city: "Orlando", country: "United States",
    timezone: "America/New_York", latitude: 28.5383, longitude: -81.3792,
  },
  returnPlace: {
    city: "Orlando", country: "United States", timezone: "America/New_York",
    latitude: 28.5383, longitude: -81.3792,
  },
};

function block(title, sourceFactIds) {
  return {
    title,
    summary: "A specific summary that keeps calculated timing visible while preserving agency, nuance, and room for the reader's lived experience throughout the birthday year.",
    paragraphs: [
      "This developed fixture paragraph represents a full interpretive passage grounded in cited calculation facts. It describes symbolic emphasis as a season of attention, holds tension without turning it into fate, and keeps the reader's choices visible throughout the year. The language is intentionally substantial enough to exercise the premium long-form page layout and readable measure.",
      "A second developed fixture paragraph adds another layer without promising an event. It connects the annual atmosphere to practical observation, names both possibility and pressure, and invites the reader to notice what becomes more available through deliberate pacing. This content exists only for local contract and print verification.",
    ],
    anchors: [
      "Track the pattern in a weekly note before assigning it a fixed meaning or outcome.",
      "Choose one grounded action that supports capacity during the wider timing window.",
      "Review what changed after the window closes, including what did not happen.",
    ],
    sourceFactIds,
  };
}

function chromePath() {
  const candidates = [
    process.env.KIAROS_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const match = candidates.find(existsSync);
  assert.ok(match, "Local Chrome or Edge is required for PDF verification.");
  return match;
}

function renderPdf(root, name, html) {
  const htmlPath = join(root, name + ".html");
  const pdfPath = join(root, name + ".pdf");
  writeFileSync(htmlPath, html, "utf8");
  execFileSync(chromePath(), [
    "--headless=new", "--disable-background-networking", "--disable-component-update",
    "--disable-extensions", "--disable-gpu", "--disable-sync", "--metrics-recording-only",
    "--no-default-browser-check", "--no-first-run", "--no-pdf-header-footer",
    "--print-to-pdf-no-header", "--export-tagged-pdf", "--generate-pdf-document-outline",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1000",
    `--user-data-dir=${join(root, name + "-profile")}`,
    `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
  ], { windowsHide: true, timeout: 45_000 });
  const bytes = readFileSync(pdfPath);
  assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.ok(bytes.includes(Buffer.from("/StructTreeRoot")));
  return bytes;
}

async function main() {
  console.log("Calculating the founder birthday year...");
  const calculation = calculateYearAhead(input);
  assert.equal(calculation.profection.age, 35);
  assert.equal(calculation.profection.house, 12);
  assert.equal(calculation.activationWindows.length, 3);
  assert.equal(new Set(calculation.activationWindows.map((window) => `${window.transitingPlanet}.${window.aspect}.${window.natalPoint}`)).size, 3);
  assert.ok(calculation.solarReturnSunErrorDegrees < 0.01);
  assert.match(calculation.provenance.chartFingerprint, /^sha256:[a-f0-9]{64}$/);
  calculation.activationWindows.forEach((window) => {
    assert.ok(window.startDate <= window.peakDate && window.peakDate <= window.endDate);
    assert.ok(calculation.facts.some((fact) => fact.id === window.id));
  });
  console.log("  ok  exact return, profection, and three distinct traceable windows");

  const narrative = {
    generationMethod: "ai_assisted_human_reviewed", model: "fixture-model",
    promptVersion: "year-ahead.fixture.v1", tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    openingLetter: block("Opening", ["profection.year"]).paragraphs,
    annualTheme: block("The year of restorative authority", ["profection.year", "solar_return.angles"]),
    activationWindows: calculation.activationWindows.map((window) => ({
      ...block(`Window ${window.rank}: ${window.title}`, [window.id, "profection.year"]),
      windowId: window.id,
      invitation: "Meet this window as a period for observation and deliberate response, not as a deadline or a promise that a particular event must arrive.",
    })),
    lifeAreas: YEAR_AHEAD_LIFE_SECTION_IDS.map((id) => ({
      ...block(`A grounded view of ${id.replace(/_/g, " ")}`, ["profection.year", "solar_return.Venus"]), id,
    })),
    quarters: calculation.quarters.map((quarter) => ({
      quarter: quarter.quarter, title: `Quarter ${quarter.quarter} compass`,
      summary: "A paced quarter summary that distinguishes activation from integration and gives the reader a clear way to orient without treating the calendar as destiny.",
      paragraph: block("Quarter", ["profection.year"]).paragraphs[0],
      practices: ["Keep one weekly observation tied to the active annual theme.", "Leave recovery room around any selected activation window."],
      sourceFactIds: ["profection.year"],
    })),
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
  assert.match(reportHtml, /Your Top 3 activation windows/);
  assert.match(reportHtml, /Questions to carry through the year/);
  assert.doesNotMatch(reportHtml, /undefined|\[object Object\]/);
  const mapHtml = renderCelestialYearMapHtml(artifact, "11x14");
  assert.match(mapHtml, /@page\{size:279\.4mm 355\.6mm/);
  assert.match(mapHtml, /How to read the orbit/);
  console.log("  ok  premium report source and self-explanatory wall map render from one calculation");

  const pdfRoot = mkdtempSync(join(tmpdir(), "kiaros-year-ahead-check-"));
  try {
    const reportBytes = renderPdf(pdfRoot, "year-ahead-letter", reportHtml);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const reportPdf = await getDocument({ data: Uint8Array.from(reportBytes) }).promise;
    assert.equal(reportPdf.numPages, 17);
    const reportFirst = await reportPdf.getPage(1);
    const reportViewport = reportFirst.getViewport({ scale: 1 });
    assert.ok(Math.abs(reportViewport.width - 612) < 0.2);
    assert.ok(Math.abs(reportViewport.height - 792) < 0.2);
    const reportText = [];
    for (let pageNumber = 1; pageNumber <= reportPdf.numPages; pageNumber += 1) {
      const page = await reportPdf.getPage(pageNumber);
      const text = (await page.getTextContent()).items.map((item) => item.str ?? "").join(" ");
      assert.ok(text.trim().length > 40, `Report page ${pageNumber} has too little selectable text.`);
      reportText.push(text);
    }
    assert.match(reportText.join(" "), /Top 3 activation windows/);
    assert.match(reportText.join(" "), /Questions to carry through the year/);
    await reportPdf.destroy();
    const a4Bytes = renderPdf(pdfRoot, "year-ahead-a4", renderYearAheadReportHtml(artifact, "a4"));
    const a4Pdf = await getDocument({ data: Uint8Array.from(a4Bytes) }).promise;
    assert.equal(a4Pdf.numPages, 17);
    const a4Viewport = (await a4Pdf.getPage(1)).getViewport({ scale: 1 });
    assert.ok(Math.abs(a4Viewport.width - (210 / 25.4) * 72) < 0.75);
    assert.ok(Math.abs(a4Viewport.height - (297 / 25.4) * 72) < 0.75);
    await a4Pdf.destroy();
    for (const size of CELESTIAL_YEAR_MAP_PRINT_SIZES) {
      const html = size === "11x14" ? mapHtml : renderCelestialYearMapHtml(artifact, size);
      const mapBytes = renderPdf(pdfRoot, `celestial-year-map-${size}`, html);
      const mapPdf = await getDocument({ data: Uint8Array.from(mapBytes) }).promise;
      assert.equal(mapPdf.numPages, 1);
      const mapPage = await mapPdf.getPage(1);
      const mapViewport = mapPage.getViewport({ scale: 1 });
      const dimensions = CELESTIAL_YEAR_MAP_DIMENSIONS[size];
      assert.ok(Math.abs(mapViewport.width - (dimensions.widthMm / 25.4) * 72) < 0.75);
      assert.ok(Math.abs(mapViewport.height - (dimensions.heightMm / 25.4) * 72) < 0.75);
      const mapText = (await mapPage.getTextContent()).items.map((item) => item.str ?? "").join(" ");
      assert.match(mapText, /How to/);
      assert.match(mapText, /orbit/);
      assert.match(mapText, /Closest/);
      await mapPdf.destroy();
    }
    console.log("  ok  Letter/A4 reports and all five map sizes pass tagged-PDF, page-size, and selectable-text checks");
  } finally {
    rmSync(pdfRoot, { recursive: true, force: true });
  }

  const source = {
    source: "etsy", shopId: "kairos", receiptId: "year-map-1001", transactionId: "year-map-tx-1001",
    unitIndex: 1, quantity: 1, listingId: "celestial-year-map", purchasedAt: "2026-08-25T18:00:00.000Z",
  };
  const rawInput = { ...input }; delete rawInput.artifactId;
  const mapOrder = createYearAheadEtsyWorkflowRecord(
    { productKey: "celestial_year_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture",
  );
  assert.equal(mapOrder.order.sku, "KAI-ETSY-CELESTIAL-YEAR-MAP-V1");
  assert.throws(() => approveYearAheadWorkflowRecord(mapOrder.reportId, "reviewer_fixture", []), YearAheadWorkflowError);
  const approved = approveYearAheadWorkflowRecord(mapOrder.reportId, "reviewer_fixture", YEAR_AHEAD_QA_ITEM_IDS);
  CELESTIAL_YEAR_MAP_PRINT_SIZES.forEach((size, index) => recordYearAheadExport(approved.reportId, {
    documentKind: "year_map", size, fileName: `map-${size}.pdf`, sha256: String(index + 1).repeat(64),
    bytes: 1_000 + index, exportedBy: "reviewer_fixture", exportedAt: `2026-08-25T18:1${index}:00.000Z`,
  }));
  const replay = createYearAheadEtsyWorkflowRecord(
    { productKey: "celestial_year_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture",
  );
  assert.equal(replay.reportId, mapOrder.reportId);
  assert.equal(isYearAheadReadyForExternalDelivery(replay), true);

  const reportOrder = createYearAheadEtsyWorkflowRecord(
    { productKey: "year_ahead_report", source: { ...source, receiptId: "year-report-1002", transactionId: "year-report-tx-1002" }, supportEmail: "buyer@example.com" },
    rawInput, "operator_fixture",
  );
  await assert.rejects(synthesizeYearAheadWorkflowRecord(reportOrder.reportId, "operator_fixture", false),
    (error) => error instanceof YearAheadWorkflowError && error.code === "consent_required");
  assert.throws(() => approveYearAheadWorkflowRecord(reportOrder.reportId, "reviewer_fixture", YEAR_AHEAD_QA_ITEM_IDS), YearAheadWorkflowError);
  console.log("  ok  SKU-specific QA, idempotency, export completeness, and AI-consent boundaries hold");
  console.log("Year Ahead runtime checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
