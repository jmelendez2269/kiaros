import { createHash, randomUUID } from "node:crypto";

import { computeNatalChart, type BirthData } from "@/lib/ephemeris/astronomia-adapter";
import type { EtsyArtifactSource } from "@/lib/artifacts/fulfillment/contract";
import { buildFulfillmentUnitKey } from "@/lib/artifacts/fulfillment/workflow";
import {
  approveReport,
  assertDeliverable,
  rejectReport,
  STAR_ORIGIN_QA_ITEM_IDS,
  type StarFamilyChartPrintSize,
  type StarOriginArtifact,
  type StarOriginPaperSize,
  type StarOriginQaItemId,
} from "./contract.ts";
import { LINEAGE_MEANINGS } from "./content/lineage-meanings.ts";
import { attachSynthesis } from "./lifetime/attach.ts";
import { allowedNames, chartFacts } from "./lifetime/facts.ts";
import { generateSynthesis } from "./lifetime/synthesis.ts";
import {
  generateProductionStarOrigin,
  type GenerateProductionStarOriginInput,
} from "./production.ts";

export const STAR_ORIGIN_WORKFLOW_VERSION = "kairos.star-origin-workflow.v1" as const;

export const STAR_ORIGIN_ETSY_PRODUCTS = {
  star_origin_report: {
    label: "Star Origin Interpretive Report",
    sku: "KAI-ETSY-STAR-ORIGIN-REPORT-V1",
    description: "The complete interpretive reading in US Letter and A4.",
  },
  star_family_chart: {
    label: "Star Family Birth Chart",
    sku: "KAI-ETSY-STAR-FAMILY-CHART-V1",
    description: "The standalone celestial wall print in five print sizes.",
  },
} as const;

export type StarOriginEtsyProductKey = keyof typeof STAR_ORIGIN_ETSY_PRODUCTS;

export interface StarOriginEtsyOrderInput {
  productKey: StarOriginEtsyProductKey;
  source: EtsyArtifactSource;
  supportEmail: string;
}

export interface StarOriginEtsyOrder {
  productKey: StarOriginEtsyProductKey;
  productLabel: string;
  sku: (typeof STAR_ORIGIN_ETSY_PRODUCTS)[StarOriginEtsyProductKey]["sku"];
  fulfillmentUnitKey: string;
  supportEmail: string;
  source: EtsyArtifactSource;
  sourcePayloadFingerprint: string;
  createdBy: string;
}

export const STAR_ORIGIN_WORKFLOW_STAGES = [
  "generated",
  "pending_review",
  "approved",
  "rejected",
] as const;

export type StarOriginWorkflowStage = (typeof STAR_ORIGIN_WORKFLOW_STAGES)[number];

export interface StarOriginExportEvidence {
  documentKind: "report" | "chart_print";
  paperSize: StarOriginPaperSize | StarFamilyChartPrintSize;
  fileName: string;
  sha256: string;
  bytes: number;
  exportedBy: string;
  exportedAt: string;
}

export interface StarOriginWorkflowRecord {
  workflowVersion: typeof STAR_ORIGIN_WORKFLOW_VERSION;
  reportId: string;
  order: StarOriginEtsyOrder | null;
  stage: StarOriginWorkflowStage;
  baseArtifact: StarOriginArtifact;
  artifact: StarOriginArtifact;
  externalAiConsent: {
    confirmedBy: string;
    confirmedAt: string;
    disclosureVersion: "star-origin-derived-facts.v1";
  } | null;
  operatorReview: {
    decision: "approved" | "rejected";
    reviewer: string;
    reviewedAt: string;
    note: string | null;
    completedItemIds: readonly StarOriginQaItemId[];
  } | null;
  reviewNote: string | null;
  exports: readonly StarOriginExportEvidence[];
  createdAt: string;
  updatedAt: string;
}

export class StarOriginWorkflowError extends Error {
  readonly code:
    | "not_found"
    | "invalid_transition"
    | "consent_required"
    | "synthesis_rejected"
    | "ambiguous_intake"
    | "idempotency_conflict";

  constructor(
    code: StarOriginWorkflowError["code"],
    message: string,
  ) {
    super(message);
    this.name = "StarOriginWorkflowError";
    this.code = code;
  }
}

const workflowGlobal = globalThis as typeof globalThis & {
  __kiarosStarOriginWorkflow?: Map<string, StarOriginWorkflowRecord>;
};

function records(): Map<string, StarOriginWorkflowRecord> {
  workflowGlobal.__kiarosStarOriginWorkflow ??= new Map();
  return workflowGlobal.__kiarosStarOriginWorkflow;
}

function requireRecord(reportId: string): StarOriginWorkflowRecord {
  const record = records().get(reportId);
  if (!record) throw new StarOriginWorkflowError("not_found", "Star Origin report not found.");
  return record;
}

function save(record: StarOriginWorkflowRecord): StarOriginWorkflowRecord {
  records().set(record.reportId, record);
  return record;
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalJson(item)]),
    );
  }
  return value;
}

export function fingerprintStarOriginEtsyIntake(
  order: StarOriginEtsyOrderInput,
  input: GenerateProductionStarOriginInput,
): string {
  const purchasedAt = new Date(order.source.purchasedAt);
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonicalJson({
          order: {
            ...order,
            supportEmail: order.supportEmail.trim().toLowerCase(),
            source: {
              ...order.source,
              purchasedAt: Number.isNaN(purchasedAt.valueOf())
                ? order.source.purchasedAt
                : purchasedAt.toISOString(),
            },
          },
          input: {
            displayName: input.displayName,
            tier: input.tier,
            normalizedBirth: input.normalizedBirth,
          },
        }),
      ),
    )
    .digest("hex");
}

function validateStarOriginEtsyOrder(
  order: StarOriginEtsyOrderInput,
  input: GenerateProductionStarOriginInput,
): void {
  buildFulfillmentUnitKey(order.source);
  if (!/^\S+@\S+\.\S+$/.test(order.supportEmail.trim())) {
    throw new StarOriginWorkflowError(
      "ambiguous_intake",
      "A valid Etsy support email is required.",
    );
  }
  if (!STAR_ORIGIN_ETSY_PRODUCTS[order.productKey]) {
    throw new StarOriginWorkflowError(
      "ambiguous_intake",
      "Choose one supported Star Origin product.",
    );
  }
  if (input.tier !== "standard" || input.normalizedBirth.timeUnknown) {
    throw new StarOriginWorkflowError(
      "ambiguous_intake",
      "Both Star Origin Etsy products require the Standard known-time calculation.",
    );
  }
}

export function listStarOriginWorkflowRecords(): readonly StarOriginWorkflowRecord[] {
  return [...records().values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getStarOriginWorkflowRecord(reportId: string): StarOriginWorkflowRecord {
  return requireRecord(reportId);
}

export function createStarOriginWorkflowRecord(
  input: GenerateProductionStarOriginInput,
  now = new Date(),
): StarOriginWorkflowRecord {
  const artifact = generateProductionStarOrigin(input);
  const timestamp = now.toISOString();
  return save({
    workflowVersion: STAR_ORIGIN_WORKFLOW_VERSION,
    reportId: `sor_${randomUUID().split("-").join("")}`,
    order: null,
    stage: "generated",
    baseArtifact: artifact,
    artifact,
    externalAiConsent: null,
    operatorReview: null,
    reviewNote: null,
    exports: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createStarOriginEtsyWorkflowRecord(
  orderInput: StarOriginEtsyOrderInput,
  input: GenerateProductionStarOriginInput,
  actorId: string,
  now = new Date(),
): StarOriginWorkflowRecord {
  validateStarOriginEtsyOrder(orderInput, input);
  const fulfillmentUnitKey = buildFulfillmentUnitKey(orderInput.source);
  const sourcePayloadFingerprint = fingerprintStarOriginEtsyIntake(
    orderInput,
    input,
  );
  const existing = [...records().values()].find(
    (record) => record.order?.fulfillmentUnitKey === fulfillmentUnitKey,
  );
  if (existing) {
    if (
      existing.order?.sourcePayloadFingerprint === sourcePayloadFingerprint
    ) {
      return existing;
    }
    throw new StarOriginWorkflowError(
      "idempotency_conflict",
      "This Etsy fulfillment unit already exists with different order or birth data.",
    );
  }

  const product = STAR_ORIGIN_ETSY_PRODUCTS[orderInput.productKey];
  const artifact = generateProductionStarOrigin({
    ...input,
    artifactId: `star_order_${sourcePayloadFingerprint.slice(0, 32)}`,
  });
  const timestamp = now.toISOString();
  return save({
    workflowVersion: STAR_ORIGIN_WORKFLOW_VERSION,
    reportId: `sor_${randomUUID().split("-").join("")}`,
    order: {
      productKey: orderInput.productKey,
      productLabel: product.label,
      sku: product.sku,
      fulfillmentUnitKey,
      supportEmail: orderInput.supportEmail.trim().toLowerCase(),
      source: orderInput.source,
      sourcePayloadFingerprint,
      createdBy: actorId,
    },
    stage: "generated",
    baseArtifact: artifact,
    artifact,
    externalAiConsent: null,
    operatorReview: null,
    reviewNote: null,
    exports: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function requiredStarOriginExportKeys(
  record: StarOriginWorkflowRecord,
): readonly string[] {
  if (!record.order) return [];
  return record.order.productKey === "star_origin_report"
    ? ["report:letter", "report:a4"]
    : [
        "chart_print:8x10",
        "chart_print:11x14",
        "chart_print:16x20",
        "chart_print:a4",
        "chart_print:a3",
      ];
}

export function isStarOriginOrderReadyForExternalDelivery(
  record: StarOriginWorkflowRecord,
): boolean {
  const required = requiredStarOriginExportKeys(record);
  if (!required.length || record.stage !== "approved") return false;
  const exported = new Set(
    record.exports.map((item) => `${item.documentKind}:${item.paperSize}`),
  );
  return required.every((key) => exported.has(key));
}

function birthDataFor(artifact: StarOriginArtifact): BirthData {
  const birth = artifact.normalizedBirth;
  return {
    date: birth.date,
    time: birth.timeUnknown ? "12:00" : birth.time ?? "12:00",
    timezone: birth.timezone,
    lat: birth.latitude,
    lng: birth.longitude,
    timeUnknown: birth.timeUnknown,
  };
}

function lineageIds(artifact: StarOriginArtifact): string[] {
  if (artifact.result.kind === "spread") return [];
  if (artifact.result.kind === "single") return [artifact.result.primary.lineageId];
  return [artifact.result.primary.lineageId, artifact.result.secondary.lineageId];
}

export async function synthesizeStarOriginWorkflowRecord(
  reportId: string,
  actorId: string,
  externalAiConsent: boolean,
  now = new Date(),
): Promise<StarOriginWorkflowRecord> {
  if (!externalAiConsent) {
    throw new StarOriginWorkflowError(
      "consent_required",
      "Confirm that chart-derived facts may be sent to the configured AI Gateway.",
    );
  }
  const record = requireRecord(reportId);
  if (!["generated", "rejected"].includes(record.stage)) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Personalization can only be generated from a generated or rejected report.",
    );
  }

  const ids = lineageIds(record.baseArtifact);
  if (ids.length === 0) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "A spread report has no named lineage to personalize; review the composed report instead.",
    );
  }

  const meanings = ids.map((id) => LINEAGE_MEANINGS[id]).filter(Boolean);
  const chart = computeNatalChart(birthDataFor(record.baseArtifact), "whole_sign");
  const facts = chartFacts(chart);
  const starNames = record.baseArtifact.workings.map((row) => row.star);
  const names = meanings.map((meaning) => meaning.displayName);
  const generated = await generateSynthesis({
    lineageName: names.join(" and "),
    lineageSummary: meanings
      .flatMap((meaning) => [meaning.nature, meaning.longing, meaning.purpose, meaning.cost])
      .join(" "),
    starContacts: record.baseArtifact.workings.map(
      (row) => `${row.star} meeting your ${row.marker}, ${row.separation} apart`,
    ),
    facts,
    allowedNames: allowedNames(facts, starNames, names.join(" and ")),
  });

  if (!generated.result) {
    const detail = generated.rejections.map((item) => `${item.reason}: ${item.detail}`).join("; ");
    throw new StarOriginWorkflowError(
      "synthesis_rejected",
      detail || "The personalized section failed validation twice and was omitted.",
    );
  }

  const timestamp = now.toISOString();
  return save({
    ...record,
    stage: "pending_review",
    artifact: attachSynthesis(record.baseArtifact, generated.result),
    externalAiConsent: {
      confirmedBy: actorId,
      confirmedAt: timestamp,
      disclosureVersion: "star-origin-derived-facts.v1",
    },
    operatorReview: null,
    reviewNote: null,
    exports: [],
    updatedAt: timestamp,
  });
}

export function approveStarOriginWorkflowRecord(
  reportId: string,
  actorId: string,
  now = new Date(),
  completedQa: readonly StarOriginQaItemId[] = [],
): StarOriginWorkflowRecord {
  const record = requireRecord(reportId);
  if (!["generated", "pending_review"].includes(record.stage)) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Only a generated report or pending personalized section can be approved.",
    );
  }
  const completed = new Set(completedQa);
  if (STAR_ORIGIN_QA_ITEM_IDS.some((item) => !completed.has(item))) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Complete every Star Origin QA item before approval.",
    );
  }
  const artifact = record.artifact.synthesisProvenance
    ? approveReport(record.artifact, actorId, now)
    : record.artifact;
  assertDeliverable(artifact);
  return save({
    ...record,
    stage: "approved",
    artifact,
    operatorReview: {
      decision: "approved",
      reviewer: actorId,
      reviewedAt: now.toISOString(),
      note: null,
      completedItemIds: [...completedQa],
    },
    reviewNote: null,
    updatedAt: now.toISOString(),
  });
}

export function rejectStarOriginWorkflowRecord(
  reportId: string,
  actorId: string,
  note: string,
  now = new Date(),
): StarOriginWorkflowRecord {
  const record = requireRecord(reportId);
  if (!["generated", "pending_review"].includes(record.stage)) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Only a generated report or pending personalized section can be rejected.",
    );
  }
  const cleanNote = note.trim();
  if (!cleanNote) {
    throw new StarOriginWorkflowError("invalid_transition", "A rejection needs a revision note.");
  }
  const artifact = record.artifact.synthesisProvenance
    ? rejectReport(record.artifact, actorId, cleanNote, now)
    : record.artifact;
  return save({
    ...record,
    stage: "rejected",
    artifact,
    operatorReview: {
      decision: "rejected",
      reviewer: actorId,
      reviewedAt: now.toISOString(),
      note: cleanNote,
      completedItemIds: [],
    },
    reviewNote: cleanNote,
    exports: [],
    updatedAt: now.toISOString(),
  });
}

export function recordStarOriginExport(
  reportId: string,
  evidence: StarOriginExportEvidence,
): StarOriginWorkflowRecord {
  const record = requireRecord(reportId);
  if (record.stage !== "approved") {
    throw new StarOriginWorkflowError("invalid_transition", "Approve the report before exporting it.");
  }
  assertDeliverable(record.artifact);
  if (
    record.order?.productKey === "star_origin_report" &&
    evidence.documentKind !== "report"
  ) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "This Etsy order is for the interpretive report, not the standalone wall print.",
    );
  }
  if (
    record.order?.productKey === "star_family_chart" &&
    evidence.documentKind !== "chart_print"
  ) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "This Etsy order is for the standalone wall print, not the interpretive report.",
    );
  }
  return save({
    ...record,
    exports: [
      ...record.exports.filter(
        (item) =>
          item.documentKind !== evidence.documentKind ||
          item.paperSize !== evidence.paperSize,
      ),
      evidence,
    ],
    updatedAt: evidence.exportedAt,
  });
}
