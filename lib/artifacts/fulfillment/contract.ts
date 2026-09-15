import type {
  AnchorDocumentKind,
  AnchorPaperSize,
  AnchorPrintArtifact,
  AnchorPrintInput,
} from "../anchor-print/contract.ts";

export const ETSY_ARTIFACT_WORKFLOW_VERSION = "kairos.etsy-artifact-workflow.v1" as const;

export const ARTIFACT_FULFILLMENT_STATES = [
  "intake_draft",
  "clarification_required",
  "ready_to_generate",
  "generating",
  "qa_required",
  "revision_required",
  "approved",
  "exported",
  "ready_for_external_delivery",
  "canceled",
] as const;

export type ArtifactFulfillmentState = (typeof ARTIFACT_FULFILLMENT_STATES)[number];

export const ARTIFACT_FINANCIAL_STATUSES = ["paid", "refund_pending", "refunded"] as const;

export type ArtifactFinancialStatus = (typeof ARTIFACT_FINANCIAL_STATUSES)[number];

export const ARTIFACT_QA_ITEM_IDS = [
  "calculation",
  "narrative",
  "layout",
  "disclosures",
  "accessibility",
  "privacy_metadata",
] as const;

export type ArtifactQaItemId = (typeof ARTIFACT_QA_ITEM_IDS)[number];

export const ARTIFACT_QA_LABELS: Record<ArtifactQaItemId, string> = {
  calculation: "Calculation and uncertainty rules checked",
  narrative: "Narrative facts, spelling, and tone checked",
  layout: "Report and Anchor Print reviewed in Letter and A4",
  disclosures: "Scope, AI-assistance, and advice disclosures present",
  accessibility: "Reading order, text equivalents, and non-color cues checked",
  privacy_metadata: "Filename and buyer-visible metadata contain no private internals",
};

export const ARTIFACT_INTAKE_ALLOWLIST = [
  "shopId",
  "receiptId",
  "transactionId",
  "unitIndex",
  "quantity",
  "listingId",
  "sku",
  "purchasedAt",
  "supportEmail",
  "displayName",
  "birthDate",
  "birthTime",
  "birthTimeUnknown",
  "birthCity",
  "birthCountry",
] as const;

export interface EtsyArtifactSource {
  source: "etsy";
  shopId: string;
  receiptId: string;
  transactionId: string;
  unitIndex: number;
  quantity: number;
  listingId: string | null;
  purchasedAt: string;
}

export interface ArtifactOrderIntake {
  fictional: boolean;
  source: EtsyArtifactSource;
  sku: "KAI-ETSY-ANCHOR-V1";
  supportEmail: string;
  displayName: string | null;
  sourcePayloadFingerprint: string;
  generatorInput: AnchorPrintInput;
}

export interface ArtifactQaEvidence {
  revision: number;
  completedItemIds: readonly ArtifactQaItemId[];
  reviewedBy: string;
  reviewedAt: string;
}

export interface ArtifactFileEvidence {
  documentKind: AnchorDocumentKind;
  paperSize: AnchorPaperSize;
  revision: number;
  fileName: string;
  bytes: number;
  sha256: string;
  exportedBy: string;
  exportedAt: string;
  storageObjectKey: string | null;
}

export type ArtifactFileVariantKey =
  | "report:letter"
  | "report:a4"
  | "anchor_print:letter"
  | "anchor_print:a4";

export type ArtifactAuditEventType =
  | "intake_created"
  | "intake_replayed"
  | "clarification_requested"
  | "clarification_resolved"
  | "intake_validated"
  | "generation_started"
  | "generation_succeeded"
  | "generation_failed"
  | "qa_approved"
  | "revision_requested"
  | "export_recorded"
  | "external_delivery_ready"
  | "canceled"
  | "refund_recorded"
  | "retention_due"
  | "retention_completed";

export interface ArtifactAuditEvent {
  eventId: string;
  eventType: ArtifactAuditEventType;
  actorId: string;
  occurredAt: string;
  fromState: ArtifactFulfillmentState | null;
  toState: ArtifactFulfillmentState;
  revision: number;
  reasonCode: string | null;
  checksum: string | null;
}

export interface ArtifactOrderRecord {
  workflowVersion: typeof ETSY_ARTIFACT_WORKFLOW_VERSION;
  orderId: string;
  fulfillmentUnitKey: string;
  state: ArtifactFulfillmentState;
  financialStatus: ArtifactFinancialStatus;
  revision: number;
  intake: ArtifactOrderIntake;
  artifact: AnchorPrintArtifact | null;
  qaEvidence: readonly ArtifactQaEvidence[];
  files: readonly ArtifactFileEvidence[];
  events: readonly ArtifactAuditEvent[];
  createdAt: string;
  updatedAt: string;
  generationStartedAt: string | null;
  refundRecordedAt: string | null;
}

export interface ArtifactOrderView {
  orderId: string;
  fulfillmentUnitKey: string;
  state: ArtifactFulfillmentState;
  financialStatus: ArtifactFinancialStatus;
  revision: number;
  fixtureKind: "known_time" | "unknown_time";
  displayName: string | null;
  supportEmail: string;
  birthDate: string;
  birthPlace: string;
  purchasedAt: string;
  qaCompleted: boolean;
  exportedFileVariants: readonly ArtifactFileVariantKey[];
  eventCount: number;
  updatedAt: string;
}

export type ArtifactWorkflowAction =
  | "validate_intake"
  | "request_clarification"
  | "resolve_clarification"
  | "generate"
  | "approve_qa"
  | "request_revision"
  | "cancel"
  | "record_refund";

export class ArtifactWorkflowError extends Error {
  readonly code:
    | "ambiguous_intake"
    | "fictional_data_required"
    | "manual_data_required"
    | "idempotency_conflict"
    | "invalid_transition"
    | "not_found"
    | "qa_incomplete";

  constructor(code: ArtifactWorkflowError["code"], message: string) {
    super(message);
    this.name = "ArtifactWorkflowError";
    this.code = code;
  }
}
