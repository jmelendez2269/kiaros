import type { Metadata } from "next";

import {
  GUIDES_INDEX_META_DESCRIPTION,
  GUIDES_INDEX_PATH,
  GUIDES_INDEX_SEO_TITLE,
  type GuideDocument,
  guideCanonicalPath,
} from "@/lib/marketing/guides";
import { BRAND } from "@/lib/brand";
import { marketingCanonicalUrl } from "@/lib/marketing/public-site";

const siteName = BRAND.product;

function openGraphAndTwitter(
  title: string,
  description: string,
  path: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  const url = marketingCanonicalUrl(path);
  return {
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "article",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function guideMarketingMetadata(guide: GuideDocument): Metadata {
  const path = guideCanonicalPath(guide.slug);
  return {
    title: guide.seoTitle,
    description: guide.metaDescription,
    ...openGraphAndTwitter(guide.seoTitle, guide.metaDescription, path),
    alternates: {
      canonical: marketingCanonicalUrl(path),
    },
  };
}

export function guidesIndexMarketingMetadata(): Metadata {
  return {
    title: GUIDES_INDEX_SEO_TITLE,
    description: GUIDES_INDEX_META_DESCRIPTION,
    ...openGraphAndTwitter(
      GUIDES_INDEX_SEO_TITLE,
      GUIDES_INDEX_META_DESCRIPTION,
      GUIDES_INDEX_PATH,
    ),
    alternates: {
      canonical: marketingCanonicalUrl(GUIDES_INDEX_PATH),
    },
  };
}
