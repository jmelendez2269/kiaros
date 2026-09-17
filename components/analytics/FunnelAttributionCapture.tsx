"use client";

import { useEffect } from "react";

import { captureBrowserCheckoutFunnelContext } from "@/lib/analytics/checkout-context";

interface Props {
  canceledCheckoutAttemptId?: string;
}

export function FunnelAttributionCapture({ canceledCheckoutAttemptId }: Props) {
  useEffect(() => {
    captureBrowserCheckoutFunnelContext();
    if (!canceledCheckoutAttemptId) return;

    void fetch("/api/commerce/checkout/canceled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: canceledCheckoutAttemptId }),
    }).catch(() => undefined);
  }, [canceledCheckoutAttemptId]);

  return null;
}
