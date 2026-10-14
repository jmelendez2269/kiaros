import {
  FIELD_NOTES_HERO_FRAMING,
  FIELD_NOTES_NEWSLETTER_BODY,
} from "@/lib/marketing/field-notes-copy";
import type { FieldNotesSignupSource } from "@/lib/marketing/field-notes-source";

import { FieldNotesKitSubscribeForm } from "./FieldNotesKitSubscribeForm";

interface Props {
  source: FieldNotesSignupSource;
  variant?: "almanac" | "shell";
}

export function FieldNotesHeroSignup({ source, variant = "almanac" }: Props) {
  return (
    <div className="mt-6 max-w-md">
      <p className="text-sm leading-6 text-almanac-ink-dim">{FIELD_NOTES_HERO_FRAMING}</p>
      <p className="mt-3 text-sm leading-6 text-almanac-ink-soft">{FIELD_NOTES_NEWSLETTER_BODY}</p>
      <div className="mt-4">
        <FieldNotesKitSubscribeForm layout="stacked" variant={variant} source={source} />
      </div>
    </div>
  );
}
