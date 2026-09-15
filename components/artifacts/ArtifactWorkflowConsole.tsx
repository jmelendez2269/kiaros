"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ArtifactOrderIntakeForm } from "@/components/artifacts/ArtifactOrderIntakeForm";
import type { AnchorDocumentKind } from "@/lib/artifacts/anchor-print";
import {
  ARTIFACT_QA_ITEM_IDS,
  ARTIFACT_QA_LABELS,
  type ArtifactFinancialStatus,
  type ArtifactFulfillmentState,
  type ArtifactOrderView,
  type ArtifactQaItemId,
  type ArtifactWorkflowAction,
} from "@/lib/artifacts/fulfillment/contract";
import type { ArtifactPersistenceMode } from "@/lib/artifacts/fulfillment/repository";

type WorkflowResponse =
  | { success: true; orders: readonly ArtifactOrderView[] }
  | { success: false; error: string };

const STATE_LABELS: Record<ArtifactFulfillmentState, string> = {
  intake_draft: "Intake draft",
  clarification_required: "Needs clarification",
  ready_to_generate: "Ready to generate",
  generating: "Generating",
  qa_required: "QA required",
  revision_required: "Revision required",
  approved: "Approved",
  exported: "Partially exported",
  ready_for_external_delivery: "Ready for external delivery",
  canceled: "Canceled",
};

const STATE_STYLES: Record<ArtifactFulfillmentState, string> = {
  intake_draft: "border-steel-400/30 bg-steel-500/10 text-steel-200",
  clarification_required: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  ready_to_generate: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  generating: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  qa_required: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  revision_required: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  approved: "border-moss-500/30 bg-moss-500/10 text-moss-200",
  exported: "border-steel-400/30 bg-steel-500/10 text-steel-200",
  ready_for_external_delivery: "border-moss-500/30 bg-moss-500/10 text-moss-200",
  canceled: "border-red-500/30 bg-red-950/20 text-red-200",
};

const FINANCIAL_LABELS: Record<ArtifactFinancialStatus, string> = {
  paid: "Paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function fileNameFromDisposition(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function ArtifactWorkflowConsole({
  initialOrders,
  experimentalToolsEnabled,
  persistenceMode,
  realIntakeEnabled,
}: {
  initialOrders: readonly ArtifactOrderView[];
  experimentalToolsEnabled: boolean;
  persistenceMode: ArtifactPersistenceMode;
  realIntakeEnabled: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState(initialOrders[0]?.orderId ?? null);
  const [completedQa, setCompletedQa] = useState<Set<ArtifactQaItemId>>(() => new Set());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = orders.find((order) => order.orderId === selectedId) ?? orders[0] ?? null;

  function acceptOrders(nextOrders: readonly ArtifactOrderView[]) {
    setOrders(nextOrders);
    setSelectedId((current) =>
      current && nextOrders.some((order) => order.orderId === current)
        ? current
        : nextOrders[0]?.orderId ?? null,
    );
  }

  function acceptCreatedOrder(nextOrders: readonly ArtifactOrderView[]) {
    acceptOrders(nextOrders);
    setSelectedId(nextOrders[0]?.orderId ?? null);
    setMessage("Personalized order saved. Validate the intake before generating the PDF package.");
    setError(null);
  }

  async function parseWorkflowResponse(response: Response): Promise<WorkflowResponse> {
    return (await response.json()) as WorkflowResponse;
  }

  async function createFixture(fixtureKind: "known_time" | "unknown_time") {
    setPendingAction(`create:${fixtureKind}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureKind }),
      });
      const payload = await parseWorkflowResponse(response);
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Fixture creation failed." : payload.error);
        return;
      }
      acceptOrders(payload.orders);
      setSelectedId(payload.orders[0]?.orderId ?? null);
      setMessage("Fictional order added to the local queue.");
    } catch {
      setError("The local fixture could not be created. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function runAction(action: ArtifactWorkflowAction) {
    if (!selected) return;
    setPendingAction(action);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/artifacts/${selected.orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, completedQa: [...completedQa] }),
      });
      const payload = await parseWorkflowResponse(response);
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Workflow action failed." : payload.error);
        return;
      }
      acceptOrders(payload.orders);
      if (action === "approve_qa" || action === "request_revision") setCompletedQa(new Set());
      setMessage(`Workflow updated: ${action.replace(/_/g, " ")}.`);
    } catch {
      setError("The workflow action could not be completed. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function exportPdf(documentKind: AnchorDocumentKind, paperSize: "letter" | "a4") {
    if (!selected) return;
    setPendingAction(`export:${documentKind}:${paperSize}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/artifacts/${selected.orderId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentKind, paperSize }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Local PDF export failed.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameFromDisposition(
        response.headers.get("Content-Disposition"),
        `${documentKind === "report" ? "natal-report" : "anchor-print"}-${paperSize}.pdf`,
      );
      anchor.click();
      URL.revokeObjectURL(url);

      const refreshed = await fetch("/api/admin/artifacts", { cache: "no-store" });
      const payload = await parseWorkflowResponse(refreshed);
      if (refreshed.ok && payload.success) acceptOrders(payload.orders);
      setMessage(
        `${documentKind === "report" ? "Full report" : "Anchor Print"} · ${
          paperSize === "letter" ? "US Letter" : "A4"
        } exported, privately stored, and checksummed.`,
      );
    } catch {
      setError("The PDF could not be exported. Try again; the order remains safely queued.");
    } finally {
      setPendingAction(null);
    }
  }

  function toggleQa(item: ArtifactQaItemId) {
    setCompletedQa((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="shell-panel overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">
              <FlaskConical aria-hidden size={16} />
              {experimentalToolsEnabled ? "Development fixture workflow" : "Founder fulfillment workspace"}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-bone md:text-4xl">
              Artifact fulfillment
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone-muted">
              Validate intake, generate the approved Anchor artifact, record human QA, and export private files.
              This queue cannot contact Etsy, create accounts, grant entitlements, or mark real delivery.
            </p>
          </div>
          {experimentalToolsEnabled ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[23rem] lg:grid-cols-1">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-leather-300/45 bg-leather-300/15 px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-leather-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70"
              href="/admin/artifacts/celestial-connection"
            >
              Fulfill Celestial Connection order
              <ArrowRight aria-hidden size={17} />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-300/35 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
              href="/admin/artifacts/year-ahead"
            >
              Fulfill Year Ahead Etsy order
              <ArrowRight aria-hidden size={17} />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet-300/35 bg-violet-500/15 px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-violet-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70"
              href="/admin/artifacts/star-origin"
            >
              Fulfill Star Origin Etsy order
              <ArrowRight aria-hidden size={17} />
            </Link>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pendingAction !== null}
              onClick={() => createFixture("known_time")}
              type="button"
            >
              <FileCheck2 aria-hidden size={17} />
              Add known-time fixture
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-stone-950/40 px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pendingAction !== null}
              onClick={() => createFixture("unknown_time")}
              type="button"
            >
              <FileCheck2 aria-hidden size={17} />
              Add unknown-time fixture
            </button>
            </div>
          ) : null}
        </div>
      </header>

      <ArtifactOrderIntakeForm
        enabled={realIntakeEnabled}
        onCreated={acceptCreatedOrder}
        persistenceMode={persistenceMode}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.6fr)]">
        <div className="shell-panel overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <p className="shell-kicker">Fulfillment queue</p>
            <p className="mt-2 text-sm text-bone-muted">
              {orders.length} {persistenceMode === "supabase" ? "private persisted" : "in-memory"} records
            </p>
          </div>
          <div className="max-h-[44rem] space-y-2 overflow-y-auto p-3">
            {orders.length ? (
              orders.map((order) => {
                const active = selected?.orderId === order.orderId;
                return (
                  <button
                    aria-pressed={active}
                    className={`w-full rounded-[1rem] border p-4 text-left transition-colors ${
                      active
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-border/70 bg-stone-950/30 hover:bg-muted/60"
                    }`}
                    key={order.orderId}
                    onClick={() => {
                      setSelectedId(order.orderId);
                      setCompletedQa(new Set());
                      setError(null);
                      setMessage(null);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-bone">
                        {order.displayName ?? "No display name"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATE_STYLES[order.state]}`}>
                        {STATE_LABELS[order.state]}
                      </span>
                    </div>
                    <span className="mt-2 block text-xs leading-5 text-bone-muted">
                      {order.fixtureKind === "known_time" ? "Known birth time" : "Unknown birth time"} · revision {order.revision}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm leading-6 text-bone-muted">
                No orders are waiting for fulfillment.
              </div>
            )}
          </div>
        </div>

        <div className="shell-panel min-w-0 p-5 md:p-7">
          {selected ? (
            <div className="space-y-7">
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="shell-kicker">Selected fulfillment unit</p>
                  <h2 className="mt-3 text-2xl font-semibold text-bone">
                    {selected.displayName ?? "Anchor Print"}
                  </h2>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-bone-muted">
                    {selected.fulfillmentUnitKey}
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${STATE_STYLES[selected.state]}`}>
                  {STATE_LABELS[selected.state]}
                </span>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Birth", `${selected.birthDate} · ${selected.birthPlace}`],
                  ["Support contact", selected.supportEmail],
                  ["Purchased", formatDate(selected.purchasedAt)],
                  ["Financial", FINANCIAL_LABELS[selected.financialStatus]],
                  ["Evidence", `${selected.eventCount} audit events`],
                ].map(([label, value]) => (
                  <div className="rounded-[1rem] border border-border/70 bg-stone-950/30 p-4" key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bone-muted">{label}</dt>
                    <dd className="mt-2 break-words text-sm leading-6 text-bone">{value}</dd>
                  </div>
                ))}
              </dl>

              {selected.state === "qa_required" ? (
                <fieldset className="rounded-[1.25rem] border border-amber-400/20 bg-amber-500/5 p-5">
                  <legend className="px-2 text-sm font-semibold text-bone">Human QA checklist</legend>
                  <p className="mb-4 mt-1 text-sm leading-6 text-bone-muted">
                    Complete every item for this revision before approval. These checks are audit evidence, not an independent accessibility certification.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ARTIFACT_QA_ITEM_IDS.map((item) => (
                      <label
                        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[0.9rem] border border-border/70 bg-stone-950/35 p-3 text-sm leading-6 text-bone transition-colors hover:bg-muted/50"
                        key={item}
                      >
                        <input
                          checked={completedQa.has(item)}
                          className="mt-1 h-4 w-4 accent-violet-400"
                          onChange={() => toggleQa(item)}
                          type="checkbox"
                        />
                        <span>{ARTIFACT_QA_LABELS[item]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {selected.state === "intake_draft" ? (
                  <>
                    <PrimaryAction disabled={pendingAction !== null} onClick={() => runAction("validate_intake")}>
                      <ShieldCheck aria-hidden size={17} /> Validate intake
                    </PrimaryAction>
                    <SecondaryAction disabled={pendingAction !== null} onClick={() => runAction("request_clarification")}>
                      <AlertTriangle aria-hidden size={17} /> Request clarification
                    </SecondaryAction>
                  </>
                ) : null}
                {selected.state === "clarification_required" ? (
                  <PrimaryAction disabled={pendingAction !== null} onClick={() => runAction("resolve_clarification")}>
                    <CheckCircle2 aria-hidden size={17} /> Resolve with fixture data
                  </PrimaryAction>
                ) : null}
                {selected.state === "ready_to_generate" || selected.state === "revision_required" ? (
                  <PrimaryAction disabled={pendingAction !== null} onClick={() => runAction("generate")}>
                    <RefreshCw aria-hidden size={17} /> Generate revision {selected.revision}
                  </PrimaryAction>
                ) : null}
                {selected.state === "qa_required" ? (
                  <>
                    <PrimaryAction
                      disabled={pendingAction !== null || completedQa.size !== ARTIFACT_QA_ITEM_IDS.length}
                      onClick={() => runAction("approve_qa")}
                    >
                      <CheckCircle2 aria-hidden size={17} /> Approve completed QA
                    </PrimaryAction>
                    <SecondaryAction disabled={pendingAction !== null} onClick={() => runAction("request_revision")}>
                      <RefreshCw aria-hidden size={17} /> Request revision
                    </SecondaryAction>
                  </>
                ) : null}
                {["approved", "exported", "ready_for_external_delivery"].includes(selected.state) ? (
                  <>
                    {(["report", "anchor_print"] as const).flatMap((documentKind) =>
                      (["letter", "a4"] as const).map((paperSize) => {
                        const variantKey = `${documentKind}:${paperSize}` as const;
                        const alreadyExported = selected.exportedFileVariants.includes(variantKey);
                        const documentLabel = documentKind === "report" ? "Full report" : "Anchor Print";
                        return (
                          <SecondaryAction
                            disabled={pendingAction !== null}
                            key={variantKey}
                            onClick={() => exportPdf(documentKind, paperSize)}
                          >
                            <Download aria-hidden size={17} />
                            {alreadyExported ? "Re-export" : "Export"} {documentLabel} ·{" "}
                            {paperSize === "letter" ? "US Letter" : "A4"}
                          </SecondaryAction>
                        );
                      }),
                    )}
                    <SecondaryAction disabled={pendingAction !== null} onClick={() => runAction("request_revision")}>
                      <RefreshCw aria-hidden size={17} /> Open revision
                    </SecondaryAction>
                  </>
                ) : null}
                {["intake_draft", "clarification_required", "ready_to_generate"].includes(selected.state) ? (
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pendingAction !== null}
                    onClick={() => {
                      if (window.confirm("Stop this fulfillment record? This does not contact Etsy and cannot be undone here.")) {
                        void runAction("cancel");
                      }
                    }}
                    type="button"
                  >
                    Stop fulfillment record
                  </button>
                ) : null}
                {(
                  ["intake_draft", "clarification_required", "ready_to_generate", "canceled"].includes(
                    selected.state,
                  ) && selected.financialStatus !== "refunded"
                ) ? (
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/30 bg-red-950/15 px-5 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pendingAction !== null}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Record a refund already completed in Etsy and stop fulfillment? This does not contact Etsy or a payment provider.",
                        )
                      ) {
                        void runAction("record_refund");
                      }
                    }}
                    type="button"
                  >
                    Record completed refund
                  </button>
                ) : null}
              </div>

              {selected.state === "ready_for_external_delivery" ? (
                <div className="rounded-[1.1rem] border border-moss-500/30 bg-moss-500/10 p-4 text-sm leading-6 text-moss-100">
                  All four private files are exported and checksummed. Delivery stops here: no Etsy adapter is installed and this record cannot be marked delivered.
                </div>
              ) : null}

              {selected.financialStatus === "refunded" ? (
                <div className="rounded-[1.1rem] border border-red-500/30 bg-red-950/15 p-4 text-sm leading-6 text-red-100">
                  Refund evidence is recorded and pending generation remains stopped. This action did not contact Etsy or a payment provider.
                </div>
              ) : null}

              <div aria-live="polite" className="min-h-6">
                {error ? (
                  <p className="rounded-[1rem] border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200" role="alert">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="rounded-[1rem] border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-100">
                    {message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center text-center text-sm leading-6 text-bone-muted">
              Select or create a fictional order to inspect the workflow.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PrimaryAction({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SecondaryAction({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-stone-950/40 px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
