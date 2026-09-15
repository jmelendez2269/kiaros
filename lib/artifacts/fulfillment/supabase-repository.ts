import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminSupabase } from "../../supabase/admin.ts";

import {
  generateAnchorPrint,
  type AnchorCalculation,
  type AnchorDocumentKind,
  type AnchorNarrative,
  type AnchorNormalizedBirth,
  type AnchorPaperSize,
} from "../anchor-print/index.ts";
import {
  knownTimeAnchorFixture,
  unknownTimeAnchorFixture,
} from "../anchor-print/fixtures.ts";
import {
  ARTIFACT_FINANCIAL_STATUSES,
  ARTIFACT_FULFILLMENT_STATES,
  ARTIFACT_QA_ITEM_IDS,
  ETSY_ARTIFACT_WORKFLOW_VERSION,
  ArtifactWorkflowError,
  type ArtifactAuditEvent,
  type ArtifactFileEvidence,
  type ArtifactFinancialStatus,
  type ArtifactFulfillmentState,
  type ArtifactOrderIntake,
  type ArtifactOrderRecord,
  type ArtifactOrderView,
  type ArtifactQaEvidence,
  type ArtifactQaItemId,
  type ArtifactWorkflowAction,
} from "./contract.ts";
import type { FixtureKind } from "./memory-repository.ts";
import type { ArtifactWorkflowRepository } from "./repository.ts";
import {
  applyArtifactWorkflowAction,
  fingerprintArtifactIntake,
  recordArtifactExport,
  toArtifactOrderView,
  validateFixtureArtifactIntake,
  validateManualArtifactIntake,
} from "./workflow.ts";

const PRIVATE_BUCKET = "etsy-artifacts-private";
const ARTIFACT_EVENT_TYPES = [
  "intake_created",
  "intake_replayed",
  "clarification_requested",
  "clarification_resolved",
  "intake_validated",
  "generation_started",
  "generation_succeeded",
  "generation_failed",
  "qa_approved",
  "revision_requested",
  "export_recorded",
  "external_delivery_ready",
  "canceled",
  "refund_recorded",
  "retention_due",
  "retention_completed",
] as const;

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid persisted artifact ${label}.`);
  }
  return value as JsonObject;
}

function stringValue(row: JsonObject, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid persisted artifact field: ${key}.`);
  return value;
}

function nullableString(row: JsonObject, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`Invalid persisted artifact field: ${key}.`);
  return value;
}

function numberValue(row: JsonObject, key: string): number {
  const value = row[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`Invalid persisted artifact field: ${key}.`);
  return parsed;
}

function booleanValue(row: JsonObject, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") throw new Error(`Invalid persisted artifact field: ${key}.`);
  return value;
}

function enumValue<const T extends readonly string[]>(
  row: JsonObject,
  key: string,
  allowed: T,
): T[number] {
  const value = stringValue(row, key);
  if (!allowed.includes(value)) throw new Error(`Invalid persisted artifact field: ${key}.`);
  return value as T[number];
}

function rows(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value)) throw new Error(`Invalid persisted artifact ${label}.`);
  return value.map((item) => object(item, label));
}

function databaseFailure(context: string, error: unknown): never {
  const detail = object(error, "database error");
  const code = typeof detail.code === "string" ? detail.code : "unknown";
  const message = typeof detail.message === "string" ? detail.message : "";
  if (message.includes("artifact_idempotency_conflict")) {
    throw new ArtifactWorkflowError(
      "idempotency_conflict",
      "This fulfillment-unit key already exists with different intake data.",
    );
  }
  if (message.includes("artifact_concurrent_update")) {
    throw new ArtifactWorkflowError(
      "invalid_transition",
      "The artifact changed while this action was running. Refresh and try again.",
    );
  }
  throw new Error(`${context} failed (${code}).`);
}

function auditPayload(events: readonly ArtifactAuditEvent[]) {
  return events.map((event) => ({
    event_id: event.eventId,
    event_type: event.eventType,
    actor_clerk_user_id: event.actorId,
    occurred_at: event.occurredAt,
    from_state: event.fromState,
    to_state: event.toState,
    revision: event.revision,
    reason_code: event.reasonCode,
    checksum: event.checksum,
  }));
}

function transitionSnapshot(record: ArtifactOrderRecord) {
  return {
    fulfillment_status: record.state,
    financial_status: record.financialStatus,
    current_revision: record.revision,
    generation_started_at: record.generationStartedAt,
    refund_recorded_at: record.refundRecordedAt,
    updated_at: record.updatedAt,
  };
}

function qaPayload(evidence: ArtifactQaEvidence | undefined) {
  if (!evidence) return null;
  const completed = new Set(evidence.completedItemIds);
  return {
    revision: evidence.revision,
    calculation_checked: completed.has("calculation"),
    narrative_checked: completed.has("narrative"),
    layout_checked: completed.has("layout"),
    disclosures_checked: completed.has("disclosures"),
    accessibility_checked: completed.has("accessibility"),
    privacy_metadata_checked: completed.has("privacy_metadata"),
    approved: ARTIFACT_QA_ITEM_IDS.every((item) => completed.has(item)),
    reviewed_by_clerk_user_id: evidence.reviewedBy,
    reviewed_at: evidence.reviewedAt,
  };
}

export class SupabaseArtifactWorkflowRepository implements ArtifactWorkflowRepository {
  async list(): Promise<readonly ArtifactOrderView[]> {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("artifact_orders")
      .select("id")
      .in("fulfillment_status", [...ARTIFACT_FULFILLMENT_STATES])
      .order("updated_at", { ascending: false });
    if (error) databaseFailure("Loading artifact orders", error);

    const views: ArtifactOrderView[] = [];
    for (const row of rows(data, "order list")) {
      try {
        views.push(toArtifactOrderView(await this.get(stringValue(row, "id"))));
      } catch (error) {
        if (error instanceof ArtifactWorkflowError && error.code === "not_found") continue;
        throw error;
      }
    }
    return views;
  }

  async get(orderId: string): Promise<ArtifactOrderRecord> {
    const supabase = createAdminSupabase();
    const [orderResult, personalizationResult, profileResult, filesResult, qaResult, eventsResult] =
      await Promise.all([
        supabase.from("artifact_orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("artifact_personalization").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("artifact_profiles").select("*").eq("order_id", orderId).maybeSingle(),
        supabase
          .from("artifact_files")
          .select("*")
          .eq("order_id", orderId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("artifact_qa_reviews")
          .select("*")
          .eq("order_id", orderId)
          .order("revision", { ascending: true }),
        supabase
          .from("artifact_order_events")
          .select("*")
          .eq("order_id", orderId)
          .order("occurred_at", { ascending: true }),
      ]);

    for (const [context, result] of [
      ["Loading artifact order", orderResult],
      ["Loading artifact personalization", personalizationResult],
      ["Loading artifact profile", profileResult],
      ["Loading artifact files", filesResult],
      ["Loading artifact QA", qaResult],
      ["Loading artifact events", eventsResult],
    ] as const) {
      if (result.error) databaseFailure(context, result.error);
    }

    if (!orderResult.data) {
      throw new ArtifactWorkflowError("not_found", "Artifact order not found.");
    }
    if (!personalizationResult.data || !profileResult.data) {
      throw new ArtifactWorkflowError(
        "not_found",
        "The retained order ledger no longer contains private fulfillment data.",
      );
    }

    const order = object(orderResult.data, "order");
    const personalization = object(personalizationResult.data, "personalization");
    const profile = object(profileResult.data, "profile");
    const normalizedBirth = object(profile.normalized_birth, "normalized birth") as unknown as AnchorNormalizedBirth;
    const calculation = object(profile.calculation, "calculation") as unknown as AnchorCalculation;
    const narrative = object(profile.narrative, "narrative") as unknown as AnchorNarrative;
    const allowlistedSourceFields = object(
      personalization.allowlisted_source_fields,
      "allowlisted source fields",
    );
    const fictional = booleanValue(allowlistedSourceFields, "fixture");
    const generatorInput = {
      artifactId: stringValue(profile, "artifact_id"),
      displayName: nullableString(personalization, "display_name"),
      normalizedBirth,
      calculation,
      narrative,
    };
    const source = {
      source: "etsy" as const,
      shopId: stringValue(order, "source_shop_id"),
      receiptId: stringValue(order, "source_receipt_id"),
      transactionId: stringValue(order, "source_transaction_id"),
      unitIndex: numberValue(order, "source_unit_index"),
      quantity: numberValue(order, "source_quantity"),
      listingId: nullableString(order, "source_listing_id"),
      purchasedAt: stringValue(order, "purchased_at"),
    };
    const intake: ArtifactOrderIntake = {
      fictional,
      source,
      sku: "KAI-ETSY-ANCHOR-V1",
      supportEmail: stringValue(personalization, "support_email"),
      displayName: nullableString(personalization, "display_name"),
      sourcePayloadFingerprint: stringValue(order, "source_payload_fingerprint"),
      generatorInput,
    };
    if (fictional) validateFixtureArtifactIntake(intake);
    else validateManualArtifactIntake(intake);

    const state = enumValue(order, "fulfillment_status", ARTIFACT_FULFILLMENT_STATES) as ArtifactFulfillmentState;
    const artifact = ["qa_required", "approved", "exported", "ready_for_external_delivery"].includes(state)
      ? generateAnchorPrint(generatorInput)
      : null;
    const qaEvidence: ArtifactQaEvidence[] = rows(qaResult.data, "QA rows").map((qa) => ({
      revision: numberValue(qa, "revision"),
      completedItemIds: ARTIFACT_QA_ITEM_IDS.filter((item) =>
        booleanValue(qa, `${item}_checked`),
      ),
      reviewedBy: stringValue(qa, "reviewed_by_clerk_user_id"),
      reviewedAt: stringValue(qa, "reviewed_at"),
    }));
    const files: ArtifactFileEvidence[] = rows(filesResult.data, "file rows").map((file) => ({
      documentKind: enumValue(
        file,
        "document_kind",
        ["report", "anchor_print"] as const,
      ) as AnchorDocumentKind,
      paperSize: enumValue(file, "paper_size", ["letter", "a4"] as const) as AnchorPaperSize,
      revision: numberValue(file, "revision"),
      fileName: stringValue(file, "file_name"),
      bytes: numberValue(file, "byte_size"),
      sha256: stringValue(file, "sha256"),
      exportedBy: stringValue(file, "created_by_clerk_user_id"),
      exportedAt: stringValue(file, "created_at"),
      storageObjectKey: stringValue(file, "storage_object_key"),
    }));
    const events: ArtifactAuditEvent[] = rows(eventsResult.data, "event rows").map((event) => ({
      eventId: stringValue(event, "id"),
      eventType: enumValue(event, "event_type", ARTIFACT_EVENT_TYPES),
      actorId: stringValue(event, "actor_clerk_user_id"),
      occurredAt: stringValue(event, "occurred_at"),
      fromState: nullableString(event, "from_state") as ArtifactFulfillmentState | null,
      toState: enumValue(event, "to_state", ARTIFACT_FULFILLMENT_STATES),
      revision: numberValue(event, "revision"),
      reasonCode: nullableString(event, "reason_code"),
      checksum: nullableString(event, "checksum"),
    }));

    return {
      workflowVersion: ETSY_ARTIFACT_WORKFLOW_VERSION,
      orderId: stringValue(order, "id"),
      fulfillmentUnitKey: stringValue(order, "fulfillment_unit_key"),
      state,
      financialStatus: enumValue(
        order,
        "financial_status",
        ARTIFACT_FINANCIAL_STATUSES,
      ) as ArtifactFinancialStatus,
      revision: numberValue(order, "current_revision"),
      intake,
      artifact,
      qaEvidence,
      files,
      events,
      createdAt: stringValue(order, "created_at"),
      updatedAt: stringValue(order, "updated_at"),
      generationStartedAt: nullableString(order, "generation_started_at"),
      refundRecordedAt: nullableString(order, "refund_recorded_at"),
    };
  }

  async createFixture(
    kind: FixtureKind,
    actorId: string,
    now = new Date().toISOString(),
  ): Promise<ArtifactOrderRecord> {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
    const base = kind === "known_time" ? knownTimeAnchorFixture() : unknownTimeAnchorFixture();
    const generatorInput = { ...base, artifactId: `art_fixture_${kind}_${suffix}` };
    const source = {
      source: "etsy" as const,
      shopId: "fixture-kairos-shop",
      receiptId: `fixture-receipt-${kind}-${suffix}`,
      transactionId: `fixture-transaction-${kind}-${suffix}`,
      unitIndex: 1,
      quantity: 1,
      listingId: "fixture-listing-anchor",
      purchasedAt: now,
    };
    const intake: ArtifactOrderIntake = {
      fictional: true,
      source,
      sku: "KAI-ETSY-ANCHOR-V1",
      supportEmail: `${kind.replace("_", "-")}-${suffix}@example.test`,
      displayName: generatorInput.displayName,
      sourcePayloadFingerprint: fingerprintArtifactIntake(generatorInput, source),
      generatorInput,
    };
    validateFixtureArtifactIntake(intake);

    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc("artifact_create_fixture_order", {
      p_actor_clerk_user_id: actorId,
      p_intake: intake,
      p_now: now,
    });
    if (error) databaseFailure("Creating artifact fixture", error);
    if (typeof data !== "string") throw new Error("Creating artifact fixture returned no order ID.");
    return this.get(data);
  }

  async createManual(
    intake: ArtifactOrderIntake,
    actorId: string,
    now = new Date().toISOString(),
  ): Promise<ArtifactOrderRecord> {
    validateManualArtifactIntake(intake);

    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc("artifact_create_manual_order", {
      p_actor_clerk_user_id: actorId,
      p_intake: intake,
      p_now: now,
    });
    if (error) databaseFailure("Creating manual artifact order", error);
    if (typeof data !== "string") {
      throw new Error("Creating manual artifact order returned no order ID.");
    }
    return this.get(data);
  }

  async act(
    orderId: string,
    action: ArtifactWorkflowAction,
    actorId: string,
    completedQa: readonly ArtifactQaItemId[] = [],
    now = new Date().toISOString(),
  ): Promise<ArtifactOrderRecord> {
    const current = await this.get(orderId);
    const updated = applyArtifactWorkflowAction(current, action, actorId, now, completedQa);
    const newQa = updated.qaEvidence.find(
      (item) => !current.qaEvidence.some((existing) => existing.revision === item.revision),
    );
    const supabase = createAdminSupabase();
    const { error } = await supabase.rpc("artifact_commit_workflow_transition", {
      p_order_id: orderId,
      p_expected_updated_at: current.updatedAt,
      p_snapshot: transitionSnapshot(updated),
      p_new_events: auditPayload(updated.events.slice(current.events.length)),
      p_qa: qaPayload(newQa),
      p_file: null,
    });
    if (error) databaseFailure("Committing artifact transition", error);
    return this.get(orderId);
  }

  async recordExport(
    orderId: string,
    documentKind: AnchorDocumentKind,
    paperSize: AnchorPaperSize,
    evidence: Omit<ArtifactFileEvidence, "documentKind" | "paperSize" | "storageObjectKey">,
    actorId: string,
    bytes: Uint8Array,
    now = new Date().toISOString(),
  ): Promise<ArtifactOrderRecord> {
    const current = await this.get(orderId);
    const prior = current.files.find(
      (file) =>
        file.revision === evidence.revision &&
        file.documentKind === documentKind &&
        file.paperSize === paperSize,
    );
    if (prior) {
      if (prior.sha256 === evidence.sha256) return current;
      throw new ArtifactWorkflowError(
        "invalid_transition",
        "A different export already exists for this revision. Open a revision before replacing it.",
      );
    }

    const storageObjectKey = `artifact-files/${randomUUID()}.pdf`;
    const fileEvidence: ArtifactFileEvidence = {
      ...evidence,
      documentKind,
      paperSize,
      storageObjectKey,
    };
    const updated = recordArtifactExport(current, fileEvidence, actorId, now);
    const supabase = createAdminSupabase();
    const upload = await supabase.storage.from(PRIVATE_BUCKET).upload(storageObjectKey, bytes, {
      cacheControl: "private, no-store",
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) databaseFailure("Uploading private artifact file", upload.error);

    const { error } = await supabase.rpc("artifact_commit_workflow_transition", {
      p_order_id: orderId,
      p_expected_updated_at: current.updatedAt,
      p_snapshot: transitionSnapshot(updated),
      p_new_events: auditPayload(updated.events.slice(current.events.length)),
      p_qa: null,
      p_file: {
        revision: fileEvidence.revision,
        document_kind: fileEvidence.documentKind,
        paper_size: fileEvidence.paperSize,
        private_bucket: PRIVATE_BUCKET,
        storage_object_key: storageObjectKey,
        file_name: fileEvidence.fileName,
        byte_size: fileEvidence.bytes,
        sha256: fileEvidence.sha256,
        generation_status: "qa_approved",
        created_by_clerk_user_id: fileEvidence.exportedBy,
        created_at: fileEvidence.exportedAt,
      },
    });
    if (error) {
      await supabase.storage.from(PRIVATE_BUCKET).remove([storageObjectKey]);
      databaseFailure("Recording private artifact file", error);
    }
    return this.get(orderId);
  }
}
