"use client";

import { FormEvent, useState } from "react";
import { CURRENT_PLANNER_YEAR } from "@/lib/commerce/config";

type ManualOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

export function ManualOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"planner" | "planner_oracle">("planner");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/commerce/manual-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          email: email.trim(),
          name: name.trim() || null,
          tier,
          purchasedAt: purchasedAt || null,
        }),
      });

      const payload = (await response.json()) as ManualOrderResult;

      if (!response.ok || !payload.success) {
        setError(payload.success ? "Import failed." : payload.error);
        return;
      }

      setSuccess(`Order ${payload.orderId} added. The customer can now activate at /activate.`);
      setOrderNumber("");
      setEmail("");
      setName("");
      setTier("planner");
      setPurchasedAt("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="shell-panel space-y-5 p-6 md:p-7" onSubmit={handleSubmit}>
      <div>
        <p className="shell-kicker mb-3">Manual order entry</p>
        <h2 className="shell-section-title">Add a single Etsy order</h2>
        <p className="mt-3 text-sm leading-7 text-bone-muted">
          Use this for individual orders instead of a full CSV export.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Etsy order number <span className="text-red-400">*</span></span>
          <input
            className="rounded-[1.15rem] border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
            placeholder="e.g. 1234567890"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Purchaser email <span className="text-red-400">*</span></span>
          <input
            className="rounded-[1.15rem] border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
            placeholder="buyer@example.com"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Purchaser name <span className="text-bone-muted/60">(optional)</span></span>
          <input
            className="rounded-[1.15rem] border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
            placeholder="Their name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Purchase date <span className="text-bone-muted/60">(optional)</span></span>
          <input
            className="rounded-[1.15rem] border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-bone">Product tier <span className="text-red-400">*</span></legend>
        <div className="flex gap-3">
          <label className={`flex cursor-pointer items-center gap-2 rounded-[1rem] border px-4 py-3 text-sm transition-colors ${tier === "planner" ? "border-leather-400/50 bg-leather-500/20 text-bone" : "border-border/80 bg-stone-950/70 text-bone-muted"}`}>
            <input
              className="sr-only"
              type="radio"
              name="tier"
              value="planner"
              checked={tier === "planner"}
              onChange={() => setTier("planner")}
            />
            Planner
          </label>
          <label className={`flex cursor-pointer items-center gap-2 rounded-[1rem] border px-4 py-3 text-sm transition-colors ${tier === "planner_oracle" ? "border-leather-400/50 bg-leather-500/20 text-bone" : "border-border/80 bg-stone-950/70 text-bone-muted"}`}>
            <input
              className="sr-only"
              type="radio"
              name="tier"
              value="planner_oracle"
              checked={tier === "planner_oracle"}
              onChange={() => setTier("planner_oracle")}
            />
            Planner + Oracle
          </label>
        </div>
      </fieldset>

      <button
        className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Adding..." : "Add order"}
      </button>

      {error ? (
        <p className="rounded-[1rem] border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-[1rem] border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-200">
          {success}
        </p>
      ) : null}
    </form>
  );
}
