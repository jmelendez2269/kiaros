"use client";

import { ChevronDown, ChevronUp, ClipboardList, Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import type { ArtifactOrderView } from "@/lib/artifacts/fulfillment/contract";
import type { ArtifactPersistenceMode } from "@/lib/artifacts/fulfillment/repository";

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-border bg-stone-950/55 px-3 py-2 text-sm text-bone outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/20";

interface IntakeFormState {
  shopId: string;
  receiptId: string;
  transactionId: string;
  unitIndex: string;
  listingId: string;
  purchasedAt: string;
  supportEmail: string;
  displayName: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthCity: string;
  birthCountry: string;
  latitude: string;
  longitude: string;
  timezone: string;
  detailsConfirmed: boolean;
  aiDisclosureConfirmed: boolean;
}

function initialState(): IntakeFormState {
  return {
    shopId: "kairos",
    receiptId: "",
    transactionId: "",
    unitIndex: "1",
    listingId: "",
    purchasedAt: new Date().toISOString().slice(0, 16),
    supportEmail: "",
    displayName: "",
    birthDate: "",
    birthTime: "",
    birthTimeUnknown: false,
    birthCity: "",
    birthCountry: "",
    latitude: "",
    longitude: "",
    timezone: "",
    detailsConfirmed: false,
    aiDisclosureConfirmed: false,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-bone">
      <span>{label}</span>
      {children}
      {hint ? <span className="block text-xs font-normal leading-5 text-bone-muted">{hint}</span> : null}
    </label>
  );
}

export function ArtifactOrderIntakeForm({
  enabled,
  persistenceMode,
  onCreated,
}: {
  enabled: boolean;
  persistenceMode: ArtifactPersistenceMode;
  onCreated: (orders: readonly ArtifactOrderView[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IntakeFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <section className="rounded-[1.25rem] border border-violet-300/20 bg-violet-500/5 p-5">
        <p className="text-sm font-semibold text-bone">Manual Etsy intake is installed but switched off.</p>
        <p className="mt-2 text-sm leading-6 text-bone-muted">
          The founder workspace, persistence, and real-intake gates must all be enabled before an order can be entered.
        </p>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "manual",
          shopId: form.shopId,
          receiptId: form.receiptId,
          transactionId: form.transactionId,
          unitIndex: Number(form.unitIndex),
          listingId: form.listingId.trim() || null,
          purchasedAt: new Date(form.purchasedAt).toISOString(),
          supportEmail: form.supportEmail,
          displayName: form.displayName,
          birthDate: form.birthDate,
          birthTime: form.birthTimeUnknown ? null : form.birthTime || null,
          birthTimeUnknown: form.birthTimeUnknown,
          birthCity: form.birthCity,
          birthCountry: form.birthCountry,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          timezone: form.timezone,
          detailsConfirmed: form.detailsConfirmed,
          aiDisclosureConfirmed: form.aiDisclosureConfirmed,
        }),
      });
      const payload = (await response.json()) as
        | { success: true; orders: readonly ArtifactOrderView[] }
        | { success: false; error: string };
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Order intake failed." : payload.error);
        return;
      }
      onCreated(payload.orders);
      setForm(initialState());
      setOpen(false);
    } catch {
      setError("The order could not be prepared. No order was saved; check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-violet-300/25 bg-violet-500/5">
      <button
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-bone">
            <ClipboardList aria-hidden size={17} /> Enter an Etsy order
          </span>
          <span className="mt-1 block text-xs leading-5 text-bone-muted">
            {persistenceMode === "memory"
              ? "Local rehearsal · temporary memory"
              : "Founder-only · private persisted fulfillment"}
          </span>
        </span>
        {open ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
      </button>

      {open ? (
        <form className="space-y-6 border-t border-border/70 p-5" onSubmit={submit}>
          <div>
            <h2 className="text-lg font-semibold text-bone">Order identity</h2>
            <p className="mt-1 text-sm leading-6 text-bone-muted">
              Copy these identifiers from the Etsy receipt. Each personalized unit needs its own transaction and unit number.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Shop ID or stable shop name">
              <input className={INPUT_CLASS} required value={form.shopId} onChange={(event) => setForm({ ...form, shopId: event.target.value })} />
            </Field>
            <Field label="Etsy receipt / order number">
              <input className={INPUT_CLASS} required value={form.receiptId} onChange={(event) => setForm({ ...form, receiptId: event.target.value })} />
            </Field>
            <Field label="Etsy transaction ID">
              <input className={INPUT_CLASS} required value={form.transactionId} onChange={(event) => setForm({ ...form, transactionId: event.target.value })} />
            </Field>
            <Field label="Personalized unit number">
              <input className={INPUT_CLASS} min="1" required type="number" value={form.unitIndex} onChange={(event) => setForm({ ...form, unitIndex: event.target.value })} />
            </Field>
            <Field label="Listing ID" hint="Optional if Etsy does not show it clearly.">
              <input className={INPUT_CLASS} value={form.listingId} onChange={(event) => setForm({ ...form, listingId: event.target.value })} />
            </Field>
            <Field label="Purchased at">
              <input className={INPUT_CLASS} required type="datetime-local" value={form.purchasedAt} onChange={(event) => setForm({ ...form, purchasedAt: event.target.value })} />
            </Field>
            <Field label="Buyer contact email">
              <input className={INPUT_CLASS} required type="email" value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} />
            </Field>
            <Field label="Name printed on report">
              <input className={INPUT_CLASS} maxLength={80} required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </Field>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-bone">Birth information</h2>
            <p className="mt-1 text-sm leading-6 text-bone-muted">
              Coordinates and the IANA timezone are confirmed separately so similarly named cities cannot silently produce the wrong chart.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Birth date">
              <input className={INPUT_CLASS} required type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
            </Field>
            <Field label="Birth time">
              <input className={INPUT_CLASS} disabled={form.birthTimeUnknown} required={!form.birthTimeUnknown} type="time" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} />
            </Field>
            <Field label="Birth city">
              <input className={INPUT_CLASS} required value={form.birthCity} onChange={(event) => setForm({ ...form, birthCity: event.target.value })} />
            </Field>
            <Field label="Birth country">
              <input className={INPUT_CLASS} required value={form.birthCountry} onChange={(event) => setForm({ ...form, birthCountry: event.target.value })} />
            </Field>
            <Field label="Latitude" hint="Decimal degrees, e.g. 35.7796">
              <input className={INPUT_CLASS} max="90" min="-90" required step="any" type="number" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
            </Field>
            <Field label="Longitude" hint="West is negative, e.g. -78.6382">
              <input className={INPUT_CLASS} max="180" min="-180" required step="any" type="number" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
            </Field>
            <Field label="Birthplace IANA timezone" hint="Example: America/New_York">
              <input className={INPUT_CLASS} placeholder="America/New_York" required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
            </Field>
            <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-border bg-stone-950/35 px-4 py-3 text-sm text-bone">
              <input
                checked={form.birthTimeUnknown}
                className="h-4 w-4 accent-violet-400"
                onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })}
                type="checkbox"
              />
              Birth time is unknown
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-bone">
              <input checked={form.detailsConfirmed} className="mt-1 h-4 w-4 accent-violet-400" onChange={(event) => setForm({ ...form, detailsConfirmed: event.target.checked })} required type="checkbox" />
              I copied the personalization from the Etsy order and confirmed the date, time or unknown-time status, birthplace, coordinates, and timezone.
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-bone">
              <input checked={form.aiDisclosureConfirmed} className="mt-1 h-4 w-4 accent-violet-400" onChange={(event) => setForm({ ...form, aiDisclosureConfirmed: event.target.checked })} required type="checkbox" />
              I confirmed the listing discloses AI-assisted writing. Only derived chart facts—not the buyer's name, email, birth date, or birthplace—are sent to the narrative model.
            </label>
          </div>

          {error ? <p className="rounded-xl border border-red-400/25 bg-red-950/30 p-3 text-sm text-red-100">{error}</p> : null}

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <Loader2 aria-hidden className="animate-spin" size={17} /> : <ClipboardList aria-hidden size={17} />}
            {submitting ? "Calculating chart and writing report…" : "Prepare personalized order"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
