import { BRAND } from "@/lib/brand";
import {
  MARKETING_OG_IMAGE_SIZE,
  renderMarketingOgImage,
} from "@/lib/marketing/marketing-og-image";
import { HOME_MARKETING_DESCRIPTION } from "@/lib/marketing/public-page-metadata";

export const alt = `${BRAND.product} — ${BRAND.productTagline}`;
export const size = MARKETING_OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderMarketingOgImage({
    kicker: "Your life has its own timing",
    title: BRAND.productTagline,
    subtitle: HOME_MARKETING_DESCRIPTION,
  });
}
