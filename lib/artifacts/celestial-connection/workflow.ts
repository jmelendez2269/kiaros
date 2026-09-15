import { createHash, randomUUID } from "node:crypto";

import type { EtsyArtifactSource } from "../fulfillment/contract.ts";
import { buildFulfillmentUnitKey } from "../fulfillment/workflow.ts";
import { calculateCelestialConnection } from "./calculation.ts";
import {
  CELESTIAL_CONNECTION_PRODUCTS, CELESTIAL_CONNECTION_QA_ITEM_IDS, CONNECTION_MAP_PRINT_SIZES,
  CelestialConnectionContractError, type CelestialConnectionArtifact, type CelestialConnectionInput,
  type CelestialConnectionPaperSize, type CelestialConnectionProductKey, type CelestialConnectionQaItemId,
  type ConnectionMapPrintSize,
} from "./contract.ts";
import { assertConnectionMapDeliverable, assertConnectionReportDeliverable, generateCelestialConnectionArtifact } from "./generator.ts";
import { generateCelestialConnectionNarrative } from "./narrative.ts";

export const CELESTIAL_CONNECTION_WORKFLOW_VERSION = "kairos.celestial-connection-workflow.v1" as const;
export const CELESTIAL_CONNECTION_WORKFLOW_STAGES = ["calculated", "pending_review", "approved", "rejected"] as const;
export type CelestialConnectionWorkflowStage = (typeof CELESTIAL_CONNECTION_WORKFLOW_STAGES)[number];
export interface CelestialConnectionEtsyOrderInput { productKey: CelestialConnectionProductKey; source: EtsyArtifactSource; supportEmail: string; }
export interface CelestialConnectionEtsyOrder extends CelestialConnectionEtsyOrderInput {
  productLabel: string; sku: (typeof CELESTIAL_CONNECTION_PRODUCTS)[CelestialConnectionProductKey]["sku"];
  fulfillmentUnitKey: string; sourcePayloadFingerprint: string; createdBy: string;
}
export interface CelestialConnectionExportEvidence { documentKind: "report" | "connection_map"; size: CelestialConnectionPaperSize | ConnectionMapPrintSize; fileName: string; sha256: string; bytes: number; exportedBy: string; exportedAt: string; }
export interface CelestialConnectionWorkflowRecord {
  workflowVersion: typeof CELESTIAL_CONNECTION_WORKFLOW_VERSION; reportId: string; order: CelestialConnectionEtsyOrder;
  stage: CelestialConnectionWorkflowStage; artifact: CelestialConnectionArtifact;
  externalAiConsent: { confirmedBy: string; confirmedAt: string; disclosureVersion: "celestial-connection-calculated-facts.v1" } | null;
  operatorReview: { decision: "approved" | "rejected"; reviewer: string; reviewedAt: string; note: string | null; completedItemIds: readonly CelestialConnectionQaItemId[] } | null;
  reviewNote: string | null; exports: readonly CelestialConnectionExportEvidence[]; createdAt: string; updatedAt: string;
}
export class CelestialConnectionWorkflowError extends Error {
  readonly code: "not_found" | "invalid_transition" | "consent_required" | "ambiguous_intake" | "idempotency_conflict";
  constructor(code: CelestialConnectionWorkflowError["code"], message: string) { super(message); this.name = "CelestialConnectionWorkflowError"; this.code = code; }
}
const globalRecords = globalThis as typeof globalThis & { __kiarosCelestialConnectionWorkflow?: Map<string, CelestialConnectionWorkflowRecord> };
function records(): Map<string, CelestialConnectionWorkflowRecord> { globalRecords.__kiarosCelestialConnectionWorkflow ??= new Map(); return globalRecords.__kiarosCelestialConnectionWorkflow; }
function canonicalJson(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonicalJson); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalJson(item)])); return value; }
function fingerprint(order: CelestialConnectionEtsyOrderInput, input: CelestialConnectionInput): string { return createHash("sha256").update(JSON.stringify(canonicalJson({ order: { ...order, supportEmail: order.supportEmail.trim().toLowerCase() }, input: { ...input, artifactId: null } }))).digest("hex"); }
function requireRecord(reportId: string): CelestialConnectionWorkflowRecord { const record = records().get(reportId); if (!record) throw new CelestialConnectionWorkflowError("not_found", "Celestial Connection order not found."); return record; }
function save(record: CelestialConnectionWorkflowRecord): CelestialConnectionWorkflowRecord { records().set(record.reportId, record); return record; }
export function listCelestialConnectionWorkflowRecords(): readonly CelestialConnectionWorkflowRecord[] { return [...records().values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function getCelestialConnectionWorkflowRecord(reportId: string): CelestialConnectionWorkflowRecord { return requireRecord(reportId); }
export function createCelestialConnectionEtsyWorkflowRecord(orderInput: CelestialConnectionEtsyOrderInput, rawInput: Omit<CelestialConnectionInput, "artifactId">, actorId: string, now = new Date()): CelestialConnectionWorkflowRecord {
  buildFulfillmentUnitKey(orderInput.source); if (!/^\S+@\S+\.\S+$/.test(orderInput.supportEmail.trim())) throw new CelestialConnectionWorkflowError("ambiguous_intake", "A valid Etsy support email is required.");
  const sourcePayloadFingerprint = fingerprint(orderInput, { ...rawInput, artifactId: "connection_fingerprint" }); const fulfillmentUnitKey = buildFulfillmentUnitKey(orderInput.source);
  const existing = [...records().values()].find((record) => record.order.fulfillmentUnitKey === fulfillmentUnitKey); if (existing) { if (existing.order.sourcePayloadFingerprint === sourcePayloadFingerprint) return existing; throw new CelestialConnectionWorkflowError("idempotency_conflict", "This Etsy fulfillment unit already exists with different people, relationship, or birth data."); }
  const input: CelestialConnectionInput = { ...rawInput, artifactId: `connection_order_${sourcePayloadFingerprint.slice(0, 32)}` };
  let calculation; try { calculation = calculateCelestialConnection(input); } catch (error) { if (error instanceof CelestialConnectionContractError) throw new CelestialConnectionWorkflowError("ambiguous_intake", error.message); throw error; }
  const artifact = generateCelestialConnectionArtifact({ input, calculation, narrative: null }); const timestamp = now.toISOString(); const product = CELESTIAL_CONNECTION_PRODUCTS[orderInput.productKey];
  return save({ workflowVersion: CELESTIAL_CONNECTION_WORKFLOW_VERSION, reportId: `ccr_${randomUUID().replace(/-/g, "")}`,
    order: { ...orderInput, supportEmail: orderInput.supportEmail.trim().toLowerCase(), productLabel: product.label, sku: product.sku, fulfillmentUnitKey, sourcePayloadFingerprint, createdBy: actorId },
    stage: "calculated", artifact, externalAiConsent: null, operatorReview: null, reviewNote: null, exports: [], createdAt: timestamp, updatedAt: timestamp });
}
export async function synthesizeCelestialConnectionWorkflowRecord(reportId: string, actorId: string, externalAiConsent: boolean, now = new Date()): Promise<CelestialConnectionWorkflowRecord> {
  if (!externalAiConsent) throw new CelestialConnectionWorkflowError("consent_required", "Confirm that calculated chart facts for both people may be sent to the configured AI provider.");
  const record = requireRecord(reportId); if (record.order.productKey !== "relationship_report") throw new CelestialConnectionWorkflowError("invalid_transition", "The standalone connection map does not include AI-written interpretation.");
  if (!["calculated", "rejected"].includes(record.stage)) throw new CelestialConnectionWorkflowError("invalid_transition", "The report can only be written from a calculated or rejected order.");
  const narrative = await generateCelestialConnectionNarrative(record.artifact.input, record.artifact.calculation); const timestamp = now.toISOString();
  return save({ ...record, stage: "pending_review", artifact: generateCelestialConnectionArtifact({ input: record.artifact.input, calculation: record.artifact.calculation, narrative }),
    externalAiConsent: { confirmedBy: actorId, confirmedAt: timestamp, disclosureVersion: "celestial-connection-calculated-facts.v1" }, operatorReview: null, reviewNote: null, exports: [], updatedAt: timestamp });
}
export function approveCelestialConnectionWorkflowRecord(reportId: string, actorId: string, completedQa: readonly CelestialConnectionQaItemId[], now = new Date()): CelestialConnectionWorkflowRecord {
  const record = requireRecord(reportId); const allowed = record.order.productKey === "relationship_report" ? "pending_review" : "calculated";
  if (record.stage !== allowed) throw new CelestialConnectionWorkflowError("invalid_transition", `This product must be ${allowed.replace(/_/g, " ")} before approval.`);
  const completed = new Set(completedQa); if (CELESTIAL_CONNECTION_QA_ITEM_IDS.some((item) => !completed.has(item))) throw new CelestialConnectionWorkflowError("invalid_transition", "Complete every Celestial Connection QA item before approval.");
  if (record.order.productKey === "relationship_report") assertConnectionReportDeliverable(record.artifact); else assertConnectionMapDeliverable(record.artifact);
  return save({ ...record, stage: "approved", operatorReview: { decision: "approved", reviewer: actorId, reviewedAt: now.toISOString(), note: null, completedItemIds: [...completedQa] }, reviewNote: null, updatedAt: now.toISOString() });
}
export function rejectCelestialConnectionWorkflowRecord(reportId: string, actorId: string, note: string, now = new Date()): CelestialConnectionWorkflowRecord {
  const record = requireRecord(reportId); if (!["calculated", "pending_review"].includes(record.stage)) throw new CelestialConnectionWorkflowError("invalid_transition", "Only a calculated or pending-review connection can be rejected.");
  const clean = note.trim(); if (!clean) throw new CelestialConnectionWorkflowError("invalid_transition", "A rejection needs a revision note.");
  return save({ ...record, stage: "rejected", operatorReview: { decision: "rejected", reviewer: actorId, reviewedAt: now.toISOString(), note: clean, completedItemIds: [] }, reviewNote: clean, exports: [], updatedAt: now.toISOString() });
}
export function requiredCelestialConnectionExportKeys(record: CelestialConnectionWorkflowRecord): readonly string[] { return record.order.productKey === "relationship_report" ? ["report:letter", "report:a4"] : CONNECTION_MAP_PRINT_SIZES.map((size) => `connection_map:${size}`); }
export function isCelestialConnectionReadyForExternalDelivery(record: CelestialConnectionWorkflowRecord): boolean { const exported = new Set(record.exports.map((item) => `${item.documentKind}:${item.size}`)); return record.stage === "approved" && requiredCelestialConnectionExportKeys(record).every((key) => exported.has(key)); }
export function recordCelestialConnectionExport(reportId: string, evidence: CelestialConnectionExportEvidence): CelestialConnectionWorkflowRecord {
  const record = requireRecord(reportId); if (record.stage !== "approved") throw new CelestialConnectionWorkflowError("invalid_transition", "Approve the purchased product before export.");
  const requiredKind = record.order.productKey === "relationship_report" ? "report" : "connection_map"; if (evidence.documentKind !== requiredKind) throw new CelestialConnectionWorkflowError("invalid_transition", "This export is not included in the purchased SKU.");
  return save({ ...record, exports: [...record.exports.filter((item) => item.documentKind !== evidence.documentKind || item.size !== evidence.size), evidence], updatedAt: evidence.exportedAt });
}
