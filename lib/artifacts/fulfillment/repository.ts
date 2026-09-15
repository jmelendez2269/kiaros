import "server-only";

import type { AnchorDocumentKind, AnchorPaperSize } from "../anchor-print/index.ts";
import { isEtsyArtifactPersistenceEnabled } from "../../feature-flags.ts";
import type {
  ArtifactFileEvidence,
  ArtifactOrderIntake,
  ArtifactOrderRecord,
  ArtifactOrderView,
  ArtifactQaItemId,
  ArtifactWorkflowAction,
} from "./contract.ts";
import { getLocalArtifactWorkflowStore } from "./local-store.ts";
import type { FixtureKind } from "./memory-repository.ts";
import { SupabaseArtifactWorkflowRepository } from "./supabase-repository.ts";

export type ArtifactPersistenceMode = "memory" | "supabase";

export interface ArtifactWorkflowRepository {
  list(): Promise<readonly ArtifactOrderView[]>;
  get(orderId: string): Promise<ArtifactOrderRecord>;
  createManual(intake: ArtifactOrderIntake, actorId: string, now?: string): Promise<ArtifactOrderRecord>;
  createFixture(kind: FixtureKind, actorId: string, now?: string): Promise<ArtifactOrderRecord>;
  act(
    orderId: string,
    action: ArtifactWorkflowAction,
    actorId: string,
    completedQa?: readonly ArtifactQaItemId[],
    now?: string,
  ): Promise<ArtifactOrderRecord>;
  recordExport(
    orderId: string,
    documentKind: AnchorDocumentKind,
    paperSize: AnchorPaperSize,
    evidence: Omit<ArtifactFileEvidence, "documentKind" | "paperSize" | "storageObjectKey">,
    actorId: string,
    bytes: Uint8Array,
    now?: string,
  ): Promise<ArtifactOrderRecord>;
}

class MemoryArtifactWorkflowAdapter implements ArtifactWorkflowRepository {
  private readonly store = getLocalArtifactWorkflowStore();

  async list() {
    return this.store.list();
  }

  async get(orderId: string) {
    return this.store.get(orderId);
  }

  async createManual(intake: ArtifactOrderIntake, actorId: string, now?: string) {
    return this.store.create(intake, actorId, now);
  }

  async createFixture(kind: FixtureKind, actorId: string, now?: string) {
    return this.store.createFixture(kind, actorId, now);
  }

  async act(
    orderId: string,
    action: ArtifactWorkflowAction,
    actorId: string,
    completedQa: readonly ArtifactQaItemId[] = [],
    now?: string,
  ) {
    return this.store.act(orderId, action, actorId, completedQa, now);
  }

  async recordExport(
    orderId: string,
    documentKind: AnchorDocumentKind,
    paperSize: AnchorPaperSize,
    evidence: Omit<ArtifactFileEvidence, "documentKind" | "paperSize" | "storageObjectKey">,
    actorId: string,
    _bytes: Uint8Array,
    now?: string,
  ) {
    return this.store.recordExport(
      orderId,
      documentKind,
      paperSize,
      evidence,
      actorId,
      now,
    );
  }
}

let memoryAdapter: MemoryArtifactWorkflowAdapter | undefined;
let supabaseAdapter: SupabaseArtifactWorkflowRepository | undefined;

export function getArtifactWorkflowRepository(): {
  mode: ArtifactPersistenceMode;
  repository: ArtifactWorkflowRepository;
} {
  if (isEtsyArtifactPersistenceEnabled()) {
    supabaseAdapter ??= new SupabaseArtifactWorkflowRepository();
    return { mode: "supabase", repository: supabaseAdapter };
  }

  memoryAdapter ??= new MemoryArtifactWorkflowAdapter();
  return { mode: "memory", repository: memoryAdapter };
}
