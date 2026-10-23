"use client";

import { useEffect, useRef } from "react";
import { defaultOnboardingTraditionPayload } from "@/lib/onboarding/ia-onboarding-routes";

/** When IA onboarding skips the tradition screen, persist the default if still unset. */
export function EnsureTraditionDefault() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { profile?: { tradition?: string | null } };
        const tradition = data.profile?.tradition ?? null;
        if (tradition) return;

        const patchRes = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultOnboardingTraditionPayload()),
        });
        if (!patchRes.ok) {
          console.warn("[EnsureTraditionDefault] Failed to persist default tradition:", patchRes.status);
        }
      } catch {
        // Non-blocking; Settings still allows setting tradition later.
      }
    })();
  }, []);

  return null;
}
