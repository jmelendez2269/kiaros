/** Kit (ConvertKit) form id for Field Notes — change this one line when the Kairos form is ready. */
export const KIT_FIELD_NOTES_FORM_ID =
  process.env.NEXT_PUBLIC_KIT_FIELD_NOTES_FORM_ID ?? "9985738";

export function getKitFieldNotesSubscribeActionUrl(): string {
  return `https://app.kit.com/forms/${KIT_FIELD_NOTES_FORM_ID}/subscriptions`;
}
