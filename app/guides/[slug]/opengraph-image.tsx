import { getGuideBySlug } from "@/lib/marketing/guides";
import {
  MARKETING_OG_IMAGE_SIZE,
  renderMarketingOgImage,
} from "@/lib/marketing/marketing-og-image";

export const size = MARKETING_OG_IMAGE_SIZE;
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    throw new Error(`Unknown guide slug for OG image: ${slug}`);
  }

  return renderMarketingOgImage({
    title: guide.seoTitle,
    subtitle: guide.metaDescription,
    kicker: "GUIDE",
  });
}
