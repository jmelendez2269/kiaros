/**
 * Asserts marketing routes export Open Graph + Twitter metadata and 1200×630 OG images.
 * Run: npx tsx scripts/check-marketing-og-metadata.mts
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

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
import { PUBLIC_ROUTE_PATTERNS } from "../lib/marketing/public-routes.ts";
import { marketingCanonicalUrl } from "../lib/marketing/public-site.ts";

type RouteCase = {
  name: string;
  metadata: typeof homeMarketingMetadata;
  expectedTitle: string;
  expectedDescription: string;
  canonicalPath: "/" | "/pricing" | "/field-notes";
};

const routes: RouteCase[] = [
  {
    name: "/",
    metadata: homeMarketingMetadata,
    expectedTitle: HOME_MARKETING_TITLE,
    expectedDescription: HOME_MARKETING_DESCRIPTION,
    canonicalPath: "/",
  },
  {
    name: "/pricing",
    metadata: pricingMarketingMetadata,
    expectedTitle: PRICING_MARKETING_TITLE,
    expectedDescription: PRICING_MARKETING_DESCRIPTION,
    canonicalPath: "/pricing",
  },
  {
    name: "/field-notes",
    metadata: fieldNotesMarketingMetadata,
    expectedTitle: FIELD_NOTES_MARKETING_TITLE,
    expectedDescription: FIELD_NOTES_MARKETING_DESCRIPTION,
    canonicalPath: "/field-notes",
  },
];

let checks = 0;

assert.ok(
  PUBLIC_ROUTE_PATTERNS.includes("/opengraph-image(.*)"),
  "PUBLIC_ROUTE_PATTERNS must include /opengraph-image(.*) for homepage link-preview crawlers",
);
checks += 1;

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

  const ogImagePath = MARKETING_OG_IMAGE_PATHS[route.canonicalPath];
  assert.ok(ogImagePath, `${route.name}: OG image path`);
  const ogFile =
    route.canonicalPath === "/"
      ? join("app", "opengraph-image.tsx")
      : join("app", route.canonicalPath.slice(1), "opengraph-image.tsx");
  assert.ok(existsSync(ogFile), `${route.name}: ${ogFile} exists`);
  checks += 1;
  assert.equal(MARKETING_OG_IMAGE_SIZE.width, 1200, `${route.name}: OG width`);
  assert.equal(MARKETING_OG_IMAGE_SIZE.height, 630, `${route.name}: OG height`);
  checks += 3;

  console.log(
    `OK ${route.name} — title: ${route.expectedTitle}\n    description: ${route.expectedDescription}\n    image: ${ogImagePath} (${MARKETING_OG_IMAGE_SIZE.width}x${MARKETING_OG_IMAGE_SIZE.height})`,
  );
}

console.log(`\nMarketing OG metadata check passed (${checks} assertions).`);
