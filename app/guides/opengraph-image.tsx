import {
  GUIDES_INDEX_META_DESCRIPTION,
  GUIDES_INDEX_SEO_TITLE,
} from "@/lib/marketing/guides";
import {
  MARKETING_OG_IMAGE_SIZE,
  renderMarketingOgImage,
} from "@/lib/marketing/marketing-og-image";

export const alt = GUIDES_INDEX_SEO_TITLE;
export const size = MARKETING_OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderMarketingOgImage({
    title: "Guides",
    subtitle: GUIDES_INDEX_META_DESCRIPTION,
  });
}
