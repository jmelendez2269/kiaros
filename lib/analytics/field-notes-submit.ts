import { captureBrowserCheckoutFunnelContext } from "@/lib/analytics/checkout-context";
import type { FieldNotesSignupSource } from "@/lib/marketing/field-notes-source";

/**
 * Fire-and-forget count of a Field Notes Kit form submit attempt (no email or user id).
 */
export function recordFieldNotesSubmitAttempt(source: FieldNotesSignupSource): void {
  if (typeof window === "undefined") return;

  const context = captureBrowserCheckoutFunnelContext();
  const anonymousId = context?.anonymous_id ?? crypto.randomUUID();
  const eventId = `field_notes_submit:${crypto.randomUUID()}`;

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      event_name: "field_notes_submit",
      anonymous_id: anonymousId,
      source,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
