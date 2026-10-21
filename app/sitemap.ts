import type { MetadataRoute } from "next";

import {
  getAllGuides,
  GUIDES_INDEX_PATH,
  guideCanonicalPath,
} from "@/lib/marketing/guides";
import { marketingCanonicalUrl } from "@/lib/marketing/public-site";

const STATIC_MARKETING_PATHS = ["/", "/pricing", "/field-notes", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_MARKETING_PATHS.map((path) => ({
    url: marketingCanonicalUrl(path),
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const guidesIndex: MetadataRoute.Sitemap = [
    {
      url: marketingCanonicalUrl(GUIDES_INDEX_PATH),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const guideEntries: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: marketingCanonicalUrl(guideCanonicalPath(guide.slug)),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticEntries, ...guidesIndex, ...guideEntries];
}
