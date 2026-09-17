import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createAdminSupabase } from "../lib/supabase/admin.ts";
import { ARTIFACT_QA_ITEM_IDS } from "../lib/artifacts/fulfillment/contract.ts";
import { runLocalArtifactRetention } from "../lib/artifacts/fulfillment/retention.ts";
import { SupabaseArtifactWorkflowRepository } from "../lib/artifacts/fulfillment/supabase-repository.ts";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!projectUrl || !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(projectUrl)) {
  throw new Error("Persisted adapter verification requires a localhost Supabase URL.");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Persisted adapter verification requires the disposable service-role key.");
}

Reflect.set(process.env, "NODE_ENV", "development");
process.env.KIAROS_ETSY_ARTIFACT_ADMIN = "true";
process.env.KIAROS_ETSY_ARTIFACT_PERSISTENCE = "true";

let assertions = 0;
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const actorId = "clerk:fixture-persisted-adapter";
const repository = new SupabaseArtifactWorkflowRepository();
const created = await repository.createFixture(
  "known_time",
  actorId,
  "2026-08-21T16:00:00.000Z",
);
equal(created.state, "intake_draft", "persisted fixture starts in intake draft");
ok(created.orderId.match(/^[0-9a-f-]{36}$/), "persisted fixture uses a database UUID");

await repository.act(created.orderId, "validate_intake", actorId, [], "2026-08-21T16:01:00.000Z");
await repository.act(created.orderId, "generate", actorId, [], "2026-08-21T16:02:00.000Z");
await repository.act(
  created.orderId,
  "approve_qa",
  actorId,
  ARTIFACT_QA_ITEM_IDS,
  "2026-08-21T16:03:00.000Z",
);
let record = await repository.get(created.orderId);
equal(record.state, "approved", "persisted QA reaches approved state");
ok(record.artifact, "canonical Anchor artifact rehydrates from persisted input");
equal(record.qaEvidence.length, 1, "QA evidence persists once for the revision");

const pdfBytes = new TextEncoder().encode(
  "%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
const sha256 = createHash("sha256").update(pdfBytes).digest("hex");

const variants = [
  ["report", "letter"],
  ["report", "a4"],
  ["anchor_print", "letter"],
  ["anchor_print", "a4"],
] as const;
for (const [index, [documentKind, paperSize]] of variants.entries()) {
  record = await repository.get(created.orderId);
  ok(record.artifact, `artifact exists before ${documentKind}/${paperSize} export`);
  const file = record.artifact.files.find(
    (candidate) =>
      candidate.documentKind === documentKind &&
      candidate.paperSize === paperSize,
  );
  ok(file, `${documentKind}/${paperSize} file contract exists`);
  await repository.recordExport(
    created.orderId,
    documentKind,
    paperSize,
    {
      revision: record.revision,
      fileName: file.fileName,
      bytes: pdfBytes.byteLength,
      sha256,
      exportedBy: actorId,
      exportedAt: `2026-08-21T16:0${4 + index}:00.000Z`,
    },
    actorId,
    pdfBytes,
    `2026-08-21T16:0${4 + index}:00.000Z`,
  );
}

record = await repository.get(created.orderId);
equal(record.state, "ready_for_external_delivery", "all persisted files stop at delivery boundary");
equal(record.files.length, 4, "all four private file records persist");
ok(record.files.every((file) => file.storageObjectKey?.startsWith("artifact-files/")), "private object keys are random internal paths");
ok(record.files.every((file) => file.sha256 === sha256), "persisted file checksums match uploaded bytes");

const supabase = createAdminSupabase();
const storedBefore = await supabase.storage.from("etsy-artifacts-private").list("artifact-files");
if (storedBefore.error) throw storedBefore.error;
equal(storedBefore.data.length, 4, "all four PDF objects exist in private storage");

const dueAt = "2026-08-21T16:06:00.000Z";
const { error: dueError } = await supabase
  .from("artifact_files")
  .update({ purge_after: "2026-08-21T16:05:00.000Z" })
  .eq("order_id", created.orderId);
if (dueError) throw dueError;

const retention = await runLocalArtifactRetention({ actorId, asOf: dueAt });
equal(retention.considered, 4, "retention considered all four due files");
equal(retention.completed, 4, "retention completed all four due files");
equal(retention.failures.length, 0, "retention completed without failures");

const storedAfter = await supabase.storage.from("etsy-artifacts-private").list("artifact-files");
if (storedAfter.error) throw storedAfter.error;
equal(storedAfter.data.length, 0, "retention physically removed both private objects");

const { data: deletedFiles, error: deletedFilesError } = await supabase
  .from("artifact_files")
  .select("generation_status,deleted_at")
  .eq("order_id", created.orderId);
if (deletedFilesError) throw deletedFilesError;
ok(deletedFiles?.every((file) => file.generation_status === "deleted" && file.deleted_at), "file evidence records completed deletion");

const { data: retentionEvents, error: retentionEventsError } = await supabase
  .from("artifact_order_events")
  .select("event_type")
  .eq("order_id", created.orderId)
  .in("event_type", ["retention_due", "retention_completed"]);
if (retentionEventsError) throw retentionEventsError;
equal(retentionEvents?.length ?? 0, 8, "each file deletion has due and completed audit events");

console.log(`ETSY-03 persisted adapter verification passed: ${assertions} assertions.`);
