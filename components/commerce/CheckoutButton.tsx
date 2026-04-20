"use client";

import { startTransition, useState } from "react";

import { CommerceTierKey } from "@/lib/commerce/config";

interface Props {
  tierKey: CommerceTierKey;
  className?: string;
  label?: string;
}

export function CheckoutButton({ tierKey, className, label = "Buy direct" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleCheckout() {
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/commerce/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tierKey }),
        });

        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          setError(payload.error ?? "Checkout couldn't start yet.");
          setIsPending(false);
          return;
        }

        window.location.assign(payload.url);
      } catch {
        setError("Checkout couldn't start yet.");
        setIsPending(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        className={className}
        disabled={isPending}
        onClick={handleCheckout}
        type="button"
      >
        {isPending ? "Opening checkout..." : label}
      </button>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
