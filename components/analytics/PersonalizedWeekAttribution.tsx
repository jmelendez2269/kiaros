"use client";

import { useEffect } from "react";

import { captureBrowserCheckoutFunnelContext } from "@/lib/analytics/checkout-context";

export function PersonalizedWeekAttribution() {
  useEffect(() => {
    const context = captureBrowserCheckoutFunnelContext();
    if (!context) return;

    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: `preview_viewed:${context.session_id}`,
        event_name: "preview_viewed",
        ...context,
        product_tier: "personalized_week",
        metadata: { entry_surface: "personalized_week_reading" },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
