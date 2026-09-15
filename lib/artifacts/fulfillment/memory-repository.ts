import { randomUUID } from "node:crypto";

import {
  knownTimeAnchorFixture,
  unknownTimeAnchorFixture,
} from "../anchor-print/fixtures.ts";
import type { AnchorDocumentKind, AnchorPaperSize } from "../anchor-print/index.ts";
import {
  ArtifactWorkflowError,
  type ArtifactFileEvidence,
  type ArtifactOrderIntake,
  type ArtifactOrderRecord,
  type ArtifactOrderView,
  type ArtifactQaItemId,
  type ArtifactWorkflowAction,
} from "./contract.ts";
import {
  applyArtifactWorkflowAction,
  buildFulfillmentUnitKey,
  createArtifactOrderRecord,
  fingerprintArtifactIntake,
  recordArtifactIntakeReplay,
  recordArtifactExport,
  toArtifactOrderView,
  validateArtifactIntake,
  validateFixtureArtifactIntake,
} from "./workflow.ts";

export type FixtureKind = "known_time" | "unknown_time";

export class MemoryArtifactWorkflowRepository {
  private readonly orders = new Map<string, ArtifactOrderRecord>();
  private sequence = 0;

  constructor(seed = true) {
    if (seed) {
      this.createFixture("known_time", "system:fixture-seed", "2026-08-19T12:00:00.000Z");
      this.createFixture("unknown_time", "system:fixture-seed", "2026-08-19T12:01:00.000Z");
    }
  }

  list(): readonly ArtifactOrderView[] {
    return [...this.orders.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toArtifactOrderView);
  }

  get(orderId: string): ArtifactOrderRecord {
    const order = this.orders.get(orderId);
    if (!order) throw new ArtifactWorkflowError("not_found", "Artifact order not found.");
    return order;
  }

  create(intake: ArtifactOrderIntake, actorId: string, now = new Date().toISOString()): ArtifactOrderRecord {
    validateArtifactIntake(intake);
    const key = buildFulfillmentUnitKey(intake.source);
    const existing = [...this.orders.values()].find((order) => order.fulfillmentUnitKey === key);
    if (existing) {
      if (existing.intake.sourcePayloadFingerprint === intake.sourcePayloadFingerprint) {
        const replayed = recordArtifactIntakeReplay(existing, actorId, now);
        this.orders.set(existing.orderId, replayed);
        return replayed;
      }
      throw new ArtifactWorkflowError(
        "idempotency_conflict",
        "This fulfillment-unit key already exists with different intake data.",
      );
    }

    const record = createArtifactOrderRecord(`aord_fixture_${randomUUID()}`, intake, actorId, now);
    this.orders.set(record.orderId, record);
    return record;
  }

  createFixture(kind: FixtureKind, actorId: string, now = new Date().toISOString()): ArtifactOrderRecord {
    this.sequence += 1;
    const ordinal = String(this.sequence).padStart(3, "0");
    const base = kind === "known_time" ? knownTimeAnchorFixture() : unknownTimeAnchorFixture();
    const generatorInput = {
      ...base,
      artifactId: `art_fixture_${kind}_${ordinal}`,
    };
    const source = {
      source: "etsy" as const,
      shopId: "fixture-kairos-shop",
      receiptId: `fixture-receipt-${kind}-${ordinal}`,
      transactionId: `fixture-transaction-${kind}-${ordinal}`,
      unitIndex: 1,
      quantity: 1,
      listingId: "fixture-listing-anchor",
      purchasedAt: now,
    };
    const intake: ArtifactOrderIntake = {
        fictional: true,
        source,
        sku: "KAI-ETSY-ANCHOR-V1",
        supportEmail: `${kind.replace("_", "-")}-${ordinal}@example.test`,
        displayName: generatorInput.displayName,
        sourcePayloadFingerprint: fingerprintArtifactIntake(generatorInput, source),
        generatorInput,
      };
    validateFixtureArtifactIntake(intake);
    return this.create(intake, actorId, now);
  }

  act(
    orderId: string,
    action: ArtifactWorkflowAction,
    actorId: string,
    completedQa: readonly ArtifactQaItemId[] = [],
    now = new Date().toISOString(),
  ): ArtifactOrderRecord {
    const updated = applyArtifactWorkflowAction(this.get(orderId), action, actorId, now, completedQa);
    this.orders.set(orderId, updated);
    return updated;
  }

  recordExport(
    orderId: string,
    documentKind: AnchorDocumentKind,
    paperSize: AnchorPaperSize,
    evidence: Omit<ArtifactFileEvidence, "documentKind" | "paperSize" | "storageObjectKey">,
    actorId: string,
    now = new Date().toISOString(),
  ): ArtifactOrderRecord {
    const updated = recordArtifactExport(
      this.get(orderId),
      { ...evidence, documentKind, paperSize, storageObjectKey: null },
      actorId,
      now,
    );
    this.orders.set(orderId, updated);
    return updated;
  }
}
