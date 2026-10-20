import { loadGuideMarkdown } from "@/lib/marketing/load-guide-markdown";
import {
  GUIDES_INDEX_META_DESCRIPTION,
  GUIDES_INDEX_PATH,
  GUIDES_INDEX_SEO_TITLE,
  GUIDE_SLUGS,
  type GuideSlug,
} from "@/lib/marketing/guides-constants";

export {
  GUIDES_INDEX_META_DESCRIPTION,
  GUIDES_INDEX_PATH,
  GUIDES_INDEX_SEO_TITLE,
  GUIDE_SLUGS,
  type GuideSlug,
} from "@/lib/marketing/guides-constants";

export interface GuideDocument {
  slug: GuideSlug;
  seoTitle: string;
  metaDescription: string;
  /** Markdown from the first `#` heading through the end (verbatim Stella body). */
  bodyMarkdown: string;
  /** Full on-disk file (SEO lines + body) for verbatim checks. */
  sourceMarkdown: string;
}

const GUIDE_SLUG_SET = new Set<string>(GUIDE_SLUGS);

export function isGuideSlug(value: string): value is GuideSlug {
  return GUIDE_SLUG_SET.has(value);
}

export function parseGuideMarkdown(raw: string, slug: GuideSlug): GuideDocument {
  const seoTitleMatch = /^\*\*SEO title:\*\* (.+)$/m.exec(raw);
  const metaDescriptionMatch = /^\*\*Meta description:\*\* (.+)$/m.exec(raw);
  if (!seoTitleMatch?.[1] || !metaDescriptionMatch?.[1]) {
    throw new Error(`Guide ${slug}: missing SEO title or meta description`);
  }

  const dividerIndex = raw.indexOf("\n---\n");
  if (dividerIndex === -1) {
    throw new Error(`Guide ${slug}: missing body divider`);
  }

  const bodyMarkdown = raw.slice(dividerIndex + "\n---\n".length).replace(/^\n+/, "");

  return {
    slug,
    seoTitle: seoTitleMatch[1].trim(),
    metaDescription: metaDescriptionMatch[1].trim(),
    bodyMarkdown,
    sourceMarkdown: raw,
  };
}

let cachedGuides: GuideDocument[] | null = null;

export function getAllGuides(): GuideDocument[] {
  if (cachedGuides) return cachedGuides;

  cachedGuides = GUIDE_SLUGS.map((slug) => parseGuideMarkdown(loadGuideMarkdown(slug), slug));

  return cachedGuides;
}

export function getGuideBySlug(slug: string): GuideDocument | null {
  if (!isGuideSlug(slug)) return null;
  return getAllGuides().find((guide) => guide.slug === slug) ?? null;
}

export function guideCanonicalPath(slug: GuideSlug): `/guides/${GuideSlug}` {
  return `/guides/${slug}`;
}
