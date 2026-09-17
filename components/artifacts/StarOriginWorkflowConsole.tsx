"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Orbit,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import type {
  StarOriginWorkflowRecord,
  StarOriginWorkflowStage,
} from "@/lib/artifacts/star-origin/workflow";
import { resonanceRoleLabel, topThreeResonances } from "@/lib/artifacts/star-origin/profile";
import {
  STAR_FAMILY_CHART_PRINT_DIMENSIONS,
  renderStarFamilyChartSvg,
} from "@/lib/artifacts/star-origin/chart-print-template";
import {
  STAR_FAMILY_CHART_PRINT_SIZES,
  STAR_ORIGIN_QA_ITEM_IDS,
  STAR_ORIGIN_QA_LABELS,
  type StarFamilyChartPrintSize,
  type StarOriginQaItemId,
} from "@/lib/artifacts/star-origin/contract";

type WorkflowResponse =
  | {
      success: true;
      record?: StarOriginWorkflowRecord;
      reports: readonly StarOriginWorkflowRecord[];
    }
  | { success: false; error: string };

const STAGE_LABELS: Record<StarOriginWorkflowStage, string> = {
  generated: "Ready to review",
  pending_review: "AI section needs review",
  approved: "Approved",
  rejected: "Revision requested",
};

const STAGE_STYLES: Record<StarOriginWorkflowStage, string> = {
  generated: "border-steel-400/30 bg-steel-500/10 text-steel-200",
  pending_review: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  approved: "border-moss-500/30 bg-moss-500/10 text-moss-200",
  rejected: "border-red-500/30 bg-red-950/20 text-red-200",
};

interface ReportForm {
  productKey: "star_origin_report" | "star_family_chart";
  shopId: string;
  receiptId: string;
  transactionId: string;
  unitIndex: string;
  listingId: string;
  purchasedAt: string;
  supportEmail: string;
  detailsConfirmed: boolean;
  displayName: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  timezone: string;
  latitude: string;
  longitude: string;
}

const FOUNDER_FIXTURE: ReportForm = {
  productKey: "star_origin_report",
  shopId: "kairos",
  receiptId: "",
  transactionId: "",
  unitIndex: "1",
  listingId: "",
  purchasedAt: "",
  supportEmail: "",
  detailsConfirmed: false,
  displayName: "",
  birthDate: "1991-06-09",
  birthTime: "01:35",
  birthCity: "Orlando",
  birthCountry: "United States",
  timezone: "America/New_York",
  latitude: "28.5383",
  longitude: "-81.3792",
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-stone-950/40 px-3 text-base text-bone outline-none transition-colors placeholder:text-bone-muted/60 focus:border-leather-300 focus:ring-2 focus:ring-leather-300/30 disabled:cursor-not-allowed disabled:opacity-50";

function resultLabel(record: StarOriginWorkflowRecord): string {
  const result = record.artifact.result;
  if (result.kind === "spread") return "Field of resonances";
  if (result.kind === "single") return result.primary.displayName;
  return `${result.primary.displayName} + ${result.secondary.displayName}`;
}

function fileNameFromDisposition(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallback;
}

export function StarOriginWorkflowConsole({
  initialReports,
  realIntakeEnabled,
}: {
  initialReports: readonly StarOriginWorkflowRecord[];
  realIntakeEnabled: boolean;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedId, setSelectedId] = useState(initialReports[0]?.reportId ?? null);
  const [form, setForm] = useState(FOUNDER_FIXTURE);
  const [externalAiConsent, setExternalAiConsent] = useState(false);
  const [completedQa, setCompletedQa] = useState<Set<StarOriginQaItemId>>(
    () => new Set(),
  );
  const [reviewNote, setReviewNote] = useState("");
  const [chartPrintSize, setChartPrintSize] =
    useState<StarFamilyChartPrintSize>("11x14");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = reports.find((record) => record.reportId === selectedId) ?? reports[0] ?? null;
  const selectedTopThree = selected
    ? topThreeResonances(selected.artifact.result, selected.artifact.map)
    : [];
  const selectedProductKey = selected?.order?.productKey ?? null;
  const requiredExportKeys =
    selectedProductKey === "star_origin_report"
      ? ["report:letter", "report:a4"]
      : selectedProductKey === "star_family_chart"
        ? STAR_FAMILY_CHART_PRINT_SIZES.map((size) => `chart_print:${size}`)
        : [];
  const exportedKeys = new Set(
    selected?.exports.map(
      (item) => `${item.documentKind}:${item.paperSize}`,
    ) ?? [],
  );
  const readyForExternalDelivery =
    selected?.stage === "approved" &&
    requiredExportKeys.length > 0 &&
    requiredExportKeys.every((key) => exportedKeys.has(key));

  function accept(payload: Extract<WorkflowResponse, { success: true }>) {
    setReports(payload.reports);
    if (payload.record) setSelectedId(payload.record.reportId);
  }

  async function parse(response: Response): Promise<WorkflowResponse> {
    return (await response.json()) as WorkflowResponse;
  }

  async function createReport() {
    setPendingAction("create");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/star-origin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          displayName: form.displayName.trim(),
          unitIndex: Number(form.unitIndex),
          listingId: form.listingId.trim() || null,
          purchasedAt: new Date(form.purchasedAt).toISOString(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }),
      });
      const payload = await parse(response);
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Report generation failed." : payload.error);
        return;
      }
      accept(payload);
      setExternalAiConsent(false);
      setCompletedQa(new Set());
      setReviewNote("");
      setMessage("The Etsy order is in the review queue and its deterministic files are ready for QA.");
    } catch {
      setError("The report could not be generated. Check the birth data and try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function runAction(action: "synthesize" | "approve" | "reject") {
    if (!selected) return;
    setPendingAction(action);
    setError(null);
    setMessage(null);
    try {
      const body =
        action === "synthesize"
          ? { action, externalAiConsent }
          : action === "reject"
            ? { action, note: reviewNote }
            : { action, completedQa: [...completedQa] };
      const response = await fetch(`/api/admin/star-origin/${selected.reportId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await parse(response);
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Workflow action failed." : payload.error);
        return;
      }
      accept(payload);
      if (action === "synthesize") {
        setMessage("The personalized section is ready for human review.");
      } else if (action === "approve") {
        setCompletedQa(new Set());
        setMessage("Report approved. PDF export is now unlocked.");
      } else {
        setCompletedQa(new Set());
        setMessage("Revision requested. The rejection note has been recorded.");
      }
    } catch {
      setError("The workflow action could not be completed. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function exportPdf(paperSize: "letter" | "a4") {
    if (!selected) return;
    setPendingAction(`export:${paperSize}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/star-origin/${selected.reportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperSize }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "PDF export failed.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameFromDisposition(
        response.headers.get("Content-Disposition"),
        `star-origin-${paperSize}.pdf`,
      );
      anchor.click();
      URL.revokeObjectURL(url);

      const refreshed = await fetch("/api/admin/star-origin", { cache: "no-store" });
      const payload = await parse(refreshed);
      if (refreshed.ok && payload.success) accept(payload);
      setMessage(`${paperSize === "letter" ? "US Letter" : "A4"} PDF exported locally.`);
    } catch {
      setError("PDF export failed. Check that local Chrome or Edge is available.");
    } finally {
      setPendingAction(null);
    }
  }

  async function exportChartPrint() {
    if (!selected) return;
    setPendingAction("export:chart:" + chartPrintSize);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/star-origin/${selected.reportId}/chart-export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printSize: chartPrintSize }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Chart-print export failed.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameFromDisposition(
        response.headers.get("Content-Disposition"),
        `star-family-chart-${chartPrintSize}.pdf`,
      );
      anchor.click();
      URL.revokeObjectURL(url);

      const refreshed = await fetch("/api/admin/star-origin", {
        cache: "no-store",
      });
      const payload = await parse(refreshed);
      if (refreshed.ok && payload.success) accept(payload);
      setMessage(
        STAR_FAMILY_CHART_PRINT_DIMENSIONS[chartPrintSize].label +
          " standalone chart PDF exported locally.",
      );
    } catch {
      setError(
        "Chart-print export failed. Check that local Chrome or Edge is available.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const busy = pendingAction !== null;
  const canCreate =
    realIntakeEnabled &&
    !busy &&
    form.detailsConfirmed &&
    [
      form.shopId,
      form.receiptId,
      form.transactionId,
      form.purchasedAt,
      form.supportEmail,
      form.displayName,
      form.birthDate,
      form.birthTime,
      form.birthCity,
      form.birthCountry,
      form.timezone,
      form.latitude,
      form.longitude,
    ].every((value) => value.trim().length > 0);
  const canSynthesize =
    selected &&
    ["generated", "rejected"].includes(selected.stage) &&
    selected.artifact.result.kind !== "spread" &&
    selected.order?.productKey !== "star_family_chart";
  const canReview = selected && ["generated", "pending_review"].includes(selected.stage);

  function toggleQa(item: StarOriginQaItemId) {
    setCompletedQa((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[92rem] space-y-6">
      <header className="shell-panel p-6 md:p-8">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-bone-muted transition-colors hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70"
          href="/admin/artifacts"
        >
          <ArrowLeft aria-hidden size={17} />
          Artifact fulfillment
        </Link>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker">Manual Etsy fulfillment</p>
            <h1 className="mt-3 font-display text-4xl text-bone md:text-5xl">Star Origin</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone-muted">
              Enter one Etsy fulfillment unit, generate the purchased Star Origin product, complete human review, and export only the files promised by that listing.
            </p>
          </div>
          <div className="rounded-2xl border border-moss-500/25 bg-moss-500/10 px-4 py-3 text-sm leading-6 text-moss-100">
            <ShieldCheck className="mr-2 inline" aria-hidden size={18} />
            No checkout, customer contact, upload, or delivery action exists here.
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="shell-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="shell-kicker">New Etsy order</p>
                <h2 className="mt-2 text-xl font-semibold text-bone">Order intake</h2>
              </div>
              <FileText aria-hidden className="text-leather-200" size={22} />
            </div>
            <div className="mt-5 space-y-4">
              {!realIntakeEnabled ? (
                <p className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-sm leading-6 text-amber-100">
                  Manual Etsy intake is disabled. Enable the same local-only real-intake flag used by the regular birth-chart workflow before entering customer data.
                </p>
              ) : null}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-bone">Purchased product</legend>
                <label className={`block cursor-pointer rounded-xl border p-3 transition-colors ${form.productKey === "star_origin_report" ? "border-leather-300 bg-leather-300/10" : "border-border/70 bg-stone-950/30"}`}>
                  <span className="flex items-start gap-3">
                    <input checked={form.productKey === "star_origin_report"} className="mt-1" name="star-origin-product" onChange={() => setForm({ ...form, productKey: "star_origin_report" })} type="radio" />
                    <span><strong className="block text-sm text-bone">Interpretive report</strong><span className="mt-1 block text-xs leading-5 text-bone-muted">US Letter + A4 reading files</span></span>
                  </span>
                </label>
                <label className={`block cursor-pointer rounded-xl border p-3 transition-colors ${form.productKey === "star_family_chart" ? "border-violet-300 bg-violet-500/10" : "border-border/70 bg-stone-950/30"}`}>
                  <span className="flex items-start gap-3">
                    <input checked={form.productKey === "star_family_chart"} className="mt-1" name="star-origin-product" onChange={() => setForm({ ...form, productKey: "star_family_chart" })} type="radio" />
                    <span><strong className="block text-sm text-bone">Celestial wall print</strong><span className="mt-1 block text-xs leading-5 text-bone-muted">8×10, 11×14, 16×20, A4 + A3</span></span>
                  </span>
                </label>
              </fieldset>

              <div className="space-y-3 border-t border-border/70 pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone-muted">Etsy identity</p>
                <Field label="Shop ID or stable shop name"><input className={INPUT_CLASS} value={form.shopId} onChange={(event) => setForm({ ...form, shopId: event.target.value })} /></Field>
                <Field label="Receipt / order number"><input className={INPUT_CLASS} value={form.receiptId} onChange={(event) => setForm({ ...form, receiptId: event.target.value })} /></Field>
                <Field label="Transaction ID"><input className={INPUT_CLASS} value={form.transactionId} onChange={(event) => setForm({ ...form, transactionId: event.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Unit number"><input className={INPUT_CLASS} min="1" type="number" value={form.unitIndex} onChange={(event) => setForm({ ...form, unitIndex: event.target.value })} /></Field>
                  <Field label="Listing ID"><input className={INPUT_CLASS} value={form.listingId} onChange={(event) => setForm({ ...form, listingId: event.target.value })} /></Field>
                </div>
                <Field label="Purchased at"><input className={INPUT_CLASS} type="datetime-local" value={form.purchasedAt} onChange={(event) => setForm({ ...form, purchasedAt: event.target.value })} /></Field>
                <Field label="Buyer contact email"><input className={INPUT_CLASS} type="email" value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} /></Field>
              </div>

              <div className="space-y-3 border-t border-border/70 pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone-muted">Personalization</p>
                <Field label="Display name"><input className={INPUT_CLASS} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Birth date"><input className={INPUT_CLASS} type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></Field>
                  <Field label="Birth time"><input className={INPUT_CLASS} type="time" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /></Field>
                </div>
                <p className="text-xs leading-5 text-amber-100">These products require an exact birth time. Pause the Etsy order for clarification if it is missing.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City"><input className={INPUT_CLASS} value={form.birthCity} onChange={(event) => setForm({ ...form, birthCity: event.target.value })} /></Field>
                  <Field label="Country"><input className={INPUT_CLASS} value={form.birthCountry} onChange={(event) => setForm({ ...form, birthCountry: event.target.value })} /></Field>
                </div>
                <Field label="IANA timezone"><input className={INPUT_CLASS} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude"><input className={INPUT_CLASS} inputMode="decimal" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} /></Field>
                  <Field label="Longitude"><input className={INPUT_CLASS} inputMode="decimal" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} /></Field>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-sm leading-6 text-bone">
                <input checked={form.detailsConfirmed} className="mt-1 h-4 w-4 accent-violet-400" onChange={(event) => setForm({ ...form, detailsConfirmed: event.target.checked })} type="checkbox" />
                I copied the product, order IDs, birth details, coordinates, and timezone from the Etsy order and confirmed them.
              </label>
              <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-leather-300 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canCreate} onClick={createReport} type="button">
                {pendingAction === "create" ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" size={17} /> : <FileText aria-hidden size={17} />}
                Prepare purchased product
              </button>
              <p className="text-xs leading-5 text-bone-muted">One record represents one Etsy transaction unit. Re-entering the same unit is safe; conflicting data is blocked.</p>
            </div>
          </div>

          <div className="shell-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4"><p className="shell-kicker">Etsy order queue</p></div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto p-3">
              {reports.length ? reports.map((record) => (
                <button
                  aria-pressed={selected?.reportId === record.reportId}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${selected?.reportId === record.reportId ? "border-violet-400/40 bg-violet-500/10" : "border-border/70 bg-stone-950/30 hover:bg-muted/60"}`}
                  key={record.reportId}
                  onClick={() => { setSelectedId(record.reportId); setCompletedQa(new Set()); setError(null); setMessage(null); setReviewNote(record.reviewNote ?? ""); }}
                  type="button"
                >
                  <span className="block font-medium text-bone">{record.artifact.displayName ?? resultLabel(record)}</span>
                  <span className="mt-2 block text-xs leading-5 text-bone-muted">
                    {record.order?.productLabel ?? "Internal studio record"}
                    {record.order ? ` · Etsy #${record.order.source.receiptId}` : ""}
                  </span>
                  <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STAGE_STYLES[record.stage]}`}>{STAGE_LABELS[record.stage]}</span>
                </button>
              )) : <p className="p-5 text-sm leading-6 text-bone-muted">Enter an Etsy order to begin fulfillment.</p>}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {error ? <div role="alert" className="rounded-2xl border border-red-500/35 bg-red-950/30 p-4 text-sm text-red-100">{error}</div> : null}
          {message ? <div role="status" className="rounded-2xl border border-moss-500/30 bg-moss-500/10 p-4 text-sm text-moss-100">{message}</div> : null}

          {selected ? (
            <>
              <div className="shell-panel p-5 md:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="shell-kicker">Purchased deliverable</p>
                    <h2 className="mt-2 font-display text-3xl text-bone">{resultLabel(selected)}</h2>
                    <p className="mt-2 text-sm text-bone-muted">{selected.order?.productLabel ?? "Internal Star Origin studio record"}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${STAGE_STYLES[selected.stage]}`}>{STAGE_LABELS[selected.stage]}</span>
                </div>

                {selected.order ? (
                  <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border/70 bg-stone-950/30 p-3"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bone-muted">Etsy order</dt><dd className="mt-2 text-sm text-bone">#{selected.order.source.receiptId}</dd></div>
                    <div className="rounded-xl border border-border/70 bg-stone-950/30 p-3"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bone-muted">Transaction</dt><dd className="mt-2 break-all text-sm text-bone">{selected.order.source.transactionId}</dd></div>
                    <div className="rounded-xl border border-border/70 bg-stone-950/30 p-3"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bone-muted">Contact</dt><dd className="mt-2 break-words text-sm text-bone">{selected.order.supportEmail}</dd></div>
                    <div className="rounded-xl border border-border/70 bg-stone-950/30 p-3"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bone-muted">Files</dt><dd className="mt-2 text-sm text-bone">{requiredExportKeys.filter((key) => exportedKeys.has(key)).length} of {requiredExportKeys.length} exported</dd></div>
                  </dl>
                ) : null}

                {canSynthesize ? (
                  <div className="mt-6 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-bone">
                      <input className="mt-1" checked={externalAiConsent} onChange={(event) => setExternalAiConsent(event.target.checked)} type="checkbox" />
                      <span><strong>External AI disclosure.</strong> Send derived chart facts, fixed-star contacts, and the lineage summary to the configured Vercel AI Gateway for GPT‑5.4 personalization. Raw birth date, time, coordinates, name, and contact details are not included in that model request.</span>
                    </label>
                    <button className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/20 px-5 text-sm font-semibold text-bone transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !externalAiConsent} onClick={() => runAction("synthesize")} type="button">
                      {pendingAction === "synthesize" ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" size={17} /> : <Sparkles aria-hidden size={17} />}
                      Add personalized lifetime section
                    </button>
                  </div>
                ) : null}

                {canReview ? (
                  <div className="mt-6 space-y-4">
                    <fieldset className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                      <legend className="px-2 text-sm font-semibold text-bone">Human QA checklist</legend>
                      <p className="mb-4 mt-1 text-sm leading-6 text-bone-muted">Complete every check for this purchased product before approval.</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {STAR_ORIGIN_QA_ITEM_IDS.map((item) => (
                          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-stone-950/35 p-3 text-sm leading-6 text-bone" key={item}>
                            <input checked={completedQa.has(item)} className="mt-1 h-4 w-4 accent-violet-400" onChange={() => toggleQa(item)} type="checkbox" />
                            <span>{STAR_ORIGIN_QA_LABELS[item]}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <label className="text-sm font-medium text-bone">Revision note
                      <textarea className={`${INPUT_CLASS} mt-2 min-h-24 resize-y py-3`} placeholder="Required when rejecting" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
                    </label>
                    <button className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-full border border-red-400/35 px-5 text-sm font-semibold text-red-100 transition-colors hover:bg-red-950/30 disabled:opacity-50" disabled={busy || !reviewNote.trim()} onClick={() => runAction("reject")} type="button"><XCircle aria-hidden size={17} />Reject</button>
                    <button className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-full bg-moss-400 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-moss-300 disabled:opacity-50" disabled={busy || completedQa.size !== STAR_ORIGIN_QA_ITEM_IDS.length} onClick={() => runAction("approve")} type="button"><CheckCircle2 aria-hidden size={17} />Approve completed QA</button>
                    </div>
                  </div>
                ) : null}

                {selected.stage === "approved" ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {selectedProductKey !== "star_family_chart" ? (
                    <section className="rounded-2xl border border-border/80 bg-stone-950/25 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone-muted">Interpretive report</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {(["letter", "a4"] as const).map((size) => {
                          const alreadyExported = exportedKeys.has(`report:${size}`);
                          return (
                            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leather-300 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:opacity-50" disabled={busy} key={size} onClick={() => exportPdf(size)} type="button">
                              <Download aria-hidden size={17} />{alreadyExported ? "Re-export" : "Export"} {size === "letter" ? "US Letter" : "A4"}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    ) : null}
                    {selected.artifact.chartPrintFiles.length && selectedProductKey !== "star_origin_report" ? (
                      <section className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">Standalone wall print</p>
                        <p className="mt-2 text-sm leading-6 text-bone-muted">Chart artwork only—no interpretation pages. Export all five sizes for the Etsy delivery package.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                          <label className="text-sm font-medium text-bone">
                            <span className="sr-only">Chart print size</span>
                            <select className={INPUT_CLASS} value={chartPrintSize} onChange={(event) => setChartPrintSize(event.target.value as StarFamilyChartPrintSize)}>
                              {STAR_FAMILY_CHART_PRINT_SIZES.map((size) => (
                                <option key={size} value={size}>{STAR_FAMILY_CHART_PRINT_DIMENSIONS[size].label}</option>
                              ))}
                            </select>
                          </label>
                          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-300 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-violet-200 disabled:opacity-50" disabled={busy} onClick={exportChartPrint} type="button">
                            {pendingAction === "export:chart:" + chartPrintSize ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" size={17} /> : <Orbit aria-hidden size={17} />}
                            {exportedKeys.has(`chart_print:${chartPrintSize}`) ? "Re-export chart" : "Export chart"}
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : null}

                {readyForExternalDelivery ? (
                  <div className="mt-6 rounded-2xl border border-moss-500/30 bg-moss-500/10 p-4 text-sm leading-6 text-moss-100">
                    Every file promised by this SKU has been exported and checksummed. The package is ready to attach to the Etsy order; this admin does not contact Etsy or mark delivery.
                  </div>
                ) : null}
              </div>

              {selected.artifact.chartPrintFiles.length && selectedProductKey !== "star_origin_report" ? (
                <article className="overflow-hidden rounded-[1.5rem] border border-[#b8aa99] bg-[#f4eddf] text-[#171722] shadow-2xl">
                  <header className="border-l-[7px] border-[#9b5830] bg-[#2b1c49] px-6 py-6 text-[#fffaf0] md:px-10">
                    <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#f0bb86]">Standalone product preview</p>
                    <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Star Family Birth Chart</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#e8ddf0]">A scalable vector chart showing the exact fixed stars and natal points behind the top three. This file contains no interpretive reading.</p>
                  </header>
                  <div className="grid gap-6 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
                    <div
                      className="mx-auto aspect-square w-full max-w-[46rem]"
                      dangerouslySetInnerHTML={{ __html: renderStarFamilyChartSvg(selected.artifact) }}
                    />
                    <ol className="grid gap-3">
                      {selected.artifact.chartPrint.highlights.map((highlight) => (
                        <li className={highlight.rank === 1 ? "border-l-[6px] border-[#9b5830] bg-[#eadbcf] p-4" : highlight.rank === 2 ? "border-l-[6px] border-dashed border-[#5135a8] bg-[#e7def2] p-4" : "border-l-[6px] border-dotted border-[#315f80] bg-[#dce7ec] p-4"} key={highlight.lineageId}>
                          <span className="text-xs font-extrabold tracking-[0.16em] text-[#6d4937]">0{highlight.rank}</span>
                          <strong className="mt-1 block font-display text-xl">{highlight.displayName}</strong>
                          <span className="mt-1 block text-xs font-semibold capitalize text-[#4d4753]">{resonanceRoleLabel(highlight.role)}</span>
                          <span className="mt-2 block text-sm text-[#39343e]">{highlight.starName} to {highlight.markerName} · {highlight.orb.toFixed(2)}°</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </article>
              ) : null}

              {selectedProductKey !== "star_family_chart" ? (
              <article className="overflow-hidden rounded-[1.5rem] border border-[#b8aa99] bg-[#f3ede1] text-[#161720] shadow-2xl">
                <header className="border-t-8 border-[#4f367f] px-6 py-8 md:px-10">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#4f367f]">Kairos · Star Origin</p>
                  <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">Your resonance profile</h2>
                  {selectedTopThree.length ? (
                    <ol className="mt-6 grid max-w-3xl gap-3">
                      {selectedTopThree.map((entry) => (
                        <li
                          className={entry.role === "supporting_resonance" ? "grid grid-cols-[2rem_1fr] items-center border border-[#b8aa99] bg-[#ece2d3] p-4" : "grid grid-cols-[2rem_1fr] items-center border border-[#4f367f] border-l-[6px] border-l-[#a9683c] bg-[#ded2e8] p-4"}
                          key={entry.row.lineageId}
                        >
                          <span className="text-xs font-extrabold tracking-wider text-[#8c5633]">0{entry.rank}</span>
                          <span className="grid gap-1">
                            <strong className="font-display text-xl text-[#161720]">{entry.row.displayName}</strong>
                            <span className="text-xs font-semibold capitalize text-[#55505e]">{resonanceRoleLabel(entry.role)} · {entry.row.nearestStar} to {entry.row.nearestMarker.split("_").join(" ")} · {entry.row.orb.toFixed(2)}°</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : <h2 className="mt-5 font-display text-4xl md:text-5xl">{resultLabel(selected)}</h2>}
                  <p className="mt-3 text-sm text-[#55505e]">{selected.artifact.normalizedBirth.date} · {selected.artifact.normalizedBirth.city}, {selected.artifact.normalizedBirth.country}</p>
                </header>
                <div className="divide-y divide-[#b8aa99]">
                  {selected.artifact.sections.map((section) => (
                    <section className="px-6 py-8 md:px-10 md:py-10" key={section.id}>
                      <header className="max-w-4xl border-l-[6px] border-[#a9683c] bg-[#342452] px-5 py-5 text-[#fffaf0] md:px-7 md:py-6">
                        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#f0bb86]">{section.id.replace(/_/g, " ")}</p>
                        <h3 className="mt-3 font-display text-3xl font-bold md:text-4xl">{section.title}</h3>
                        {section.subtitle ? <p className="mt-2 font-display text-lg font-semibold italic text-[#eadff2]">{section.subtitle}</p> : null}
                      </header>
                      <div className="mt-6 max-w-[72ch] space-y-4 text-[15px] leading-7">
                        {section.paragraphs.map((paragraph, index) => <p key={`${section.id}-${index}`}>{paragraph}</p>)}
                      </div>
                    </section>
                  ))}
                  <section className="overflow-x-auto px-6 py-8 md:px-10 md:py-10">
                    <h3 className="font-display text-3xl">The workings</h3>
                    <table className="mt-6 min-w-[48rem] w-full border-collapse text-left text-sm">
                      <thead><tr className="border-b border-[#342452] bg-[#342452] text-xs font-extrabold uppercase tracking-wider text-[#fffaf0]"><th className="px-3 py-3">Star</th><th className="px-3">Met</th><th className="px-3">Star position</th><th className="px-3">Chart position</th><th className="px-3">Apart</th><th className="px-3">Role</th></tr></thead>
                      <tbody>{selected.artifact.workings.map((row, index) => <tr className="border-b border-[#b8aa99]/70" key={`${row.star}-${row.marker}-${index}`}><th className="py-3 pr-4 text-[#4f367f]">{row.star}</th><td className="pr-4">{row.marker}</td><td className="pr-4 tabular-nums">{row.starPosition}</td><td className="pr-4 tabular-nums">{row.markerPosition}</td><td className="pr-4 tabular-nums">{row.separation}</td><td>{row.tag}</td></tr>)}</tbody>
                    </table>
                  </section>
                </div>
              </article>
              ) : null}
            </>
          ) : (
            <div className="shell-panel flex min-h-[30rem] items-center justify-center p-8 text-center text-bone-muted">Generate a local report to see the complete reading here.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-bone"><span className="mb-2 block">{label}</span>{children}</label>;
}
