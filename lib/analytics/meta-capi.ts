import "server-only";

import crypto from "node:crypto";

import { isMetaCapiEnabled } from "@/lib/feature-flags";

interface MetaPurchaseEventParams {
  /** Stable idempotency key so retries/duplicate webhook deliveries dedupe on Meta's side. */
  eventId: string;
  email: string;
  valueCents: number;
  currency: string;
  eventSourceUrl?: string;
}

function hashForMeta(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Fire-and-forget: never throws. A Meta outage or missing config must not
 * break checkout fulfillment, which is why this swallows every failure.
 */
export async function sendMetaPurchaseEvent(params: MetaPurchaseEventParams): Promise<void> {
  if (!isMetaCapiEnabled()) return;

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn(
      "[meta-capi] KIAROS_META_CAPI is on but META_PIXEL_ID/META_CONVERSIONS_API_TOKEN is missing."
    );
    return;
  }

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: "website",
        event_source_url: params.eventSourceUrl,
        user_data: {
          em: [hashForMeta(params.email)],
        },
        custom_data: {
          currency: params.currency.toLowerCase(),
          value: params.valueCents / 100,
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[meta-capi] Meta rejected the Purchase event:", response.status, body);
    }
  } catch (error) {
    console.error("[meta-capi] Failed to send Purchase event:", error);
  }
}
