import {
  FIELD_NOTES_NEWSLETTER_BODY,
  FIELD_NOTES_NEWSLETTER_HEADLINE,
} from "@/lib/marketing/field-notes-copy";
import {
  MARKETING_OG_IMAGE_SIZE,
  renderMarketingOgImage,
} from "@/lib/marketing/marketing-og-image";
import { FIELD_NOTES_MARKETING_TITLE } from "@/lib/marketing/public-page-metadata";

export const alt = FIELD_NOTES_MARKETING_TITLE;
export const size = MARKETING_OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  // TODO(stella): add a Field Notes kicker (e.g. "NEWSLETTER") once copy is approved — keeps OG vertical rhythm aligned with / and /pricing.
  return renderMarketingOgImage({
    title: FIELD_NOTES_NEWSLETTER_HEADLINE,
    subtitle: FIELD_NOTES_NEWSLETTER_BODY,
  });
}
