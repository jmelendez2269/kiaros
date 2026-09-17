import { createHash, randomUUID } from "node:crypto";

import type { EtsyArtifactSource } from "../fulfillment/contract.ts";
import { buildFulfillmentUnitKey } from "../fulfillment/workflow.ts";
import { calculateYearAhead } from "./calculation.ts";
import {
  CELESTIAL_YEAR_MAP_PRINT_SIZES,
  YEAR_AHEAD_PRODUCTS,
  YEAR_AHEAD_QA_ITEM_IDS,
  YearAheadContractError,
  type CelestialYearMapPrintSize,
  type YearAheadArtifact,
  type YearAheadInput,
  type YearAheadPaperSize,
  type YearAheadProductKey,
  type YearAheadQaItemId,
} from "./contract.ts";
import {
  assertYearAheadReportDeliverable,
  assertYearMapDeliverable,
  generateYearAheadArtifact,
} from "./generator.ts";
import { generateYearAheadNarrative } from "./narrative.ts";

export const YEAR_AHEAD_WORKFLOW_VERSION = "kairos.year-ahead-workflow.v1" as const;
export const YEAR_AHEAD_WORKFLOW_STAGES = ["calculated", "pending_review", "approved", "rejected"] as const;
export type YearAheadWorkflowStage = (typeof YEAR_AHEAD_WORKFLOW_STAGES)[number];

export interface YearAheadEtsyOrderInput {
  productKey: YearAheadProductKey;
  source: EtsyArtifactSource;
  supportEmail: string;
}

export interface YearAheadEtsyOrder extends YearAheadEtsyOrderInput {
  productLabel: string;
  sku: (typeof YEAR_AHEAD_PRODUCTS)[YearAheadProductKey]["sku"];
  fulfillmentUnitKey: string;
  sourcePayloadFingerprint: string;
  createdBy: string;
}

export interface YearAheadExportEvidence {
  documentKind: "report" | "year_map";
  size: YearAheadPaperSize | CelestialYearMapPrintSize;
  fileName: string;
  sha256: string;
  bytes: number;
  exportedBy: string;
  exportedAt: string;
}

export interface YearAheadWorkflowRecord {
  workflowVersion: typeof YEAR_AHEAD_WORKFLOW_VERSION;
  reportId: string;
  order: YearAheadEtsyOrder;
  stage: YearAheadWorkflowStage;
  artifact: YearAheadArtifact;
  externalAiConsent: {
    confirmedBy: string;
    confirmedAt: string;
    disclosureVersion: "year-ahead-calculated-facts.v1";
  } | null;
  operatorReview: {
    decision: "approved" | "rejected";
    reviewer: string;
    reviewedAt: string;
    note: string | null;
    completedItemIds: readonly YearAheadQaItemId[];
  } | null;
  reviewNote: string | null;
  exports: readonly YearAheadExportEvidence[];
  createdAt: string;
  updatedAt: string;
}

export class YearAheadWorkflowError extends Error {
  readonly code: "not_found" | "invalid_transition" | "consent_required" | "ambiguous_intake" | "idempotency_conflict";
  constructor(code: YearAheadWorkflowError["code"], message: string) {
    super(message);
    this.name = "YearAheadWorkflowError";
    this.code = code;
  }
}

const workflowGlobal = globalThis as typeof globalThis & {
  __kiarosYearAheadWorkflow?: Map<string, YearAheadWorkflowRecord>;
};

function records(): Map<string, YearAheadWorkflowRecord> {
  workflowGlobal.__kiarosYearAheadWorkflow ??= new Map();
  return workflowGlobal.__kiarosYearAheadWorkflow;
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}

function fingerprint(order: YearAheadEtsyOrderInput, input: YearAheadInput): string {
  const purchasedAt = new Date(order.source.purchasedAt);
  return createHash("sha256").update(JSON.stringify(canonicalJson({
    order: {
      ...order,
      supportEmail: order.supportEmail.trim().toLowerCase(),
      source: { ...order.source, purchasedAt: Number.isNaN(purchasedAt.valueOf()) ? order.source.purchasedAt : purchasedAt.toISOString() },
    },
    input: { ...input, artifactId: null },
  }))).digest("hex");
}

function requireRecord(reportId: string): YearAheadWorkflowRecord {
  const record = records().get(reportId);
  if (!record) throw new YearAheadWorkflowError("not_found", "Year Ahead order not found.");
  return record;
}

function save(record: YearAheadWorkflowRecord): YearAheadWorkflowRecord {
  records().set(record.reportId, record);
  return record;
}

export function listYearAheadWorkflowRecords(): readonly YearAheadWorkflowRecord[] {
  return [...records().values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getYearAheadWorkflowRecord(reportId: string): YearAheadWorkflowRecord {
  return requireRecord(reportId);
}

export function createYearAheadEtsyWorkflowRecord(
  orderInput: YearAheadEtsyOrderInput,
  rawInput: Omit<YearAheadInput, "artifactId">,
  actorId: string,
  now = new Date(),
): YearAheadWorkflowRecord {
  buildFulfillmentUnitKey(orderInput.source);
  if (!/^\S+@\S+\.\S+$/.test(orderInput.supportEmail.trim())) {
    throw new YearAheadWorkflowError("ambiguous_intake", "A valid Etsy support email is required.");
  }
  const sourcePayloadFingerprint = fingerprint(orderInput, { ...rawInput, artifactId: "year_fingerprint" });
  const fulfillmentUnitKey = buildFulfillmentUnitKey(orderInput.source);
  const existing = [...records().values()].find((record) => record.order.fulfillmentUnitKey === fulfillmentUnitKey);
  if (existing) {
    if (existing.order.sourcePayloadFingerprint === sourcePayloadFingerprint) return existing;
    throw new YearAheadWorkflowError("idempotency_conflict", "This Etsy fulfillment unit already exists with different order, birth, year, or birthday-location data.");
  }
  const input: YearAheadInput = {
    ...rawInput,
    artifactId: `year_order_${sourcePayloadFingerprint.slice(0, 32)}`,
  };
  let calculation;
  try {
    calculation = calculateYearAhead(input);
  } catch (error) {
    if (error instanceof YearAheadContractError) {
      throw new YearAheadWorkflowError("ambiguous_intake", error.message);
    }
    throw error;
  }
  const artifact = generateYearAheadArtifact({ input, calculation, narrative: null });
  const timestamp = now.toISOString();
  const product = YEAR_AHEAD_PRODUCTS[orderInput.productKey];
  return save({
    workflowVersion: YEAR_AHEAD_WORKFLOW_VERSION,
    reportId: `yar_${randomUUID().replace(/-/g, "")}`,
    order: {
      ...orderInput,
      supportEmail: orderInput.supportEmail.trim().toLowerCase(),
      productLabel: product.label,
      sku: product.sku,
      fulfillmentUnitKey,
      sourcePayloadFingerprint,
      createdBy: actorId,
    },
    stage: "calculated",
    artifact,
    externalAiConsent: null,
    operatorReview: null,
    reviewNote: null,
    exports: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function synthesizeYearAheadWorkflowRecord(
  reportId: string,
  actorId: string,
  externalAiConsent: boolean,
  now = new Date(),
): Promise<YearAheadWorkflowRecord> {
  if (!externalAiConsent) throw new YearAheadWorkflowError("consent_required", "Confirm that calculated chart facts may be sent to the configured AI provider.");
  const record = requireRecord(reportId);
  if (record.order.productKey !== "year_ahead_report") {
    throw new YearAheadWorkflowError("invalid_transition", "The standalone Celestial Year Map does not include an AI-written interpretation.");
  }
  if (!["calculated", "rejected"].includes(record.stage)) {
    throw new YearAheadWorkflowError("invalid_transition", "The forecast can only be written from a calculated or rejected order.");
  }
  const narrative = await generateYearAheadNarrative(record.artifact.calculation);
  const timestamp = now.toISOString();
  return save({
    ...record,
    stage: "pending_review",
    artifact: generateYearAheadArtifact({ input: record.artifact.input, calculation: record.artifact.calculation, narrative }),
    externalAiConsent: { confirmedBy: actorId, confirmedAt: timestamp, disclosureVersion: "year-ahead-calculated-facts.v1" },
    operatorReview: null,
    reviewNote: null,
    exports: [],
    updatedAt: timestamp,
  });
}

export function approveYearAheadWorkflowRecord(
  reportId: string,
  actorId: string,
  completedQa: readonly YearAheadQaItemId[],
  now = new Date(),
): YearAheadWorkflowRecord {
  const record = requireRecord(reportId);
  const allowedStage = record.order.productKey === "year_ahead_report" ? "pending_review" : "calculated";
  if (record.stage !== allowedStage) throw new YearAheadWorkflowError("invalid_transition", `This product must be ${allowedStage.replace(/_/g, " ")} before approval.`);
  const completed = new Set(completedQa);
  if (YEAR_AHEAD_QA_ITEM_IDS.some((item) => !completed.has(item))) {
    throw new YearAheadWorkflowError("invalid_transition", "Complete every Year Ahead QA item before approval.");
  }
  if (record.order.productKey === "year_ahead_report") assertYearAheadReportDeliverable(record.artifact);
  else assertYearMapDeliverable(record.artifact);
  return save({
    ...record,
    stage: "approved",
    operatorReview: { decision: "approved", reviewer: actorId, reviewedAt: now.toISOString(), note: null, completedItemIds: [...completedQa] },
    reviewNote: null,
    updatedAt: now.toISOString(),
  });
}

export function rejectYearAheadWorkflowRecord(
  reportId: string,
  actorId: string,
  note: string,
  now = new Date(),
): YearAheadWorkflowRecord {
  const record = requireRecord(reportId);
  if (!["calculated", "pending_review"].includes(record.stage)) {
    throw new YearAheadWorkflowError("invalid_transition", "Only a calculated or pending-review forecast can be rejected.");
  }
  const cleanNote = note.trim();
  if (!cleanNote) throw new YearAheadWorkflowError("invalid_transition", "A rejection needs a revision note.");
  return save({
    ...record,
    stage: "rejected",
    operatorReview: { decision: "rejected", reviewer: actorId, reviewedAt: now.toISOString(), note: cleanNote, completedItemIds: [] },
    reviewNote: cleanNote,
    exports: [],
    updatedAt: now.toISOString(),
  });
}

export function requiredYearAheadExportKeys(record: YearAheadWorkflowRecord): readonly string[] {
  return record.order.productKey === "year_ahead_report"
    ? ["report:letter", "report:a4"]
    : CELESTIAL_YEAR_MAP_PRINT_SIZES.map((size) => `year_map:${size}`);
}

export function isYearAheadReadyForExternalDelivery(record: YearAheadWorkflowRecord): boolean {
  if (record.stage !== "approved") return false;
  const exported = new Set(record.exports.map((item) => `${item.documentKind}:${item.size}`));
  return requiredYearAheadExportKeys(record).every((key) => exported.has(key));
}

export function recordYearAheadExport(reportId: string, evidence: YearAheadExportEvidence): YearAheadWorkflowRecord {
  const record = requireRecord(reportId);
  if (record.stage !== "approved") throw new YearAheadWorkflowError("invalid_transition", "Approve the purchased product before export.");
  const requiredKind = record.order.productKey === "year_ahead_report" ? "report" : "year_map";
  if (evidence.documentKind !== requiredKind) throw new YearAheadWorkflowError("invalid_transition", "This export is not included in the purchased SKU.");
  return save({
    ...record,
    exports: [...record.exports.filter((item) => item.documentKind !== evidence.documentKind || item.size !== evidence.size), evidence],
    updatedAt: evidence.exportedAt,
  });
}
