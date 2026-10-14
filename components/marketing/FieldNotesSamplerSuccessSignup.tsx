import {
  FIELD_NOTES_NEWSLETTER_BODY,
  FIELD_NOTES_NEWSLETTER_HEADLINE,
} from "@/lib/marketing/field-notes-copy";

import { FieldNotesKitSubscribeForm } from "./FieldNotesKitSubscribeForm";

export function FieldNotesSamplerSuccessSignup() {
  return (
    <section
      aria-labelledby="field-notes-sampler-success-heading"
      className="mt-8 border-t border-border/60 pt-8"
    >
      <h2 id="field-notes-sampler-success-heading" className="shell-section-title text-2xl">
        {FIELD_NOTES_NEWSLETTER_HEADLINE}
      </h2>
      <p className="mt-3 text-sm leading-7 text-bone-muted">{FIELD_NOTES_NEWSLETTER_BODY}</p>
      <div className="mt-5 max-w-md">
        <FieldNotesKitSubscribeForm layout="stacked" variant="shell" source="sampler_success" />
      </div>
    </section>
  );
}
