"use client";

import { FormEvent, useState } from "react";

import { captureBrowserCheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import type { CommerceTierKey } from "@/lib/commerce/config";
import { GIFT_MESSAGE_MAX, GIFT_NAME_MAX } from "@/lib/commerce/gift";

export interface GiftTierOption {
  key: CommerceTierKey;
  name: string;
  price: string;
  summary: string;
}

interface Props {
  tiers: GiftTierOption[];
  defaultTier?: CommerceTierKey;
}

type CheckoutResponse = { success: true; data: { url: string } } | { success: false; error: string };

const inputClass =
  "w-full rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none ring-0 placeholder:text-bone-muted/45 focus:border-leather-300/60";

export function GiftCheckoutForm({ tiers, defaultTier = "planner" }: Props) {
  const [tierKey, setTierKey] = useState<CommerceTierKey>(defaultTier);
  const [purchaserName, setPurchaserName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/gift/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierKey,
          purchaserName,
          recipientName,
          giftMessage,
          funnelContext: captureBrowserCheckoutFunnelContext(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;

      if (!response.ok || !payload?.success) {
        setError(payload && !payload.success ? payload.error : "Checkout couldn't start yet. Please try again.");
        setIsPending(false);
        return;
      }

      window.location.assign(payload.data.url);
    } catch {
      setError("Checkout couldn't start yet. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-medium text-bone">Which year would you like to give?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiers.map((tier) => {
            const selected = tier.key === tierKey;
            return (
              <label
                key={tier.key}
                className={[
                  "flex cursor-pointer flex-col gap-1 rounded-[1.1rem] border px-5 py-4 transition-colors",
                  selected
                    ? "border-leather-300/70 bg-leather-300/12"
                    : "border-border/80 bg-stone-950/40 hover:border-leather-300/40",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="tier"
                  value={tier.key}
                  checked={selected}
                  onChange={() => setTierKey(tier.key)}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-bone">{tier.name}</span>
                  <span className="text-lg font-semibold text-bone">{tier.price}</span>
                </span>
                <span className="text-sm leading-6 text-bone-muted">{tier.summary}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Who is it for? (optional)</span>
          <input
            className={inputClass}
            placeholder="Their first name"
            maxLength={GIFT_NAME_MAX}
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Who is it from? (optional)</span>
          <input
            className={inputClass}
            placeholder="Your name, as they know you"
            maxLength={GIFT_NAME_MAX}
            value={purchaserName}
            onChange={(event) => setPurchaserName(event.target.value)}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm text-bone-muted">
        <span className="font-medium text-bone">A note for them (optional)</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          placeholder="They'll see this when they open the gift."
          maxLength={GIFT_MESSAGE_MAX}
          value={giftMessage}
          onChange={(event) => setGiftMessage(event.target.value)}
        />
        <span className="text-xs text-bone-muted/70">
          {giftMessage.length}/{GIFT_MESSAGE_MAX}
        </span>
      </label>

      <div className="grid gap-3">
        <button
          className="inline-flex w-fit items-center rounded-full bg-leather-300 px-6 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Opening checkout..." : "Continue to payment"}
        </button>
        <p className="text-xs leading-5 text-bone-muted">
          One payment. No account needed. You&apos;ll get the gift code right after checkout and by email.
        </p>
        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}
      </div>
    </form>
  );
}
