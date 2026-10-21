import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { GuideSlug } from "@/lib/marketing/guides-constants";
import { GUIDE_SLUGS } from "@/lib/marketing/guides-constants";

const GUIDES_CONTENT_DIR = join(process.cwd(), "content", "guides");

function useDiskGuideSources(): boolean {
  return process.env.KIAROS_GUIDE_SOURCE === "disk";
}

function loadGuideMarkdownFromDisk(slug: GuideSlug): string {
  return readFileSync(join(GUIDES_CONTENT_DIR, `${slug}.md`), "utf8");
}

function loadGuideMarkdownFromBundle(slug: GuideSlug): string {
  // Lazy require so local tsx tests (KIAROS_GUIDE_SOURCE=disk) never touch `.md` imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GUIDE_MARKDOWN_BY_SLUG } = require("@/lib/marketing/guide-sources-bundled") as typeof import("@/lib/marketing/guide-sources-bundled");
  return GUIDE_MARKDOWN_BY_SLUG[slug];
}

export function loadGuideMarkdown(slug: GuideSlug): string {
  if (useDiskGuideSources()) {
    return loadGuideMarkdownFromDisk(slug);
  }
  return loadGuideMarkdownFromBundle(slug);
}

export function loadAllGuideMarkdown(): Record<GuideSlug, string> {
  if (useDiskGuideSources()) {
    return Object.fromEntries(
      GUIDE_SLUGS.map((slug) => [slug, loadGuideMarkdownFromDisk(slug)]),
    ) as Record<GuideSlug, string>;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GUIDE_MARKDOWN_BY_SLUG } = require("@/lib/marketing/guide-sources-bundled") as typeof import("@/lib/marketing/guide-sources-bundled");
  return GUIDE_MARKDOWN_BY_SLUG;
}
