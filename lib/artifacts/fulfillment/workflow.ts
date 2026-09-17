import { createHash, randomUUID } from "node:crypto";

import {
  ANCHOR_PRINT_SKU,
  generateAnchorPrint,
  validateAnchorPrintInput,
  type AnchorDocumentKind,
  type AnchorPaperSize,
  type AnchorPrintInput,
} from "../anchor-print/index.ts";
import {
  ARTIFACT_QA_ITEM_IDS,
  ETSY_ARTIFACT_WORKFLOW_VERSION,
  ArtifactWorkflowError,
  type ArtifactAuditEvent,
  type ArtifactFileEvidence,
  type ArtifactFileVariantKey,
  type ArtifactFulfillmentState,
  type ArtifactOrderIntake,
  type ArtifactOrderRecord,
  type ArtifactOrderView,
  type ArtifactQaItemId,
  type ArtifactWorkflowAction,
  type EtsyArtifactSource,
} from "./contract.ts";

const FORBIDDEN_ID_PART = /[:\s]/;

function ensureSourcePart(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || FORBIDDEN_ID_PART.test(normalized)) {
    throw new ArtifactWorkflowError(
      "ambiguous_intake",
      `${label} must be present and cannot contain spaces or colons.`,
    );
  }
  return normalized;
}

export function buildFulfillmentUnitKey(source: EtsyArtifactSource): string {
  if (!Number.isInteger(source.unitIndex) || source.unitIndex < 1) {
    throw new ArtifactWorkflowError("ambiguous_intake", "unitIndex must be a positive integer.");
  }
  if (source.quantity !== 1) {
    throw new ArtifactWorkflowError(
      "ambiguous_intake",
      "Each workflow record must represent exactly one identified fulfillment unit.",
    );
  }

  return [
    "etsy",
    ensureSourcePart(source.shopId, "shopId"),
    ensureSourcePart(source.receiptId, "receiptId"),
    ensureSourcePart(source.transactionId, "transactionId"),
    source.unitIndex,
  ].join(":");
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

export function fingerprintArtifactIntake(input: AnchorPrintInput, source: EtsyArtifactSource): string {
  const purchasedAt = new Date(source.purchasedAt);
  const canonicalSource = {
    ...source,
    purchasedAt: Number.isNaN(purchasedAt.valueOf()) ? source.purchasedAt : purchasedAt.toISOString(),
  };
  return createHash("sha256")
    .update(JSON.stringify(canonicalJson({ source: canonicalSource, input })))
    .digest("hex");
}

export function fingerprintManualArtifactIntake({
  source,
  supportEmail,
  displayName,
  normalizedBirth,
}: {
  source: EtsyArtifactSource;
  supportEmail: string;
  displayName: string | null;
  normalizedBirth: AnchorPrintInput["normalizedBirth"];
}): string {
  const purchasedAt = new Date(source.purchasedAt);
  const canonicalSource = {
    ...source,
    purchasedAt: Number.isNaN(purchasedAt.valueOf()) ? source.purchasedAt : purchasedAt.toISOString(),
  };
  return createHash("sha256")
    .update(JSON.stringify(canonicalJson({
      source: canonicalSource,
      supportEmail: supportEmail.toLowerCase(),
      displayName,
      normalizedBirth,
    })))
    .digest("hex");
}

export function validateArtifactIntake(intake: ArtifactOrderIntake): void {
  buildFulfillmentUnitKey(intake.source);
  if (intake.sku !== ANCHOR_PRINT_SKU) {
    throw new ArtifactWorkflowError("ambiguous_intake", "Only the approved Anchor SKU is supported.");
  }
  if (!/^\S+@\S+\.\S+$/.test(intake.supportEmail)) {
    throw new ArtifactWorkflowError("ambiguous_intake", "A valid support email is required.");
  }
  const expectedFingerprint = intake.fictional
    ? fingerprintArtifactIntake(intake.generatorInput, intake.source)
    : fingerprintManualArtifactIntake({
        source: intake.source,
        supportEmail: intake.supportEmail,
        displayName: intake.displayName,
        normalizedBirth: intake.generatorInput.normalizedBirth,
      });
  if (intake.sourcePayloadFingerprint !== expectedFingerprint) {
    throw new ArtifactWorkflowError("idempotency_conflict", "The intake fingerprint does not match its payload.");
  }
  validateAnchorPrintInput(intake.generatorInput);
}

export function validateFixtureArtifactIntake(intake: ArtifactOrderIntake): void {
  validateArtifactIntake(intake);
  if (!intake.fictional) {
    throw new ArtifactWorkflowError(
      "fictional_data_required",
      "The local adapter accepts fictional records only.",
    );
  }
  if (
    !intake.source.shopId.startsWith("fixture-") ||
    !intake.source.receiptId.startsWith("fixture-") ||
    !intake.source.transactionId.startsWith("fixture-") ||
    !intake.supportEmail.endsWith(".test") ||
    !intake.generatorInput.artifactId.startsWith("art_fixture_")
  ) {
    throw new ArtifactWorkflowError(
      "fictional_data_required",
      "Fixture identifiers, a .test email, and an art_fixture_ artifact ID are required.",
    );
  }
}

export function validateManualArtifactIntake(intake: ArtifactOrderIntake): void {
  validateArtifactIntake(intake);
  if (
    intake.fictional ||
    intake.source.shopId.startsWith("fixture-") ||
    intake.source.receiptId.startsWith("fixture-") ||
    intake.source.transactionId.startsWith("fixture-") ||
    intake.supportEmail.endsWith(".test") ||
    intake.generatorInput.artifactId.startsWith("art_fixture_")
  ) {
    throw new ArtifactWorkflowError(
      "manual_data_required",
      "Manual intake requires non-fixture order identifiers and an opaque production artifact ID.",
    );
  }
}

function event(
  eventType: ArtifactAuditEvent["eventType"],
  actorId: string,
  occurredAt: string,
  fromState: ArtifactFulfillmentState | null,
  toState: ArtifactFulfillmentState,
  revision: number,
  reasonCode: string | null = null,
  checksum: string | null = null,
): ArtifactAuditEvent {
  return {
    eventId: randomUUID(),
    eventType,
    actorId,
    occurredAt,
    fromState,
    toState,
    revision,
    reasonCode,
    checksum,
  };
}

export function createArtifactOrderRecord(
  orderId: string,
  intake: ArtifactOrderIntake,
  actorId: string,
  now: string,
): ArtifactOrderRecord {
  validateArtifactIntake(intake);
  const state: ArtifactFulfillmentState = "intake_draft";
  return {
    workflowVersion: ETSY_ARTIFACT_WORKFLOW_VERSION,
    orderId,
    fulfillmentUnitKey: buildFulfillmentUnitKey(intake.source),
    state,
    financialStatus: "paid",
    revision: 1,
    intake,
    artifact: null,
    qaEvidence: [],
    files: [],
    events: [event("intake_created", actorId, now, null, state, 1)],
    createdAt: now,
    updatedAt: now,
    generationStartedAt: null,
    refundRecordedAt: null,
  };
}

export function recordArtifactIntakeReplay(
  record: ArtifactOrderRecord,
  actorId: string,
  now: string,
): ArtifactOrderRecord {
  return {
    ...record,
    updatedAt: now,
    events: [
      ...record.events,
      event(
        "intake_replayed",
        actorId,
        now,
        record.state,
        record.state,
        record.revision,
        "identical_payload",
      ),
    ],
  };
}

function assertState(record: ArtifactOrderRecord, allowed: readonly ArtifactFulfillmentState[]): void {
  if (!allowed.includes(record.state)) {
    throw new ArtifactWorkflowError(
      "invalid_transition",
      `Cannot transition ${record.state}; expected ${allowed.join(" or ")}.`,
    );
  }
}

function withTransition(
  record: ArtifactOrderRecord,
  state: ArtifactFulfillmentState,
  auditEvent: ArtifactAuditEvent,
  now: string,
  changes: Partial<ArtifactOrderRecord> = {},
): ArtifactOrderRecord {
  return {
    ...record,
    ...changes,
    state,
    updatedAt: now,
    events: [...record.events, auditEvent],
  };
}

function completeQa(completed: readonly ArtifactQaItemId[]): void {
  const completedSet = new Set(completed);
  if (ARTIFACT_QA_ITEM_IDS.some((item) => !completedSet.has(item))) {
    throw new ArtifactWorkflowError("qa_incomplete", "Every required QA item must be completed.");
  }
}

export function applyArtifactWorkflowAction(
  record: ArtifactOrderRecord,
  action: ArtifactWorkflowAction,
  actorId: string,
  now: string,
  completedQa: readonly ArtifactQaItemId[] = [],
): ArtifactOrderRecord {
  switch (action) {
    case "validate_intake": {
      assertState(record, ["intake_draft"]);
      validateArtifactIntake(record.intake);
      return withTransition(
        record,
        "ready_to_generate",
        event("intake_validated", actorId, now, record.state, "ready_to_generate", record.revision),
        now,
      );
    }
    case "request_clarification": {
      assertState(record, ["intake_draft"]);
      return withTransition(
        record,
        "clarification_required",
        event(
          "clarification_requested",
          actorId,
          now,
          record.state,
          "clarification_required",
          record.revision,
          "fixture_clarification",
        ),
        now,
      );
    }
    case "resolve_clarification": {
      assertState(record, ["clarification_required"]);
      return withTransition(
        record,
        "intake_draft",
        event("clarification_resolved", actorId, now, record.state, "intake_draft", record.revision),
        now,
      );
    }
    case "generate": {
      assertState(record, ["ready_to_generate", "revision_required"]);
      const generatingEvent = event(
        "generation_started",
        actorId,
        now,
        record.state,
        "generating",
        record.revision,
      );
      try {
        const artifact = generateAnchorPrint(record.intake.generatorInput);
        const generatedEvent = event(
          "generation_succeeded",
          actorId,
          now,
          "generating",
          "qa_required",
          record.revision,
        );
        return {
          ...record,
          state: "qa_required",
          artifact,
          qaEvidence: record.qaEvidence,
          files: record.files.filter((file) => file.revision !== record.revision),
          generationStartedAt: now,
          updatedAt: now,
          events: [...record.events, generatingEvent, generatedEvent],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "generation_failed";
        return {
          ...record,
          state: "revision_required",
          artifact: null,
          generationStartedAt: now,
          updatedAt: now,
          events: [
            ...record.events,
            generatingEvent,
            event(
              "generation_failed",
              actorId,
              now,
              "generating",
              "revision_required",
              record.revision,
              createHash("sha256").update(message).digest("hex").slice(0, 24),
            ),
          ],
        };
      }
    }
    case "approve_qa": {
      assertState(record, ["qa_required"]);
      completeQa(completedQa);
      if (!record.artifact) {
        throw new ArtifactWorkflowError("invalid_transition", "No generated artifact is available for QA.");
      }
      return withTransition(
        record,
        "approved",
        event("qa_approved", actorId, now, record.state, "approved", record.revision),
        now,
        {
          qaEvidence: [
            ...record.qaEvidence,
            { revision: record.revision, completedItemIds: [...completedQa], reviewedBy: actorId, reviewedAt: now },
          ],
        },
      );
    }
    case "request_revision": {
      assertState(record, ["qa_required", "approved", "exported", "ready_for_external_delivery"]);
      const revision = record.revision + 1;
      return withTransition(
        record,
        "revision_required",
        event("revision_requested", actorId, now, record.state, "revision_required", revision, "qa_revision"),
        now,
        { revision, artifact: null },
      );
    }
    case "cancel": {
      assertState(record, ["intake_draft", "clarification_required", "ready_to_generate"]);
      return withTransition(
        record,
        "canceled",
        event("canceled", actorId, now, record.state, "canceled", record.revision, "pre_generation_cancel"),
        now,
      );
    }
    case "record_refund": {
      assertState(record, ["intake_draft", "clarification_required", "ready_to_generate", "canceled"]);
      if (record.financialStatus === "refunded") {
        throw new ArtifactWorkflowError("invalid_transition", "This order already has a recorded refund.");
      }
      return withTransition(
        record,
        "canceled",
        event(
          "refund_recorded",
          actorId,
          now,
          record.state,
          "canceled",
          record.revision,
          "pre_generation_refund",
        ),
        now,
        { financialStatus: "refunded", refundRecordedAt: now },
      );
    }
  }
}

export function recordArtifactExport(
  record: ArtifactOrderRecord,
  evidence: ArtifactFileEvidence,
  actorId: string,
  now: string,
): ArtifactOrderRecord {
  assertState(record, ["approved", "exported", "ready_for_external_delivery"]);
  if (evidence.revision !== record.revision) {
    throw new ArtifactWorkflowError("invalid_transition", "Export evidence must match the current revision.");
  }
  const currentFiles = record.files.filter(
    (file) => !(
      file.revision === evidence.revision &&
      file.documentKind === evidence.documentKind &&
      file.paperSize === evidence.paperSize
    ),
  );
  const files = [...currentFiles, evidence];
  const currentVariants = new Set(
    files
      .filter((file) => file.revision === record.revision)
      .map((file) => fileVariantKey(file.documentKind, file.paperSize)),
  );
  const ready = [
    "report:letter",
    "report:a4",
    "anchor_print:letter",
    "anchor_print:a4",
  ].every((variant) => currentVariants.has(variant as ArtifactFileVariantKey));
  const nextState: ArtifactFulfillmentState = ready ? "ready_for_external_delivery" : "exported";
  const exportEvent = event(
    "export_recorded",
    actorId,
    now,
    record.state,
    nextState,
    record.revision,
    fileVariantKey(evidence.documentKind, evidence.paperSize),
    evidence.sha256,
  );
  const events = ready
    ? [
        ...record.events,
        exportEvent,
        event(
          "external_delivery_ready",
          actorId,
          now,
          record.state,
          nextState,
          record.revision,
          "local_boundary_only",
        ),
      ]
    : [...record.events, exportEvent];

  return { ...record, state: nextState, files, events, updatedAt: now };
}

export function toArtifactOrderView(record: ArtifactOrderRecord): ArtifactOrderView {
  const birth = record.intake.generatorInput.normalizedBirth;
  const currentQa = record.qaEvidence.some((evidence) => evidence.revision === record.revision);
  return {
    orderId: record.orderId,
    fulfillmentUnitKey: record.fulfillmentUnitKey,
    state: record.state,
    financialStatus: record.financialStatus,
    revision: record.revision,
    fixtureKind: birth.timeUnknown ? "unknown_time" : "known_time",
    displayName: record.intake.displayName,
    supportEmail: record.intake.supportEmail,
    birthDate: birth.date,
    birthPlace: `${birth.city}, ${birth.country}`,
    purchasedAt: record.intake.source.purchasedAt,
    qaCompleted: currentQa,
    exportedFileVariants: record.files
      .filter((file) => file.revision === record.revision)
      .map((file) => fileVariantKey(file.documentKind, file.paperSize)),
    eventCount: record.events.length,
    updatedAt: record.updatedAt,
  };
}

export function paperSizeLabel(size: AnchorPaperSize): string {
  return size === "letter" ? "US Letter" : "A4";
}

export function documentKindLabel(kind: AnchorDocumentKind): string {
  return kind === "report" ? "Full report" : "Anchor Print";
}

export function fileVariantKey(
  documentKind: AnchorDocumentKind,
  paperSize: AnchorPaperSize,
): ArtifactFileVariantKey {
  return (documentKind + ":" + paperSize) as ArtifactFileVariantKey;
}
