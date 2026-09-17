import assert from "node:assert/strict";

import { calculateCelestialConnection } from "../lib/artifacts/celestial-connection/calculation.ts";
import {
  CELESTIAL_CONNECTION_QA_ITEM_IDS,
  CONNECTION_DOMAIN_SECTION_IDS,
  CONNECTION_MAP_PRINT_SIZES,
  type CelestialConnectionInput,
  type CelestialConnectionNarrative,
} from "../lib/artifacts/celestial-connection/contract.ts";
import { renderConnectionMapHtml } from "../lib/artifacts/celestial-connection/connection-map-template.ts";
import { generateCelestialConnectionArtifact } from "../lib/artifacts/celestial-connection/generator.ts";
import { renderCelestialConnectionReportHtml } from "../lib/artifacts/celestial-connection/template.ts";
import {
  approveCelestialConnectionWorkflowRecord,
  CelestialConnectionWorkflowError,
  createCelestialConnectionEtsyWorkflowRecord,
  isCelestialConnectionReadyForExternalDelivery,
  recordCelestialConnectionExport,
  synthesizeCelestialConnectionWorkflowRecord,
} from "../lib/artifacts/celestial-connection/workflow.ts";

const input: CelestialConnectionInput = {
  artifactId: "connection_fixture_alex_jordan",
  relationshipType: "romantic",
  personA: {
    displayName: "Alex", date: "1991-06-09", time: "01:35", timeUnknown: false,
    place: { city: "Orlando", country: "United States", timezone: "America/New_York", latitude: 28.5383, longitude: -81.3792 },
  },
  personB: {
    displayName: "Jordan", date: "1989-11-14", time: "15:20", timeUnknown: false,
    place: { city: "Austin", country: "United States", timezone: "America/Chicago", latitude: 30.2672, longitude: -97.7431 },
  },
};

function block(title: string, sourceFactIds: readonly string[]) {
  return {
    title,
    summary: "A grounded summary of how this relationship pattern can be felt, including both its resources and its edges without turning symbolism into a verdict.",
    paragraphs: [
      "This developed fixture paragraph follows the calculated relationship facts and keeps both people visible. It names the pattern as a field of possibility, not a promise, and leaves room for communication, consent, context, and each person's choices.",
      "A second developed paragraph adds practical nuance by describing how the same signature may feel supportive in one moment and require care in another. It remains specific enough to exercise the premium report layout without predicting an outcome.",
    ] as const,
    anchors: [
      "Name what each person needs before deciding what the pattern means.",
      "Notice when this strength becomes pressure and choose a slower response.",
      "Return to one shared agreement that protects clarity and choice.",
    ] as const,
    sourceFactIds,
  };
}

async function main() {
  const calculation = calculateCelestialConnection(input);
  assert.equal(calculation.signatures.length, 3);
  assert.equal(new Set(calculation.signatures.map((item) => `${item.personAPoint}.${item.aspect}.${item.personBPoint}`)).size, 3);
  assert.ok(calculation.compositePlacements.length >= 8);
  assert.equal(calculation.precision.housesAvailable, true);
  assert.match(calculation.provenance.chartFingerprint, /^sha256:[a-f0-9]{64}$/);
  calculation.signatures.forEach((item) => assert.ok(calculation.facts.some((fact) => fact.id === item.id)));

  const unknownCalculation = calculateCelestialConnection({
    ...input,
    artifactId: "connection_fixture_unknown_time",
    personB: { ...input.personB, time: null, timeUnknown: true },
  });
  assert.equal(unknownCalculation.precision.housesAvailable, false);
  assert.equal(unknownCalculation.precision.moonAspectsAvailable, false);
  assert.ok(unknownCalculation.signatures.every((item) => item.personBPoint !== "Moon" && item.personAInPersonBHouse === null && item.personBInPersonAHouse === null));

  const factId = calculation.facts[0]!.id;
  const narrative: CelestialConnectionNarrative = {
    generationMethod: "ai_assisted_human_reviewed", model: "fixture-model", promptVersion: "celestial-connection.fixture.v1",
    tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    openingLetter: block("Opening", [factId]).paragraphs,
    relationshipEssence: block("A bond shaped by candor and responsive pacing", [factId]),
    signatures: calculation.signatures.map((signature) => ({
      ...block(signature.title, [signature.id]), signatureId: signature.id,
      repairPractice: "Pause, name the live need, and let both people revise the next step.",
    })) as unknown as CelestialConnectionNarrative["signatures"],
    domains: CONNECTION_DOMAIN_SECTION_IDS.map((id) => ({
      ...block(`A grounded view of ${id.replace(/_/g, " ")}`, [factId]), id,
    })) as unknown as CelestialConnectionNarrative["domains"],
    compositeCore: block("The relationship as a third space", [factId]),
    reflectionPrompts: [
      "What does each person experience as genuine reciprocity?", "Where does ease invite deeper attention?",
      "Which conversation becomes clearer when neither person rushes it?", "How can affection remain legible to both people?",
      "What helps friction become information instead of a verdict?", "Which shared value deserves a concrete agreement?",
      "Where does the relationship need more room for difference?", "What would responsible growth look like now?",
    ],
  };
  const artifact = generateCelestialConnectionArtifact({ input, calculation, narrative });
  const reportHtml = renderCelestialConnectionReportHtml(artifact, "letter");
  assert.match(reportHtml, /Your Top 3 signatures/);
  assert.match(reportHtml, /The relationship as a third space/);
  assert.doesNotMatch(reportHtml, /undefined|\[object Object\]/);
  const mapHtml = renderConnectionMapHtml(artifact, "11x14");
  assert.match(mapHtml, /@page\{size:279\.4mm 355\.6mm/);
  assert.match(mapHtml, /Terracotta orbit/);
  assert.match(mapHtml, /Lines 01/);

  const source = {
    source: "etsy" as const, shopId: "kairos", receiptId: "connection-map-1001", transactionId: "connection-map-tx-1001",
    unitIndex: 1, quantity: 1, listingId: "connection-map", purchasedAt: "2026-08-26T18:00:00.000Z",
  };
  const rawInput = { ...input, artifactId: undefined } as Omit<CelestialConnectionInput, "artifactId">;
  const mapOrder = createCelestialConnectionEtsyWorkflowRecord(
    { productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture",
  );
  assert.equal(mapOrder.order.sku, "KAI-ETSY-CELESTIAL-CONNECTION-MAP-V1");
  assert.equal(createCelestialConnectionEtsyWorkflowRecord(
    { productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture",
  ).reportId, mapOrder.reportId);
  assert.throws(() => approveCelestialConnectionWorkflowRecord(mapOrder.reportId, "reviewer_fixture", []), CelestialConnectionWorkflowError);
  const approved = approveCelestialConnectionWorkflowRecord(mapOrder.reportId, "reviewer_fixture", CELESTIAL_CONNECTION_QA_ITEM_IDS);
  CONNECTION_MAP_PRINT_SIZES.forEach((size, index) => recordCelestialConnectionExport(approved.reportId, {
    documentKind: "connection_map", size, fileName: `connection-map-${size}.pdf`, sha256: String(index + 1).repeat(64),
    bytes: 1_000 + index, exportedBy: "reviewer_fixture", exportedAt: `2026-08-26T18:1${index}:00.000Z`,
  }));
  const replay = createCelestialConnectionEtsyWorkflowRecord(
    { productKey: "connection_map", source, supportEmail: "buyer@example.com" }, rawInput, "operator_fixture",
  );
  assert.equal(isCelestialConnectionReadyForExternalDelivery(replay), true);

  const reportOrder = createCelestialConnectionEtsyWorkflowRecord(
    { productKey: "relationship_report", source: { ...source, receiptId: "connection-report-1002", transactionId: "connection-report-tx-1002" }, supportEmail: "buyer@example.com" },
    rawInput, "operator_fixture",
  );
  await assert.rejects(synthesizeCelestialConnectionWorkflowRecord(reportOrder.reportId, "operator_fixture", false),
    (error: unknown) => error instanceof CelestialConnectionWorkflowError && error.code === "consent_required");
  assert.throws(() => approveCelestialConnectionWorkflowRecord(reportOrder.reportId, "reviewer_fixture", CELESTIAL_CONNECTION_QA_ITEM_IDS), CelestialConnectionWorkflowError);

  console.log("Celestial Connection workflow checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
