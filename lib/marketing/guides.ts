import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const GUIDES_CONTENT_DIR = join(process.cwd(), "content", "guides");

/** Stable publish order (SEO shortlist rank). */
export const GUIDE_SLUGS = [
  "natal-chart-year-planner",
  "new-moon-full-moon-journaling",
  "quarterly-review-with-timing-reflection",
  "planning-rest-with-personal-timing",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

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

function parseGuideMarkdown(raw: string, slug: GuideSlug): GuideDocument {
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

function loadGuideFromDisk(slug: GuideSlug): GuideDocument {
  const filePath = join(GUIDES_CONTENT_DIR, `${slug}.md`);
  const raw = readFileSync(filePath, "utf8");
  return parseGuideMarkdown(raw, slug);
}

let cachedGuides: GuideDocument[] | null = null;

export function getAllGuides(): GuideDocument[] {
  if (cachedGuides) return cachedGuides;

  const filesOnDisk = new Set(
    readdirSync(GUIDES_CONTENT_DIR).filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, "")),
  );

  for (const slug of GUIDE_SLUGS) {
    if (!filesOnDisk.has(slug)) {
      throw new Error(`Missing guide content file for slug: ${slug}`);
    }
  }

  cachedGuides = GUIDE_SLUGS.map((slug) => loadGuideFromDisk(slug));
  return cachedGuides;
}

export function getGuideBySlug(slug: string): GuideDocument | null {
  if (!isGuideSlug(slug)) return null;
  return getAllGuides().find((guide) => guide.slug === slug) ?? null;
}

export function guideCanonicalPath(slug: GuideSlug): `/guides/${GuideSlug}` {
  return `/guides/${slug}`;
}

export const GUIDES_INDEX_PATH = "/guides" as const;

export const GUIDES_INDEX_SEO_TITLE = "Guides | Kairos";

export const GUIDES_INDEX_META_DESCRIPTION =
  "Practical guides on planning with your natal chart, moon journaling, quarterly reviews, and naming rest in your year.";
