import {
  MARKETING_OG_IMAGE_SIZE,
  renderMarketingOgImage,
} from "@/lib/marketing/marketing-og-image";
import {
  PRICING_HERO_TITLE,
  PRICING_MARKETING_DESCRIPTION,
  PRICING_MARKETING_TITLE,
} from "@/lib/marketing/public-page-metadata";

export const alt = PRICING_MARKETING_TITLE;
export const size = MARKETING_OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderMarketingOgImage({
    kicker: "Pricing",
    title: PRICING_HERO_TITLE,
    subtitle: PRICING_MARKETING_DESCRIPTION,
  });
}
