import "server-only";

import { createAdminSupabase } from "../../supabase/admin.ts";

import { isEtsyArtifactPersistenceEnabled } from "../../feature-flags.ts";
import { isLocalArtifactWorkflowEnabled } from "./availability.ts";

const PRIVATE_BUCKET = "etsy-artifacts-private";
const RETENTION_RECORD_TYPES = [
  "raw_personalization",
  "normalized_profile",
  "generated_file",
  "support_case",
] as const;

type RetentionRecordType = (typeof RETENTION_RECORD_TYPES)[number];

export interface ArtifactRetentionFailure {
  recordType: RetentionRecordType;
  recordId: string;
  reason: string;
}

export interface ArtifactRetentionResult {
  considered: number;
  completed: number;
  skipped: number;
  failures: readonly ArtifactRetentionFailure[];
}

interface RetentionCandidate {
  recordType: RetentionRecordType;
  recordId: string;
  orderId: string;
  storageObjectKey: string | null;
}

function parseCandidate(value: unknown): RetentionCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid artifact retention candidate.");
  }
  const row = value as Record<string, unknown>;
  const recordType = row.record_type;
  if (typeof recordType !== "string" || !RETENTION_RECORD_TYPES.includes(recordType as RetentionRecordType)) {
    throw new Error("Invalid artifact retention record type.");
  }
  if (typeof row.record_id !== "string" || typeof row.order_id !== "string") {
    throw new Error("Invalid artifact retention identity.");
  }
  if (row.storage_object_key !== null && typeof row.storage_object_key !== "string") {
    throw new Error("Invalid artifact retention storage key.");
  }
  return {
    recordType: recordType as RetentionRecordType,
    recordId: row.record_id,
    orderId: row.order_id,
    storageObjectKey: row.storage_object_key,
  };
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown";
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : "unknown";
}

export async function runLocalArtifactRetention(options: {
  actorId?: string;
  asOf?: string;
} = {}): Promise<ArtifactRetentionResult> {
  if (!isLocalArtifactWorkflowEnabled() || !isEtsyArtifactPersistenceEnabled()) {
    throw new Error("Persisted local artifact retention is disabled.");
  }

  const actorId = options.actorId ?? "system:artifact-retention";
  const asOf = options.asOf ?? new Date().toISOString();
  const supabase = createAdminSupabase();
  const candidateResult = await supabase.rpc("artifact_retention_candidates", { p_as_of: asOf });
  if (candidateResult.error) {
    throw new Error(`Unable to select artifact retention candidates (${errorCode(candidateResult.error)}).`);
  }
  if (!Array.isArray(candidateResult.data)) {
    throw new Error("Artifact retention candidates returned an invalid payload.");
  }

  const candidates = candidateResult.data.map(parseCandidate);
  const failures: ArtifactRetentionFailure[] = [];
  let completed = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    try {
      if (candidate.recordType === "generated_file") {
        if (!candidate.storageObjectKey) throw new Error("missing_storage_key");
        const claim = await supabase.rpc("artifact_begin_file_retention", {
          p_record_id: candidate.recordId,
          p_order_id: candidate.orderId,
          p_as_of: asOf,
        });
        if (claim.error) throw new Error(`claim_failed:${errorCode(claim.error)}`);
        if (claim.data !== true) {
          skipped += 1;
          continue;
        }
        const removal = await supabase.storage
          .from(PRIVATE_BUCKET)
          .remove([candidate.storageObjectKey]);
        if (removal.error) throw new Error(`storage_delete_failed:${errorCode(removal.error)}`);
      }

      const completion = await supabase.rpc("artifact_complete_retention", {
        p_record_type: candidate.recordType,
        p_record_id: candidate.recordId,
        p_order_id: candidate.orderId,
        p_actor_clerk_user_id: actorId,
        p_as_of: asOf,
      });
      if (completion.error) throw new Error(`completion_failed:${errorCode(completion.error)}`);
      if (completion.data === true) completed += 1;
      else skipped += 1;
    } catch (error) {
      failures.push({
        recordType: candidate.recordType,
        recordId: candidate.recordId,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return { considered: candidates.length, completed, skipped, failures };
}
