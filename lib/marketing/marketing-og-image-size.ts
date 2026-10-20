export const MARKETING_OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

import { GUIDE_SLUGS, GUIDES_INDEX_PATH } from "@/lib/marketing/guides";

const STATIC_MARKETING_OG_IMAGE_PATHS = {
  "/": "/opengraph-image",
  "/pricing": "/pricing/opengraph-image",
  "/field-notes": "/field-notes/opengraph-image",
  [GUIDES_INDEX_PATH]: "/guides/opengraph-image",
} as const;

const guideOgPaths = Object.fromEntries(
  GUIDE_SLUGS.map((slug) => [`/guides/${slug}`, `/guides/${slug}/opengraph-image`]),
) as Record<`/guides/${typeof GUIDE_SLUGS[number]}`, string>;

export const MARKETING_OG_IMAGE_PATHS = {
  ...STATIC_MARKETING_OG_IMAGE_PATHS,
  ...guideOgPaths,
} as const;

export type MarketingOgCanonicalPath = keyof typeof MARKETING_OG_IMAGE_PATHS;
