/** Stable publish order (SEO shortlist rank). */
export const GUIDE_SLUGS = [
  "natal-chart-year-planner",
  "new-moon-full-moon-journaling",
  "quarterly-review-with-timing-reflection",
  "planning-rest-with-personal-timing",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export const GUIDES_INDEX_PATH = "/guides" as const;

export const GUIDES_INDEX_SEO_TITLE = "Guides | Kairos";

export const GUIDES_INDEX_META_DESCRIPTION =
  "Practical guides on planning with your natal chart, moon journaling, quarterly reviews, and naming rest in your year.";
