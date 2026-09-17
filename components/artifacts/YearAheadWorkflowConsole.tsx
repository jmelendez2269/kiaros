"use client";

import {
  ArrowLeft, CalendarRange, CheckCircle2, Download, FileClock, Loader2,
  MapPin, Orbit, ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  CELESTIAL_YEAR_MAP_PRINT_SIZES,
  YEAR_AHEAD_QA_ITEM_IDS,
  YEAR_AHEAD_QA_LABELS,
  type CelestialYearMapPrintSize,
  type YearAheadProductKey,
  type YearAheadQaItemId,
} from "@/lib/artifacts/year-ahead/contract";
import {
  CELESTIAL_YEAR_MAP_DIMENSIONS,
  renderCelestialYearMapSvg,
} from "@/lib/artifacts/year-ahead/year-map-template";
import type {
  YearAheadWorkflowRecord,
  YearAheadWorkflowStage,
} from "@/lib/artifacts/year-ahead/workflow";

type WorkflowResponse =
  | { success: true; record?: YearAheadWorkflowRecord; reports: readonly YearAheadWorkflowRecord[] }
  | { success: false; error: string };

interface FormState {
  productKey: YearAheadProductKey;
  shopId: string; receiptId: string; transactionId: string; unitIndex: string;
  listingId: string; purchasedAt: string; supportEmail: string; detailsConfirmed: boolean;
  displayName: string; targetBirthdayYear: string;
  birthDate: string; birthTime: string; birthCity: string; birthCountry: string;
  birthTimezone: string; birthLatitude: string; birthLongitude: string;
  returnCity: string; returnCountry: string; returnTimezone: string;
  returnLatitude: string; returnLongitude: string;
}

const DEFAULT_FORM: FormState = {
  productKey: "year_ahead_report",
  shopId: "kairos", receiptId: "", transactionId: "", unitIndex: "1", listingId: "",
  purchasedAt: "", supportEmail: "", detailsConfirmed: false, displayName: "",
  targetBirthdayYear: String(new Date().getFullYear()),
  birthDate: "1991-06-09", birthTime: "01:35", birthCity: "Orlando",
  birthCountry: "United States", birthTimezone: "America/New_York",
  birthLatitude: "28.5383", birthLongitude: "-81.3792",
  returnCity: "Orlando", returnCountry: "United States", returnTimezone: "America/New_York",
  returnLatitude: "28.5383", returnLongitude: "-81.3792",
};

const INPUT = "min-h-11 w-full rounded-xl border border-border bg-stone-950/40 px-3 text-base text-bone outline-none transition-colors placeholder:text-bone-muted/60 focus:border-leather-300 focus:ring-2 focus:ring-leather-300/30 disabled:cursor-not-allowed disabled:opacity-50";
const STAGE_LABELS: Record<YearAheadWorkflowStage, string> = {
  calculated: "Chart calculated", pending_review: "Interpretation needs review",
  approved: "Approved", rejected: "Revision requested",
};
const STAGE_STYLES: Record<YearAheadWorkflowStage, string> = {
  calculated: "border-steel-400/30 bg-steel-500/10 text-steel-100",
  pending_review: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  approved: "border-moss-500/30 bg-moss-500/10 text-moss-100",
  rejected: "border-red-500/30 bg-red-950/20 text-red-100",
};

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function fileName(disposition: string | null, fallback: string): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallback;
}

export function YearAheadWorkflowConsole({
  initialReports,
  realIntakeEnabled,
}: {
  initialReports: readonly YearAheadWorkflowRecord[];
  realIntakeEnabled: boolean;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedId, setSelectedId] = useState(initialReports[0]?.reportId ?? null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [externalAiConsent, setExternalAiConsent] = useState(false);
  const [completedQa, setCompletedQa] = useState<Set<YearAheadQaItemId>>(() => new Set());
  const [reviewNote, setReviewNote] = useState("");
  const [mapSize, setMapSize] = useState<CelestialYearMapPrintSize>("11x14");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = reports.find((record) => record.reportId === selectedId) ?? reports[0] ?? null;
  const exportedKeys = new Set(selected?.exports.map((item) => `${item.documentKind}:${item.size}`) ?? []);
  const requiredKeys = selected?.order.productKey === "year_ahead_report"
    ? ["report:letter", "report:a4"]
    : CELESTIAL_YEAR_MAP_PRINT_SIZES.map((size) => `year_map:${size}`);
  const ready = selected?.stage === "approved" && requiredKeys.every((key) => exportedKeys.has(key));
  const busy = pendingAction !== null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function accept(payload: Extract<WorkflowResponse, { success: true }>) {
    setReports(payload.reports);
    if (payload.record) setSelectedId(payload.record.reportId);
  }

  async function parse(response: Response): Promise<WorkflowResponse> {
    return (await response.json()) as WorkflowResponse;
  }

  async function createOrder() {
    setPendingAction("create"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/year-ahead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          unitIndex: Number(form.unitIndex), targetBirthdayYear: Number(form.targetBirthdayYear),
          listingId: form.listingId.trim() || null,
          purchasedAt: new Date(form.purchasedAt).toISOString(),
          birthLatitude: Number(form.birthLatitude), birthLongitude: Number(form.birthLongitude),
          returnLatitude: Number(form.returnLatitude), returnLongitude: Number(form.returnLongitude),
        }),
      });
      const payload = await parse(response);
      if (!response.ok || !payload.success) { setError(payload.success ? "Order calculation failed." : payload.error); return; }
      accept(payload); setExternalAiConsent(false); setCompletedQa(new Set()); setReviewNote("");
      setMessage(form.productKey === "year_ahead_report" ? "The chart is calculated. Generate the interpretation next." : "The Celestial Year Map is calculated and ready for human QA.");
    } catch {
      setError("The order could not be calculated. Check every location, time, and coordinate.");
    } finally { setPendingAction(null); }
  }

  async function runAction(action: "synthesize" | "approve" | "reject") {
    if (!selected) return;
    setPendingAction(action); setError(null); setMessage(null);
    try {
      const body = action === "synthesize" ? { action, externalAiConsent }
        : action === "approve" ? { action, completedQa: [...completedQa] }
          : { action, note: reviewNote };
      const response = await fetch(`/api/admin/year-ahead/${selected.reportId}/actions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const payload = await parse(response);
      if (!response.ok || !payload.success) { setError(payload.success ? "Workflow action failed." : payload.error); return; }
      accept(payload); setCompletedQa(new Set());
      setMessage(action === "synthesize" ? "The complete forecast is ready for human review." : action === "approve" ? "QA approved. Purchased exports are unlocked." : "Revision requested and recorded locally.");
    } catch { setError("The workflow action could not be completed. Try again."); }
    finally { setPendingAction(null); }
  }

  async function exportFile(kind: "report" | "year_map", size: "letter" | "a4" | CelestialYearMapPrintSize) {
    if (!selected) return;
    const action = `export:${kind}:${size}`;
    setPendingAction(action); setError(null); setMessage(null);
    try {
      const endpoint = kind === "report" ? "export" : "map-export";
      const response = await fetch(`/api/admin/year-ahead/${selected.reportId}/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "report" ? { paperSize: size } : { printSize: size }),
      });
      if (!response.ok) { const payload = (await response.json()) as { error?: string }; setError(payload.error ?? "PDF export failed."); return; }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = fileName(response.headers.get("Content-Disposition"), `year-ahead-${size}.pdf`); anchor.click(); URL.revokeObjectURL(url);
      const refreshed = await fetch("/api/admin/year-ahead", { cache: "no-store" }); const payload = await parse(refreshed);
      if (refreshed.ok && payload.success) accept(payload);
      setMessage(`${kind === "report" ? "Report" : "Celestial Year Map"} ${size} exported locally.`);
    } catch { setError("PDF export failed. Check that local Chrome or Edge is available."); }
    finally { setPendingAction(null); }
  }

  function copyBirthPlace() {
    setForm((current) => ({ ...current, returnCity: current.birthCity, returnCountry: current.birthCountry, returnTimezone: current.birthTimezone, returnLatitude: current.birthLatitude, returnLongitude: current.birthLongitude }));
  }

  function toggleQa(item: YearAheadQaItemId) {
    setCompletedQa((current) => { const next = new Set(current); if (next.has(item)) next.delete(item); else next.add(item); return next; });
  }

  const requiredFormValues = [form.shopId, form.receiptId, form.transactionId, form.purchasedAt, form.supportEmail, form.displayName, form.targetBirthdayYear, form.birthDate, form.birthTime, form.birthCity, form.birthCountry, form.birthTimezone, form.birthLatitude, form.birthLongitude, form.returnCity, form.returnCountry, form.returnTimezone, form.returnLatitude, form.returnLongitude];
  const canCreate = realIntakeEnabled && !busy && form.detailsConfirmed && requiredFormValues.every((value) => value.trim().length > 0);
  const canSynthesize = selected?.order.productKey === "year_ahead_report" && ["calculated", "rejected"].includes(selected.stage);
  const canReview = selected && (selected.order.productKey === "celestial_year_map" ? selected.stage === "calculated" : selected.stage === "pending_review");

  return <div className="mx-auto max-w-[94rem] space-y-6">
    <header className="shell-panel p-6 md:p-8">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-bone-muted transition-colors hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70" href="/admin/artifacts"><ArrowLeft aria-hidden size={17}/>Artifact fulfillment</Link>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><p className="shell-kicker">Manual Etsy fulfillment</p><h1 className="mt-3 font-display text-4xl text-bone md:text-5xl">Year Ahead Studio</h1><p className="mt-4 max-w-2xl text-base leading-7 text-bone-muted">Calculate one birthday-to-birthday forecast, review its Top 3 timing windows, and export only the files purchased on Etsy.</p></div><div className="rounded-2xl border border-moss-500/25 bg-moss-500/10 px-4 py-3 text-sm leading-6 text-moss-100"><ShieldCheck className="mr-2 inline" aria-hidden size={18}/>No checkout, customer contact, upload, or delivery action exists here.</div></div>
    </header>
    <section className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="space-y-6">
        <div className="shell-panel p-5"><div className="flex items-center justify-between"><div><p className="shell-kicker">New Etsy order</p><h2 className="mt-2 text-xl font-semibold text-bone">Order intake</h2></div><CalendarRange className="text-leather-200" aria-hidden size={24}/></div>
          <div className="mt-5 space-y-4">
            {!realIntakeEnabled ? <p className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-sm leading-6 text-amber-100">Manual Etsy intake is disabled. Enable the same local-only real-intake flag used by the natal workflow before entering customer data.</p> : null}
            <fieldset className="space-y-2"><legend className="text-sm font-medium text-bone">Purchased product</legend>
              <ProductChoice active={form.productKey === "year_ahead_report"} detail="US Letter + A4 · interpretation included" label="Year Ahead Forecast" name="year-ahead-product" onChange={() => update("productKey", "year_ahead_report")}/>
              <ProductChoice active={form.productKey === "celestial_year_map"} detail="8×10, 11×14, 16×20, A4 + A3" label="Celestial Year Map" name="year-ahead-product" onChange={() => update("productKey", "celestial_year_map")} violet/>
            </fieldset>
            <FormSection title="Etsy identity"><Field label="Shop ID"><input className={INPUT} value={form.shopId} onChange={(event)=>update("shopId",event.target.value)}/></Field><Field label="Receipt / order number"><input className={INPUT} value={form.receiptId} onChange={(event)=>update("receiptId",event.target.value)}/></Field><Field label="Transaction ID"><input className={INPUT} value={form.transactionId} onChange={(event)=>update("transactionId",event.target.value)}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Unit number"><input className={INPUT} min="1" type="number" value={form.unitIndex} onChange={(event)=>update("unitIndex",event.target.value)}/></Field><Field label="Listing ID"><input className={INPUT} value={form.listingId} onChange={(event)=>update("listingId",event.target.value)}/></Field></div><Field label="Purchased at"><input className={INPUT} type="datetime-local" value={form.purchasedAt} onChange={(event)=>update("purchasedAt",event.target.value)}/></Field><Field label="Buyer contact email"><input className={INPUT} type="email" value={form.supportEmail} onChange={(event)=>update("supportEmail",event.target.value)}/></Field></FormSection>
            <FormSection title="Birth chart"><Field label="Display name"><input className={INPUT} value={form.displayName} onChange={(event)=>update("displayName",event.target.value)}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Birth date"><input className={INPUT} type="date" value={form.birthDate} onChange={(event)=>update("birthDate",event.target.value)}/></Field><Field label="Exact birth time"><input className={INPUT} type="time" value={form.birthTime} onChange={(event)=>update("birthTime",event.target.value)}/></Field></div><Field label="Birthday year to forecast"><input className={INPUT} min="1900" max="2200" type="number" value={form.targetBirthdayYear} onChange={(event)=>update("targetBirthdayYear",event.target.value)}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Birth city"><input className={INPUT} value={form.birthCity} onChange={(event)=>update("birthCity",event.target.value)}/></Field><Field label="Country"><input className={INPUT} value={form.birthCountry} onChange={(event)=>update("birthCountry",event.target.value)}/></Field></div><Field label="Birth IANA timezone"><input className={INPUT} value={form.birthTimezone} onChange={(event)=>update("birthTimezone",event.target.value)}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Latitude"><input className={INPUT} inputMode="decimal" value={form.birthLatitude} onChange={(event)=>update("birthLatitude",event.target.value)}/></Field><Field label="Longitude"><input className={INPUT} inputMode="decimal" value={form.birthLongitude} onChange={(event)=>update("birthLongitude",event.target.value)}/></Field></div><p className="text-xs leading-5 text-amber-100">An exact birth time is required because the profection and natal angles affect the ranking.</p></FormSection>
            <FormSection title="Birthday location"><div className="flex items-start gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-xs leading-5 text-violet-100"><MapPin className="mt-0.5 shrink-0" aria-hidden size={16}/><span>Use where the customer expects to spend this birthday. It changes the solar-return houses and angles.</span></div><button className="min-h-11 w-full rounded-xl border border-violet-300/40 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/10" type="button" onClick={copyBirthPlace}>Use birth place</button><div className="grid grid-cols-2 gap-3"><Field label="Birthday city"><input className={INPUT} value={form.returnCity} onChange={(event)=>update("returnCity",event.target.value)}/></Field><Field label="Country"><input className={INPUT} value={form.returnCountry} onChange={(event)=>update("returnCountry",event.target.value)}/></Field></div><Field label="Birthday IANA timezone"><input className={INPUT} value={form.returnTimezone} onChange={(event)=>update("returnTimezone",event.target.value)}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Latitude"><input className={INPUT} inputMode="decimal" value={form.returnLatitude} onChange={(event)=>update("returnLatitude",event.target.value)}/></Field><Field label="Longitude"><input className={INPUT} inputMode="decimal" value={form.returnLongitude} onChange={(event)=>update("returnLongitude",event.target.value)}/></Field></div></FormSection>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-stone-950/30 p-3 text-sm leading-6 text-bone"><input className="mt-1" type="checkbox" checked={form.detailsConfirmed} onChange={(event)=>update("detailsConfirmed",event.target.checked)}/><span>I confirmed the purchased SKU, exact birth details, forecast year, and birthday location against the Etsy order.</span></label>
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-leather-300 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canCreate} type="button" onClick={createOrder}>{pendingAction === "create" ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden size={18}/> : <FileClock aria-hidden size={18}/>}Calculate purchased product</button>
          </div>
        </div>
        <div className="shell-panel p-5"><p className="shell-kicker">Local queue</p><div className="mt-4 space-y-2">{reports.length ? reports.map((record)=><button key={record.reportId} type="button" onClick={()=>{setSelectedId(record.reportId);setCompletedQa(new Set());setError(null);setMessage(null)}} className={`min-h-11 w-full rounded-xl border p-3 text-left transition-colors ${selected?.reportId===record.reportId?"border-leather-300 bg-leather-300/10":"border-border/70 bg-stone-950/30 hover:border-bone-muted/50"}`}><span className="block text-sm font-semibold text-bone">{record.artifact.displayName}</span><span className="mt-1 block text-xs text-bone-muted">{record.order.productLabel} · {STAGE_LABELS[record.stage]}</span></button>) : <p className="text-sm leading-6 text-bone-muted">No Year Ahead orders are held in this local process.</p>}</div></div>
      </aside>
      <main className="min-w-0 space-y-6">
        {message ? <p aria-live="polite" className="rounded-2xl border border-moss-500/30 bg-moss-500/10 p-4 text-sm text-moss-100">{message}</p> : null}
        {error ? <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/25 p-4 text-sm text-red-100">{error}</p> : null}
        {selected ? <>
          <section className="shell-panel p-5 md:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="shell-kicker">Selected fulfillment unit</p><h2 className="mt-2 font-display text-3xl text-bone">{selected.artifact.displayName} · {selected.artifact.targetBirthdayYear}</h2><p className="mt-2 text-sm text-bone-muted">{selected.order.sku} · {selected.order.source.receiptId}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${STAGE_STYLES[selected.stage]}`}>{STAGE_LABELS[selected.stage]}</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label="Profection" value={`House ${selected.artifact.calculation.profection.house} · ${selected.artifact.calculation.profection.sign}`}/><Stat label="Lord of the Year" value={selected.artifact.calculation.profection.lord}/><Stat label="Birthday location" value={`${selected.artifact.input.returnPlace.city}, ${selected.artifact.input.returnPlace.country}`}/></div>
            {canSynthesize ? <div className="mt-6 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4"><label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-violet-50"><input className="mt-1" type="checkbox" checked={externalAiConsent} onChange={(event)=>setExternalAiConsent(event.target.checked)}/><span><strong className="block">AI-assisted interpretation consent</strong>Calculated chart facts—not the Etsy payload or support email—will be sent to the configured Anthropic model. The result remains blocked for human review.</span></label><button className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-300 px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-violet-200 disabled:opacity-45" disabled={busy||!externalAiConsent} type="button" onClick={()=>runAction("synthesize")}>{pendingAction==="synthesize"?<Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden size={17}/>:<Sparkles aria-hidden size={17}/>}Generate full forecast</button></div> : null}
            {canReview ? <div className="mt-6 rounded-2xl border border-border/80 bg-stone-950/25 p-4"><p className="text-sm font-semibold text-bone">Human QA</p><div className="mt-3 grid gap-2 md:grid-cols-2">{YEAR_AHEAD_QA_ITEM_IDS.map((item)=><label key={item} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3 text-sm leading-5 text-bone"><input className="mt-1" type="checkbox" checked={completedQa.has(item)} onChange={()=>toggleQa(item)}/><span>{YEAR_AHEAD_QA_LABELS[item]}</span></label>)}</div><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]"><Field label="Revision note"><textarea className={`${INPUT} min-h-24 py-3`} value={reviewNote} onChange={(event)=>setReviewNote(event.target.value)}/></Field><button className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-full border border-red-400/35 px-5 text-sm font-semibold text-red-100 hover:bg-red-950/30 disabled:opacity-45" disabled={busy||!reviewNote.trim()} type="button" onClick={()=>runAction("reject")}><XCircle aria-hidden size={17}/>Reject</button><button className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-full bg-moss-400 px-5 text-sm font-semibold text-stone-950 hover:bg-moss-300 disabled:opacity-45" disabled={busy||completedQa.size!==YEAR_AHEAD_QA_ITEM_IDS.length} type="button" onClick={()=>runAction("approve")}><CheckCircle2 aria-hidden size={17}/>Approve QA</button></div></div> : null}
            {selected.stage === "approved" ? <div className="mt-6">{selected.order.productKey === "year_ahead_report" ? <section className="rounded-2xl border border-border/80 bg-stone-950/25 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-bone-muted">Interpretive report</p><div className="mt-3 flex flex-wrap gap-3">{(["letter","a4"] as const).map((size)=><button key={size} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-leather-300 px-5 text-sm font-semibold text-stone-950 hover:bg-leather-200 disabled:opacity-45" disabled={busy} type="button" onClick={()=>exportFile("report",size)}><Download aria-hidden size={17}/>{exportedKeys.has(`report:${size}`)?"Re-export":"Export"} {size==="letter"?"US Letter":"A4"}</button>)}</div></section> : <section className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-violet-200">Standalone wall print</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><label><span className="sr-only">Map print size</span><select className={INPUT} value={mapSize} onChange={(event)=>setMapSize(event.target.value as CelestialYearMapPrintSize)}>{CELESTIAL_YEAR_MAP_PRINT_SIZES.map((size)=><option key={size} value={size}>{CELESTIAL_YEAR_MAP_DIMENSIONS[size].label}</option>)}</select></label><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-300 px-5 text-sm font-semibold text-stone-950 hover:bg-violet-200 disabled:opacity-45" disabled={busy} type="button" onClick={()=>exportFile("year_map",mapSize)}><Orbit aria-hidden size={17}/>{exportedKeys.has(`year_map:${mapSize}`)?"Re-export":"Export"} map</button></div></section>}</div> : null}
            {ready ? <p className="mt-5 rounded-2xl border border-moss-500/30 bg-moss-500/10 p-4 text-sm leading-6 text-moss-100">Every file promised by this SKU has been exported and checksummed. The package is ready to attach to the Etsy order; this admin does not contact Etsy or mark delivery.</p> : null}
          </section>
          <section className="overflow-hidden rounded-[1.75rem] border border-[#b99667] bg-[#171021] shadow-2xl"><header className="border-b border-[#7f6993] px-6 py-7 text-[#fff8e9] md:px-10"><p className="text-xs font-extrabold uppercase tracking-[.24em] text-[#efbf80]">Celestial year preview</p><h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{selected.artifact.displayName} · {selected.artifact.calculation.profection.theme}</h2><p className="mt-2 text-sm text-[#d7c9df]">{shortDate(selected.artifact.calculation.forecastStart)} — {shortDate(selected.artifact.calculation.forecastEnd)}</p></header><div className="grid gap-7 p-6 md:p-10 lg:grid-cols-[minmax(20rem,1fr)_minmax(20rem,.8fr)] lg:items-center"><div className="mx-auto aspect-square w-full max-w-[40rem] [&_.outer]:fill-none [&_.outer]:stroke-[#d2aa72] [&_.inner]:fill-none [&_.inner]:stroke-[#80669b] [&_.inner]:[stroke-dasharray:1.5_1.5] [&_.quarter]:stroke-[#8f779f] [&_.quarter]:stroke-[.25] [&_.quarter-label]:fill-[#efbf80] [&_.quarter-label]:text-[3px] [&_.quarter-label]:font-bold [&_.quarter-label]:[text-anchor:middle] [&_.point]:stroke-[#fff5df] [&_.point]:stroke-[.45] [&_.p1]:fill-[#bd6d3f] [&_.p2]:fill-[#8e71bd] [&_.p3]:fill-[#4e87a8] [&_.rank]:fill-white [&_.rank]:text-[2.5px] [&_.rank]:font-bold [&_.rank]:[text-anchor:middle] [&_.core]:fill-[#2f2144] [&_.core]:stroke-[#d2aa72] [&_.sun]:fill-[#efbf80] [&_.sun]:text-[8px] [&_.sun]:[text-anchor:middle] [&_.theme]:fill-[#fff8e9] [&_.theme]:text-[4px] [&_.theme]:[text-anchor:middle] [&_.lord]:fill-[#d8c9df] [&_.lord]:text-[2px] [&_.lord]:[text-anchor:middle]" dangerouslySetInnerHTML={{__html:renderCelestialYearMapSvg(selected.artifact)}}/><ol className="space-y-3">{selected.artifact.calculation.activationWindows.map((window)=><li key={window.id} className="grid grid-cols-[2.5rem_1fr] gap-3 border-l-4 border-[#bd6d3f] bg-[#f2e8d8] p-4 text-[#21182c] [&:nth-child(2)]:border-[#8e71bd] [&:nth-child(3)]:border-[#4e87a8]"><span className="text-xs font-extrabold text-[#9d5a38]">0{window.rank}</span><div><strong className="font-display text-lg">{window.title}</strong><p className="mt-1 text-sm font-semibold text-[#554b59]">{shortDate(window.startDate)} — {shortDate(window.endDate)}</p><p className="mt-1 text-xs text-[#554b59]">Closest {shortDate(window.peakDate)} · House {window.natalHouse} · {window.lifeArea}</p></div></li>)}</ol></div></section>
          {selected.artifact.narrative && selected.order.productKey === "year_ahead_report" ? <section className="overflow-hidden rounded-[1.75rem] border border-[#b8aa99] bg-[#f3ede1] text-[#191522] shadow-2xl"><header className="border-l-8 border-[#a6603c] bg-[#302345] px-6 py-7 text-[#fff9ef] md:px-10"><p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#efc68e]">Interpretive report preview</p><h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{selected.artifact.narrative.annualTheme.title}</h2><p className="mt-3 max-w-4xl text-base font-semibold leading-7 text-[#eadff2]">{selected.artifact.narrative.annualTheme.summary}</p></header><div className="divide-y divide-[#c7b49d]">{selected.artifact.narrative.activationWindows.map((block,index)=><article className="px-6 py-8 md:px-10" key={block.windowId}><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9d5a38]">Top window 0{index+1}</p><h3 className="mt-3 font-display text-3xl font-bold text-[#302345]">{block.title}</h3><div className="mt-5 max-w-[76ch] space-y-4 text-[15px] leading-7">{block.paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div></article>)}{selected.artifact.narrative.lifeAreas.map((block)=><article className="px-6 py-8 md:px-10" key={block.id}><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#684d8d]">{block.id.replaceAll("_"," ")}</p><h3 className="mt-3 font-display text-3xl font-bold text-[#302345]">{block.title}</h3><p className="mt-3 max-w-[76ch] text-base font-semibold leading-7">{block.summary}</p></article>)}</div></section> : null}
        </> : <div className="shell-panel flex min-h-[30rem] items-center justify-center p-8 text-center text-bone-muted">Calculate a local Year Ahead order to see its timing map here.</div>}
      </main>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium text-bone"><span className="mb-2 block">{label}</span>{children}</label>; }
function FormSection({ title, children }: { title: string; children: ReactNode }) { return <div className="space-y-3 border-t border-border/70 pt-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-bone-muted">{title}</p>{children}</div>; }
function ProductChoice({ active, detail, label, name, onChange, violet = false }: { active: boolean; detail: string; label: string; name: string; onChange: () => void; violet?: boolean }) { return <label className={`block cursor-pointer rounded-xl border p-3 transition-colors ${active ? violet ? "border-violet-300 bg-violet-500/10" : "border-leather-300 bg-leather-300/10" : "border-border/70 bg-stone-950/30"}`}><span className="flex items-start gap-3"><input checked={active} className="mt-1" name={name} onChange={onChange} type="radio"/><span><strong className="block text-sm text-bone">{label}</strong><span className="mt-1 block text-xs leading-5 text-bone-muted">{detail}</span></span></span></label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/70 bg-stone-950/30 p-3"><span className="block text-xs font-bold uppercase tracking-[.14em] text-bone-muted">{label}</span><strong className="mt-2 block text-sm text-bone">{value}</strong></div>; }
