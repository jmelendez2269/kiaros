import { getKitFieldNotesSubscribeActionUrl } from "@/lib/marketing/kit-field-notes";
import {
  fieldNotesUtmForSignupSource,
  type FieldNotesSignupSource,
} from "@/lib/marketing/field-notes-source";

/**
 * Fire-and-forget Kit form POST (same endpoint as FieldNotesKitSubscribeForm).
 * Uses no-cors so onboarding can continue even when the browser hides the response.
 */
export async function subscribeFieldNotesKit(options: {
  email: string;
  source: FieldNotesSignupSource;
}): Promise<void> {
  const email = options.email.trim();
  if (!email) return;

  const params = new URLSearchParams();
  params.set("email_address", email);
  const utm = fieldNotesUtmForSignupSource(options.source);
  for (const [key, value] of Object.entries(utm)) {
    if (value) params.set(`fields[${key}]`, value);
  }

  try {
    await fetch(getKitFieldNotesSubscribeActionUrl(), {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch {
    // Opt-in is best-effort; double opt-in still requires inbox confirmation.
  }
}
