import {
  FIELD_NOTES_NEWSLETTER_BODY,
  FIELD_NOTES_NEWSLETTER_HEADLINE,
} from "@/lib/marketing/field-notes-copy";
import type { FieldNotesSignupSource } from "@/lib/marketing/field-notes-source";

import { FieldNotesKitSubscribeForm } from "./FieldNotesKitSubscribeForm";

interface Props {
  source: FieldNotesSignupSource;
  variant?: "almanac" | "shell";
}

export function FieldNotesHeroSignup({ source, variant = "almanac" }: Props) {
  return (
    <div className="mt-10 max-w-md border-t border-almanac-line/80 pt-8">
      <h2 className="font-almanac-display text-xl tracking-[0.06em] text-almanac-ink">
        {FIELD_NOTES_NEWSLETTER_HEADLINE}
      </h2>
      <p className="mt-3 text-sm leading-6 text-almanac-ink-dim">{FIELD_NOTES_NEWSLETTER_BODY}</p>
      <div className="mt-4">
        <FieldNotesKitSubscribeForm layout="stacked" variant={variant} source={source} />
      </div>
    </div>
  );
}
