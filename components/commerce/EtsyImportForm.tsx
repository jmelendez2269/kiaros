"use client";

import { FormEvent, useState } from "react";

type ImportResult =
  | {
      success: true;
      summary: ImportSummary;
    }
  | {
      success: false;
      error: string;
    };

type ImportSummary = {
  totalRows: number;
  imported: number;
  updated: number;
};

export function EtsyImportForm() {
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/commerce/etsy-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const payload = (await response.json()) as ImportResult;

      if (!response.ok || !payload.success) {
        setError(payload.success ? "Import failed." : payload.error);
        return;
      }

      setSummary(payload.summary);
      setCsvText("");
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="shell-panel space-y-5 p-6 md:p-7" onSubmit={handleSubmit}>
      <div>
        <p className="shell-kicker mb-3">Etsy import</p>
        <h2 className="shell-section-title">Paste the Etsy orders CSV</h2>
        <p className="mt-3 text-sm leading-7 text-bone-muted">
          This accepts the standard Etsy orders export and upserts records into
          <span className="px-1 text-bone">marketplace_orders</span>
          so the activation flow can verify order number plus purchase email.
        </p>
      </div>

      <label className="grid gap-2 text-sm text-bone-muted">
        <span className="font-medium text-bone">CSV export</span>
        <textarea
          className="min-h-64 rounded-[1.15rem] border border-border/80 bg-stone-950/70 px-4 py-3 font-mono text-sm text-bone outline-none placeholder:text-bone-muted/45"
          onChange={(event) => setCsvText(event.target.value)}
          placeholder="Paste the Etsy CSV export here..."
          value={csvText}
        />
      </label>

      <button
        className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Importing..." : "Import Etsy orders"}
      </button>

      {error ? (
        <p className="rounded-[1rem] border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {summary ? (
        <p className="rounded-[1rem] border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-200">
          Imported {summary.imported} new orders and updated {summary.updated} existing orders from{" "}
          {summary.totalRows} CSV rows.
        </p>
      ) : null}
    </form>
  );
}
