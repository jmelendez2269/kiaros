const assert = require("node:assert/strict");
globalThis.require = require;
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const { calculateCelestialConnection } = require("../lib/artifacts/celestial-connection/calculation.ts");
const { CELESTIAL_CONNECTION_QA_ITEM_IDS, CONNECTION_DOMAIN_SECTION_IDS, CONNECTION_MAP_PRINT_SIZES } = require("../lib/artifacts/celestial-connection/contract.ts");
const { CONNECTION_MAP_DIMENSIONS, renderConnectionMapHtml } = require("../lib/artifacts/celestial-connection/connection-map-template.ts");
const { generateCelestialConnectionArtifact } = require("../lib/artifacts/celestial-connection/generator.ts");
const { renderCelestialConnectionReportHtml } = require("../lib/artifacts/celestial-connection/template.ts");
const {
  approveCelestialConnectionWorkflowRecord, createCelestialConnectionEtsyWorkflowRecord,
  isCelestialConnectionReadyForExternalDelivery, recordCelestialConnectionExport,
  synthesizeCelestialConnectionWorkflowRecord, CelestialConnectionWorkflowError,
} = require("../lib/artifacts/celestial-connection/workflow.ts");

const input = {
  artifactId: "connection_fixture_alex_jordan", relationshipType: "romantic",
  personA: { displayName: "Alex", date: "1991-06-09", time: "01:35", timeUnknown: false,
    place: { city: "Orlando", country: "United States", timezone: "America/New_York", latitude: 28.5383, longitude: -81.3792 } },
  personB: { displayName: "Jordan", date: "1989-11-14", time: "15:20", timeUnknown: false,
    place: { city: "Austin", country: "United States", timezone: "America/Chicago", latitude: 30.2672, longitude: -97.7431 } },
};

function block(title, sourceFactIds) {
  return {
    title,
    summary: "A grounded summary of how this relationship pattern can be felt, including its resources and its edges without turning symbolism into a verdict.",
    paragraphs: [
      "This developed fixture paragraph follows calculated relationship facts and keeps both people visible. It names the pattern as a field of possibility, not a promise, and leaves room for communication, consent, context, and each person's choices. The passage is intentionally substantial enough to exercise the premium page design and its readable measure.",
      "A second developed fixture paragraph adds practical nuance by describing how the same signature may feel supportive in one moment and require care in another. It remains specific enough to test the full report layout without predicting an outcome, diagnosing either person, or reducing the relationship to compatibility.",
    ],
    anchors: [
      "Name what each person needs before deciding what the pattern means.",
      "Notice when this strength becomes pressure and choose a slower response.",
      "Return to one shared agreement that protects clarity and choice.",
    ],
    sourceFactIds,
  };
}

function chromePath() {
  const candidates = [process.env.KIAROS_CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean);
  const match = candidates.find(existsSync); assert.ok(match, "Local Chrome or Edge is required for PDF verification."); return match;
}
function renderPdf(root, name, html) {
  const htmlPath = join(root, name + ".html"); const pdfPath = join(root, name + ".pdf"); writeFileSync(htmlPath, html, "utf8");
  execFileSync(chromePath(), ["--headless=new", "--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-gpu", "--disable-sync", "--metrics-recording-only", "--no-default-browser-check", "--no-first-run", "--no-pdf-header-footer", "--print-to-pdf-no-header", "--export-tagged-pdf", "--generate-pdf-document-outline", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1000", `--user-data-dir=${join(root, name + "-profile")}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { windowsHide: true, timeout: 45_000 });
  const bytes = readFileSync(pdfPath); assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-"); assert.ok(bytes.includes(Buffer.from("/StructTreeRoot"))); assert.ok(bytes.length < 10 * 1024 * 1024); return bytes;
}

async function main() {
  console.log("Calculating both relationship charts...");
  const calculation = calculateCelestialConnection(input);
  assert.equal(calculation.signatures.length, 3);
  assert.equal(new Set(calculation.signatures.map((item) => `${item.personAPoint}.${item.aspect}.${item.personBPoint}`)).size, 3);
  assert.ok(calculation.compositePlacements.length >= 8);
  assert.match(calculation.provenance.chartFingerprint, /^sha256:[a-f0-9]{64}$/);
  calculation.signatures.forEach((item) => assert.ok(calculation.facts.some((fact) => fact.id === item.id)));
  const unknown = calculateCelestialConnection({ ...input, artifactId: "connection_fixture_unknown", personB: { ...input.personB, time: null, timeUnknown: true } });
  assert.equal(unknown.precision.housesAvailable, false); assert.equal(unknown.precision.moonAspectsAvailable, false);
  assert.ok(unknown.signatures.every((item) => item.personBPoint !== "Moon" && item.personAInPersonBHouse === null && item.personBInPersonAHouse === null));
  console.log("  ok  Top 3, composite center, provenance, and unknown-time boundaries");

  const factId = calculation.facts[0].id;
  const narrative = {
    generationMethod: "ai_assisted_human_reviewed", model: "fixture-model", promptVersion: "celestial-connection.fixture.v1", tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    openingLetter: block("Opening", [factId]).paragraphs,
    relationshipEssence: block("A bond shaped by candor and responsive pacing", [factId]),
    signatures: calculation.signatures.map((signature) => ({ ...block(signature.title, [signature.id]), signatureId: signature.id, repairPractice: "Pause, name the live need, and let both people revise the next step without treating the chart as the authority." })),
    domains: CONNECTION_DOMAIN_SECTION_IDS.map((id) => ({ ...block(`A grounded view of ${id.replace(/_/g, " ")}`, [factId]), id })),
    compositeCore: block("The relationship as a third space", [factId]),
    reflectionPrompts: ["What does each person experience as genuine reciprocity?", "Where does ease invite deeper attention?", "Which conversation becomes clearer when neither person rushes it?", "How can affection remain legible to both people?", "What helps friction become information instead of a verdict?", "Which shared value deserves a concrete agreement?", "Where does the relationship need more room for difference?", "What would responsible growth look like now?"],
  };
  const artifact = generateCelestialConnectionArtifact({ input, calculation, narrative });
  const reportHtml = renderCelestialConnectionReportHtml(artifact, "letter");
  assert.match(reportHtml, /Your Top 3 signatures/); assert.match(reportHtml, /The relationship as a third space/); assert.doesNotMatch(reportHtml, /undefined|\[object Object\]/);
  const mapHtml = renderConnectionMapHtml(artifact, "11x14"); assert.match(mapHtml, /Terracotta orbit/); assert.match(mapHtml, /Lines 01/);

  const pdfRoot = mkdtempSync(join(tmpdir(), "kiaros-connection-check-"));
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    for (const paper of ["letter", "a4"]) {
      const bytes = renderPdf(pdfRoot, `connection-report-${paper}`, renderCelestialConnectionReportHtml(artifact, paper));
      const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise; assert.equal(pdf.numPages, 15);
      const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 1 });
      const expected = paper === "letter" ? [215.9, 279.4] : [210, 297];
      assert.ok(Math.abs(viewport.width - expected[0] / 25.4 * 72) < .75); assert.ok(Math.abs(viewport.height - expected[1] / 25.4 * 72) < .75);
      let text = ""; for (let number = 1; number <= pdf.numPages; number += 1) text += " " + (await (await pdf.getPage(number)).getTextContent()).items.map((item) => item.str ?? "").join(" ");
      assert.match(text, /Top 3 signatures/); assert.match(text, /Questions for the relationship/); await pdf.destroy();
    }
    for (const size of CONNECTION_MAP_PRINT_SIZES) {
      const bytes = renderPdf(pdfRoot, `connection-map-${size}`, renderConnectionMapHtml(artifact, size));
      const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise; assert.equal(pdf.numPages, 1);
      const viewport = (await pdf.getPage(1)).getViewport({ scale: 1 }); const dimensions = CONNECTION_MAP_DIMENSIONS[size];
      assert.ok(Math.abs(viewport.width - dimensions.widthMm / 25.4 * 72) < .75); assert.ok(Math.abs(viewport.height - dimensions.heightMm / 25.4 * 72) < .75); await pdf.destroy();
    }
    console.log("  ok  15-page Letter/A4 reports and all five tagged wall-print sizes");
  } finally { rmSync(pdfRoot, { recursive: true, force: true }); }

  const source = { source: "etsy", shopId: "kairos", receiptId: "connection-map-1001", transactionId: "connection-map-tx-1001", unitIndex: 1, quantity: 1, listingId: "connection-map", purchasedAt: "2026-08-26T18:00:00.000Z" };
  const rawInput = { ...input }; delete rawInput.artifactId;
  const mapOrder = createCelestialConnectionEtsyWorkflowRecord({ productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture");
  assert.equal(createCelestialConnectionEtsyWorkflowRecord({ productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture").reportId, mapOrder.reportId);
  assert.throws(() => approveCelestialConnectionWorkflowRecord(mapOrder.reportId, "reviewer_fixture", []), CelestialConnectionWorkflowError);
  const approved = approveCelestialConnectionWorkflowRecord(mapOrder.reportId, "reviewer_fixture", CELESTIAL_CONNECTION_QA_ITEM_IDS);
  CONNECTION_MAP_PRINT_SIZES.forEach((size, index) => recordCelestialConnectionExport(approved.reportId, { documentKind: "connection_map", size, fileName: `map-${size}.pdf`, sha256: String(index + 1).repeat(64), bytes: 1_000 + index, exportedBy: "reviewer_fixture", exportedAt: `2026-08-26T18:1${index}:00.000Z` }));
  assert.equal(isCelestialConnectionReadyForExternalDelivery(createCelestialConnectionEtsyWorkflowRecord({ productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture")), true);
  const reportOrder = createCelestialConnectionEtsyWorkflowRecord({ productKey: "relationship_report", source: { ...source, receiptId: "connection-report-1002", transactionId: "connection-report-tx-1002" }, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture");
  await assert.rejects(synthesizeCelestialConnectionWorkflowRecord(reportOrder.reportId, "operator_fixture", false), (error) => error instanceof CelestialConnectionWorkflowError && error.code === "consent_required");
  console.log("  ok  idempotency, QA, consent, and SKU-specific delivery boundaries");
  console.log("Celestial Connection runtime checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
