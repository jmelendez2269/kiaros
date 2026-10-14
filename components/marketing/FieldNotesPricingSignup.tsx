import {
  FIELD_NOTES_NEWSLETTER_BODY,
  FIELD_NOTES_PRICING_BELOW_TIERS_FRAMING,
} from "@/lib/marketing/field-notes-copy";

import { FieldNotesKitSubscribeForm } from "./FieldNotesKitSubscribeForm";

export function FieldNotesPricingSignup() {
  return (
    <section
      aria-labelledby="field-notes-pricing-heading"
      className="mt-5 shell-panel p-6 md:p-7"
    >
      <p id="field-notes-pricing-heading" className="text-sm font-medium text-bone">
        {FIELD_NOTES_PRICING_BELOW_TIERS_FRAMING}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
        {FIELD_NOTES_NEWSLETTER_BODY}
      </p>
      <div className="mt-5 max-w-md">
        <FieldNotesKitSubscribeForm layout="stacked" variant="shell" source="pricing" />
      </div>
    </section>
  );
}
