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
        if (data.profile?.tradition) return;

        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultOnboardingTraditionPayload()),
        });
      } catch {
        // Non-blocking; Settings still allows setting tradition later.
      }
    })();
  }, []);

  return null;
}
