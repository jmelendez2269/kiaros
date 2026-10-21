/**
 * Asserts marketing routes export Open Graph + Twitter metadata and 1200×630 OG images.
 * Run: npx tsx scripts/check-marketing-og-metadata.mts
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { KAIROS_MARK_ICON_DATA_URL } from "../lib/marketing/kairos-mark-icon-data-url.ts";

import {
  MARKETING_OG_IMAGE_PATHS,
  MARKETING_OG_IMAGE_SIZE,
} from "../lib/marketing/marketing-og-image-size.ts";
import {
  FIELD_NOTES_MARKETING_DESCRIPTION,
  FIELD_NOTES_MARKETING_TITLE,
  HOME_MARKETING_DESCRIPTION,
  HOME_MARKETING_TITLE,
  PRICING_MARKETING_DESCRIPTION,
  PRICING_MARKETING_TITLE,
  fieldNotesMarketingMetadata,
  homeMarketingMetadata,
  pricingMarketingMetadata,
} from "../lib/marketing/public-page-metadata.ts";
import {
  guideMarketingMetadata,
  guidesIndexMarketingMetadata,
} from "../lib/marketing/guide-page-metadata.ts";
import {
  getAllGuides,
  GUIDES_INDEX_META_DESCRIPTION,
  GUIDES_INDEX_PATH,
  GUIDES_INDEX_SEO_TITLE,
  guideCanonicalPath,
} from "../lib/marketing/guides.ts";
import { PUBLIC_ROUTE_PATTERNS } from "../lib/marketing/public-routes.ts";
import { marketingCanonicalUrl } from "../lib/marketing/public-site.ts";

type RouteCase = {
  name: string;
  metadata: typeof homeMarketingMetadata;
  expectedTitle: string;
  expectedDescription: string;
  canonicalPath: string;
  ogFile: string;
};

const routes: RouteCase[] = [
  {
    name: "/",
    metadata: homeMarketingMetadata,
    expectedTitle: HOME_MARKETING_TITLE,
    expectedDescription: HOME_MARKETING_DESCRIPTION,
    canonicalPath: "/",
    ogFile: join("app", "opengraph-image.tsx"),
  },
  {
    name: "/pricing",
    metadata: pricingMarketingMetadata,
    expectedTitle: PRICING_MARKETING_TITLE,
    expectedDescription: PRICING_MARKETING_DESCRIPTION,
    canonicalPath: "/pricing",
    ogFile: join("app", "pricing", "opengraph-image.tsx"),
  },
  {
    name: "/field-notes",
    metadata: fieldNotesMarketingMetadata,
    expectedTitle: FIELD_NOTES_MARKETING_TITLE,
    expectedDescription: FIELD_NOTES_MARKETING_DESCRIPTION,
    canonicalPath: "/field-notes",
    ogFile: join("app", "field-notes", "opengraph-image.tsx"),
  },
  {
    name: GUIDES_INDEX_PATH,
    metadata: guidesIndexMarketingMetadata(),
    expectedTitle: GUIDES_INDEX_SEO_TITLE,
    expectedDescription: GUIDES_INDEX_META_DESCRIPTION,
    canonicalPath: GUIDES_INDEX_PATH,
    ogFile: join("app", "guides", "opengraph-image.tsx"),
  },
  ...getAllGuides().map((guide) => {
    const path = guideCanonicalPath(guide.slug);
    return {
      name: path,
      metadata: guideMarketingMetadata(guide),
      expectedTitle: guide.seoTitle,
      expectedDescription: guide.metaDescription,
      canonicalPath: path,
      ogFile: join("app", "guides", "[slug]", "opengraph-image.tsx"),
    };
  }),
];

let checks = 0;

const iconPath = join("public", "icon-192.png");
const iconDataUrl = `data:image/png;base64,${readFileSync(iconPath).toString("base64")}`;
assert.equal(
  KAIROS_MARK_ICON_DATA_URL,
  iconDataUrl,
  "KAIROS_MARK_ICON_DATA_URL must match public/icon-192.png (regenerate kairos-mark-icon-data-url.ts if the icon changed)",
);
checks += 1;

assert.ok(
  PUBLIC_ROUTE_PATTERNS.includes("/opengraph-image(.*)"),
  "PUBLIC_ROUTE_PATTERNS must include /opengraph-image(.*) for homepage link-preview crawlers",
);
assert.ok(PUBLIC_ROUTE_PATTERNS.includes("/guides(.*)"), "PUBLIC_ROUTE_PATTERNS must include /guides(.*)");
checks += 2;

for (const route of routes) {
  const og = route.metadata.openGraph;
  const twitter = route.metadata.twitter;

  assert.ok(og, `${route.name}: openGraph metadata is defined`);
  assert.equal(og?.title, route.expectedTitle, `${route.name}: og:title`);
  assert.equal(og?.description, route.expectedDescription, `${route.name}: og:description`);
  assert.equal(og?.url, marketingCanonicalUrl(route.canonicalPath), `${route.name}: og:url`);
  checks += 3;

  assert.ok(twitter, `${route.name}: twitter metadata is defined`);
  assert.equal(twitter?.card, "summary_large_image", `${route.name}: twitter:card`);
  assert.equal(twitter?.title, route.expectedTitle, `${route.name}: twitter:title`);
  assert.equal(twitter?.description, route.expectedDescription, `${route.name}: twitter:description`);
  checks += 4;

  assert.equal(
    route.metadata.alternates?.canonical,
    marketingCanonicalUrl(route.canonicalPath),
    `${route.name}: canonical`,
  );
  checks += 1;

  const ogImagePath =
    MARKETING_OG_IMAGE_PATHS[route.canonicalPath as keyof typeof MARKETING_OG_IMAGE_PATHS];
  assert.ok(ogImagePath, `${route.name}: OG image path`);
  assert.ok(existsSync(route.ogFile), `${route.name}: ${route.ogFile} exists`);
  checks += 1;
  assert.equal(MARKETING_OG_IMAGE_SIZE.width, 1200, `${route.name}: OG width`);
  assert.equal(MARKETING_OG_IMAGE_SIZE.height, 630, `${route.name}: OG height`);
  checks += 3;

  console.log(
    `OK ${route.name} — title: ${route.expectedTitle}\n    description: ${route.expectedDescription}\n    image: ${ogImagePath} (${MARKETING_OG_IMAGE_SIZE.width}x${MARKETING_OG_IMAGE_SIZE.height})`,
  );
}

console.log(`\nMarketing OG metadata check passed (${checks} assertions).`);
