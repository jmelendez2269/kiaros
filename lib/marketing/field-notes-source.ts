import {
  mergeFieldNotesUtm,
  type FieldNotesUtmFieldKey,
} from "./field-notes-utm";

export const FIELD_NOTES_SIGNUP_SOURCES = [
  "home_hero",
  "home_footer",
  "pricing",
  "sampler_success",
  "onboarding",
] as const;

export type FieldNotesSignupSource = (typeof FIELD_NOTES_SIGNUP_SOURCES)[number];

/** Surface tag sent to Kit as `fields[utm_content]` (existing custom field on the form). */
export function fieldNotesUtmForSignupSource(
  source: FieldNotesSignupSource,
): Partial<Record<FieldNotesUtmFieldKey, string>> {
  return { utm_content: source };
}

export function fieldNotesInitialUtm(
  source?: FieldNotesSignupSource,
  initialUtm?: Partial<Record<FieldNotesUtmFieldKey, string>>,
): Partial<Record<FieldNotesUtmFieldKey, string>> {
  if (!source) return initialUtm ?? {};
  return mergeFieldNotesUtm(fieldNotesUtmForSignupSource(source), initialUtm);
}
