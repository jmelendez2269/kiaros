/**
 * Fails if marketing OG copy exceeds line/stack limits at chosen typography.
 * Run: npx tsx scripts/check-marketing-og-typography.mts
 */

import assert from "node:assert/strict";

import { BRAND } from "../lib/brand.ts";
import {
  getAllGuides,
  GUIDES_INDEX_META_DESCRIPTION,
} from "../lib/marketing/guides.ts";
import {
  FIELD_NOTES_NEWSLETTER_BODY,
  FIELD_NOTES_NEWSLETTER_HEADLINE,
} from "../lib/marketing/field-notes-copy.ts";
import {
  HOME_MARKETING_DESCRIPTION,
  PRICING_HERO_TITLE,
  PRICING_MARKETING_DESCRIPTION,
} from "../lib/marketing/public-page-metadata.ts";
import {
  MARKETING_OG_BODY_MAX_LINES,
  MARKETING_OG_HEADLINE_MAX_LINES,
  MARKETING_OG_MAX_STACK_HEIGHT,
  pickMarketingOgTypography,
} from "../lib/marketing/marketing-og-typography.ts";

type CardCase = {
  name: string;
  title: string;
  subtitle: string;
  hasKicker: boolean;
};

const cards: CardCase[] = [
  {
    name: "/",
    title: BRAND.productTagline,
    subtitle: HOME_MARKETING_DESCRIPTION,
    hasKicker: true,
  },
  {
    name: "/pricing",
    title: PRICING_HERO_TITLE,
    subtitle: PRICING_MARKETING_DESCRIPTION,
    hasKicker: true,
  },
  {
    name: "/field-notes",
    title: FIELD_NOTES_NEWSLETTER_HEADLINE,
    subtitle: FIELD_NOTES_NEWSLETTER_BODY,
    hasKicker: false,
  },
  {
    name: "/guides",
    title: "Guides",
    subtitle: GUIDES_INDEX_META_DESCRIPTION,
    hasKicker: false,
  },
  ...getAllGuides().map((guide) => ({
    name: `/guides/${guide.slug}`,
    title: guide.seoTitle,
    subtitle: guide.metaDescription,
    hasKicker: true,
  })),
];

let checks = 0;

for (const card of cards) {
  const typography = pickMarketingOgTypography({
    title: card.title,
    subtitle: card.subtitle,
    hasKicker: card.hasKicker,
  });

  assert.ok(
    typography.headlineLines <= MARKETING_OG_HEADLINE_MAX_LINES,
    `${card.name}: headline ${typography.headlineLines} lines > ${MARKETING_OG_HEADLINE_MAX_LINES}`,
  );
  assert.ok(
    typography.bodyLines <= MARKETING_OG_BODY_MAX_LINES,
    `${card.name}: body ${typography.bodyLines} lines > ${MARKETING_OG_BODY_MAX_LINES}`,
  );
  assert.ok(
    typography.stackHeight <= MARKETING_OG_MAX_STACK_HEIGHT,
    `${card.name}: stack ${typography.stackHeight}px > ${MARKETING_OG_MAX_STACK_HEIGHT}px`,
  );

  checks += 5;
  console.log(
    `OK ${card.name} — headline ${typography.headlineFontSize}px/${typography.headlineLines}L, body ${typography.bodyFontSize}px/${typography.bodyLines}L, stack ${Math.round(typography.stackHeight)}px`,
  );
}

console.log(`\nMarketing OG typography check passed (${checks} assertions).`);
