import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { knownTimeAnchorFixture } from "../lib/artifacts/anchor-print/fixtures.ts";
import {
  ARTIFACT_QA_ITEM_IDS,
  ArtifactWorkflowError,
} from "../lib/artifacts/fulfillment/contract.ts";
import { MemoryArtifactWorkflowRepository } from "../lib/artifacts/fulfillment/memory-repository.ts";
import {
  buildFulfillmentUnitKey,
  fingerprintArtifactIntake,
  fingerprintManualArtifactIntake,
  validateManualArtifactIntake,
} from "../lib/artifacts/fulfillment/workflow.ts";

let assertions = 0;

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function throwsWorkflow(action: () => unknown, code: ArtifactWorkflowError["code"], message: string): void {
  assert.throws(action, (error) => {
    assert.ok(error && typeof error === "object" && "code" in error);
    assert.equal((error as ArtifactWorkflowError).code, code);
    return true;
  }, message);
  assertions += 1;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, item]) => [key, reverseObjectKeys(item)]),
    );
  }
  return value;
}

const actor = "clerk:fixture-admin";
const repository = new MemoryArtifactWorkflowRepository(false);
const created = repository.createFixture("known_time", actor, "2026-08-19T13:00:00.000Z");

equal(created.state, "intake_draft", "fictional intake starts as a draft");
equal(
  created.fulfillmentUnitKey,
  "etsy:fixture-kairos-shop:fixture-receipt-known_time-001:fixture-transaction-known_time-001:1",
  "canonical fulfillment-unit key includes transaction and one-based unit index",
);
const replayed = repository.create(created.intake, actor);
equal(replayed.orderId, created.orderId, "identical intake replay is idempotent");
equal(
  replayed.events[replayed.events.length - 1]?.eventType,
  "intake_replayed",
  "idempotent replay remains auditable",
);
equal(
  fingerprintArtifactIntake(
    reverseObjectKeys(created.intake.generatorInput) as typeof created.intake.generatorInput,
    { ...created.intake.source, purchasedAt: "2026-08-19T13:00:00+00:00" },
  ),
  created.intake.sourcePayloadFingerprint,
  "intake fingerprint survives JSONB key ordering and equivalent timestamp formatting",
);

const changedInput = { ...created.intake.generatorInput, displayName: "Changed fixture name" };
const conflictingIntake = {
  ...created.intake,
  displayName: changedInput.displayName,
  generatorInput: changedInput,
  sourcePayloadFingerprint: fingerprintArtifactIntake(changedInput, created.intake.source),
};
throwsWorkflow(
  () => repository.create(conflictingIntake, actor),
  "idempotency_conflict",
  "same key with changed payload stops for review",
);

throwsWorkflow(
  () => buildFulfillmentUnitKey({ ...created.intake.source, quantity: 2 }),
  "ambiguous_intake",
  "multi-quantity source rows stop before creation",
);
throwsWorkflow(
  () => buildFulfillmentUnitKey({ ...created.intake.source, transactionId: "" }),
  "ambiguous_intake",
  "missing transaction identity stops before creation",
);

repository.act(created.orderId, "validate_intake", actor);
equal(repository.get(created.orderId).state, "ready_to_generate", "validated intake becomes generation-ready");
repository.act(created.orderId, "generate", actor);
equal(repository.get(created.orderId).state, "qa_required", "generation always enters human QA");
ok(repository.get(created.orderId).artifact, "generation consumes the canonical Anchor package");
throwsWorkflow(
  () => repository.act(created.orderId, "approve_qa", actor, ARTIFACT_QA_ITEM_IDS.slice(0, -1)),
  "qa_incomplete",
  "partial QA cannot approve a revision",
);
repository.act(created.orderId, "approve_qa", actor, ARTIFACT_QA_ITEM_IDS);
equal(repository.get(created.orderId).state, "approved", "complete QA approves the current revision");

const exportVariants = [
  ["report", "letter"],
  ["report", "a4"],
  ["anchor_print", "letter"],
  ["anchor_print", "a4"],
] as const;
for (const [index, [documentKind, paperSize]] of exportVariants.entries()) {
  repository.recordExport(
    created.orderId,
    documentKind,
    paperSize,
    {
      revision: 1,
      fileName:
        "art_fixture_known_time_001_" +
        (documentKind === "report" ? "natal-report" : "anchor-print") +
        "_" + paperSize + ".pdf",
      bytes: 40_000,
      sha256: String.fromCharCode(97 + index).repeat(64),
      exportedBy: actor,
      exportedAt: `2026-08-19T13:1${index}:00.000Z`,
    },
    actor,
  );
  if (index < exportVariants.length - 1) {
    equal(
      repository.get(created.orderId).state,
      "exported",
      "partial package remains exported but not delivery-ready",
    );
  }
}
equal(
  repository.get(created.orderId).state,
  "ready_for_external_delivery",
  "all four checksummed variants stop at the external-delivery boundary",
);

repository.act(created.orderId, "request_revision", actor);
equal(repository.get(created.orderId).revision, 2, "revision request increments the record revision");
equal(repository.get(created.orderId).state, "revision_required", "revision remains explicit and auditable");
repository.act(created.orderId, "generate", actor);
throwsWorkflow(
  () => repository.act(created.orderId, "cancel", actor),
  "invalid_transition",
  "cancellation after generation begins fails closed",
);

const cancelRepository = new MemoryArtifactWorkflowRepository(false);
const canceled = cancelRepository.createFixture("unknown_time", actor);
cancelRepository.act(canceled.orderId, "cancel", actor);
equal(cancelRepository.get(canceled.orderId).state, "canceled", "pre-generation cancellation is supported");

const refunded = cancelRepository.act(canceled.orderId, "record_refund", actor);
equal(refunded.state, "canceled", "a refunded order remains stopped");
equal(refunded.financialStatus, "refunded", "refund evidence is distinct from cancellation state");
ok(refunded.refundRecordedAt, "refund evidence records its timestamp");
equal(
  refunded.events[refunded.events.length - 1]?.eventType,
  "refund_recorded",
  "refund evidence remains append-only and auditable",
);
throwsWorkflow(
  () => cancelRepository.act(canceled.orderId, "record_refund", actor),
  "invalid_transition",
  "duplicate refund evidence fails closed",
);
throwsWorkflow(
  () => repository.act(created.orderId, "record_refund", actor),
  "invalid_transition",
  "refund after generation begins fails closed",
);

const fixture = knownTimeAnchorFixture();
const manualGeneratorInput = {
  ...fixture,
  artifactId: "art_manual_order_00000001",
  displayName: "Manual Test",
};
const manualSource = {
  source: "etsy" as const,
  shopId: "kairos",
  receiptId: "receipt-1001",
  transactionId: "transaction-2001",
  unitIndex: 1,
  quantity: 1,
  listingId: "listing-3001",
  purchasedAt: "2026-08-25T14:00:00.000Z",
};
const manualIntake = {
  fictional: false,
  source: manualSource,
  sku: "KAI-ETSY-ANCHOR-V1" as const,
  supportEmail: "buyer@example.com",
  displayName: "Manual Test",
  sourcePayloadFingerprint: fingerprintManualArtifactIntake({
    source: manualSource,
    supportEmail: "buyer@example.com",
    displayName: "Manual Test",
    normalizedBirth: manualGeneratorInput.normalizedBirth,
  }),
  generatorInput: manualGeneratorInput,
};
validateManualArtifactIntake(manualIntake);
const manualRepository = new MemoryArtifactWorkflowRepository(false);
const manualOrder = manualRepository.create(manualIntake, actor, "2026-08-25T14:05:00.000Z");
equal(manualOrder.fulfillmentUnitKey, "etsy:kairos:receipt-1001:transaction-2001:1", "manual intake uses the canonical Etsy unit key");
equal(manualOrder.intake.fictional, false, "manual intake remains distinguishable from fixtures");
equal(manualRepository.create(manualIntake, actor).orderId, manualOrder.orderId, "manual intake replay is idempotent");
equal(
  manualRepository.create({
    ...manualIntake,
    generatorInput: { ...manualGeneratorInput, artifactId: "art_manual_order_00000002" },
  }, actor).orderId,
  manualOrder.orderId,
  "manual replay ignores regenerated artifact package identifiers",
);

const migration = await readFile("supabase/migrations/0045_artifact_fulfillment.sql", "utf8");
for (const table of [
  "artifact_products",
  "artifact_admin_roles",
  "artifact_orders",
  "artifact_personalization",
  "artifact_profiles",
  "artifact_files",
  "artifact_qa_reviews",
  "artifact_support_cases",
  "artifact_order_events",
]) {
  ok(migration.includes(`CREATE TABLE public.${table}`), `0045 creates isolated ${table}`);
  ok(migration.includes(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`), `${table} forces RLS`);
  ok(migration.includes(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`), `${table} denies browser roles`);
  ok(migration.includes(`REVOKE ALL ON TABLE public.${table} FROM service_role`), `${table} resets broad service-role defaults`);
}
ok(migration.includes("artifact_order_events_immutable"), "0045 makes audit events append-only");
ok(migration.includes("'refund_recorded'"), "0045 permits auditable refund events");
ok(migration.includes("financial_status IN ('paid', 'refund_pending', 'refunded')"), "0045 distinguishes refund status");
ok(migration.includes("artifact_retention_candidates"), "0045 exposes retention candidates to a server job");
ok(migration.includes("artifact_create_fixture_order"), "0045 commits persisted fixture intake atomically");
ok(migration.includes("artifact_commit_workflow_transition"), "0045 commits state, QA, file, and audit evidence atomically");
ok(migration.includes("artifact_begin_file_retention"), "0045 makes private-file deletion retryable");
ok(migration.includes("artifact_complete_retention"), "0045 records completed retention work");
ok(migration.includes("narrative JSONB NOT NULL"), "0045 retains the generated-input narrative for deterministic reloads");
ok(
  migration.includes(
    "REVOKE ALL ON FUNCTION public.artifact_retention_candidates(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated",
  ),
  "0045 revokes browser execution of retention selection",
);
ok(migration.includes("'etsy-artifacts-private'"), "0045 provisions only a private artifact bucket");
ok(/active\s*\)\s*VALUES[\s\S]*false\s*\)/.test(migration), "artifact product remains inactive after migration");
ok(!/\bproduct_entitlements\b/i.test(migration), "0045 has no software-entitlement coupling");
ok(!/CREATE POLICY[\s\S]*(?:anon|authenticated)/i.test(migration), "0045 creates no browser access policy");

const packageMigration = await readFile("supabase/migrations/0046_natal_report_package.sql", "utf8");
ok(packageMigration.includes("document_kind"), "0046 distinguishes reports from Anchor Prints");
ok(
  packageMigration.includes("UNIQUE (order_id, revision, document_kind, paper_size)"),
  "0046 requires one evidence row per delivered file variant",
);
ok(
  packageMigration.includes("Personal Natal Astrology Report + Anchor Print"),
  "0046 updates the inactive product metadata",
);
ok(packageMigration.includes("artifact_create_manual_order"), "0046 adds atomic manual-order intake");
ok(
  packageMigration.includes("'fixture', false"),
  "0046 marks persisted manual orders as non-fixtures",
);
ok(
  /REVOKE ALL ON FUNCTION public\.artifact_create_manual_order\(JSONB, TEXT, TIMESTAMPTZ\)[\s\S]*?FROM PUBLIC, anon, authenticated;/.test(packageMigration),
  "0046 denies manual-intake execution to browser roles",
);
ok(
  /GRANT EXECUTE ON FUNCTION public\.artifact_create_manual_order\(JSONB, TEXT, TIMESTAMPTZ\)[\s\S]*?TO service_role;/.test(packageMigration),
  "0046 grants manual-intake execution only to the service role",
);
ok(!/\bproduct_entitlements\b/i.test(packageMigration), "0046 has no software-entitlement coupling");
ok(!/etsy\.com|api\.etsy/i.test(packageMigration), "0046 cannot contact Etsy");

const availability = await readFile("lib/artifacts/fulfillment/availability.ts", "utf8");
ok(availability.includes("isArtifactWorkflowEnabled"), "founder workflow has an explicit production gate");
ok(availability.includes('process.env.NODE_ENV !== "production"'), "experimental artifact tools remain local-only");
ok(availability.includes("isEtsyArtifactAdminEnabled()"), "founder workflow requires its disabled admin flag");
ok(availability.includes("isEtsyArtifactPersistenceEnabled()"), "production workflow fails closed without persistence");
ok(availability.includes("isEtsyArtifactRealIntakeEnabled()"), "manual intake requires its own final flag");

const intakeRoute = await readFile("app/api/admin/artifacts/route.ts", "utf8");
ok(intakeRoute.includes("isRealArtifactIntakeEnabled()"), "manual intake requires the full three-flag gate");
ok(intakeRoute.includes("isLocalArtifactWorkflowEnabled()"), "fictional fixtures remain local-only");
ok(intakeRoute.includes("buildProductionAnchorCalculation"), "manual intake computes the real natal chart");
ok(intakeRoute.includes("generateProductionAnchorNarrative"), "manual intake generates personalized chapters");
ok(!/etsy\.com|api\.etsy/i.test(intakeRoute), "manual intake cannot contact Etsy");

const narrativeSource = await readFile("lib/artifacts/fulfillment/narrative.ts", "utf8");
ok(!/displayName|supportEmail|birthDate|birthCity|birthCountry/i.test(narrativeSource), "narrative model receives no direct buyer identifiers or raw birth fields");

const exportRoute = await readFile("app/api/admin/artifacts/[orderId]/export/route.ts", "utf8");
ok(!/etsy\.com|api\.etsy|delivery_recorded/i.test(exportRoute), "export route cannot contact or record Etsy delivery");
ok(exportRoute.includes("exportArtifactPdf"), "export route uses the environment-aware PDF boundary");

const pdfExport = await readFile("lib/artifacts/fulfillment/pdf-export-core.ts", "utf8");
ok(pdfExport.includes("@sparticuz/chromium"), "production PDF export uses bundled serverless Chromium");
ok(pdfExport.includes("puppeteer-core"), "production PDF export drives Chromium without a remote browser service");

const nextConfig = await readFile("next.config.js", "utf8");
ok(nextConfig.includes("natal-report-tour/*.jpg"), "production export traces the six report-tour screenshots");

const actionsRoute = await readFile("app/api/admin/artifacts/[orderId]/actions/route.ts", "utf8");
ok(!/stripe|etsy\.com|api\.etsy/i.test(actionsRoute), "refund evidence cannot contact Etsy or a payment provider");

const repositoryBoundary = await readFile("lib/artifacts/fulfillment/repository.ts", "utf8");
ok(repositoryBoundary.includes("isEtsyArtifactPersistenceEnabled"), "persisted adapter requires its disabled flag");
ok(repositoryBoundary.includes('mode: "memory"'), "memory remains the default adapter");

const persistedRepository = await readFile("lib/artifacts/fulfillment/supabase-repository.ts", "utf8");
ok(persistedRepository.includes('const PRIVATE_BUCKET = "etsy-artifacts-private"'), "persisted PDFs use only the private artifact bucket");
ok(persistedRepository.includes('rpc("artifact_create_manual_order"'), "persisted adapter uses the atomic 0046 intake function");
ok(persistedRepository.includes("validateManualArtifactIntake(intake)"), "persisted adapter validates manual intake before storage");
ok(persistedRepository.includes('booleanValue(allowlistedSourceFields, "fixture")'), "persisted reload preserves fixture versus manual provenance");
ok(!/etsy\.com|api\.etsy|delivery_recorded/i.test(persistedRepository), "persisted adapter still cannot contact or record Etsy delivery");

const retentionJob = await readFile("lib/artifacts/fulfillment/retention.ts", "utf8");
ok(retentionJob.includes("artifact_begin_file_retention"), "retention claims a file before storage deletion");
ok(retentionJob.includes("artifact_complete_retention"), "retention completion remains auditable");

console.log(`ETSY-03 artifact admin check passed: ${assertions} assertions.`);
