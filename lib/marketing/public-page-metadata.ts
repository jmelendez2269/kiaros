import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";
import { marketingCanonicalUrl } from "@/lib/marketing/public-site";

const siteName = BRAND.product;

function openGraphAndTwitter(
  title: string,
  description: string,
  path: "/" | "/pricing" | "/field-notes",
): Pick<Metadata, "openGraph" | "twitter"> {
  const url = marketingCanonicalUrl(path);
  return {
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** Root layout default title + description (homepage). */
export const HOME_MARKETING_TITLE =
  "Kairos — Your 2026 planner, built from your natal chart";

export const HOME_MARKETING_DESCRIPTION =
  "A personalized year-long blueprint built from your real natal chart and the actual planetary transits of your year.";

export const homeMarketingMetadata: Metadata = {
  ...openGraphAndTwitter(HOME_MARKETING_TITLE, HOME_MARKETING_DESCRIPTION, "/"),
  alternates: {
    canonical: marketingCanonicalUrl("/"),
  },
};

export const PRICING_MARKETING_TITLE = "Pricing | Kairos";

export const PRICING_MARKETING_DESCRIPTION =
  "Compare monthly and annual access for Kairos Planner and Planner + Oracle, including journal memory and sky-pattern intelligence.";

/** Hero h1 on PublicPricingPage (pricing mode). */
export const PRICING_HERO_TITLE =
  "The planets move on their own schedule. Your year should too.";

export const pricingMarketingMetadata: Metadata = {
  title: PRICING_MARKETING_TITLE,
  description: PRICING_MARKETING_DESCRIPTION,
  ...openGraphAndTwitter(PRICING_MARKETING_TITLE, PRICING_MARKETING_DESCRIPTION, "/pricing"),
  alternates: {
    canonical: marketingCanonicalUrl("/pricing"),
  },
};

export const FIELD_NOTES_MARKETING_TITLE = "Field Notes: Jack's email newsletter | Kairos";

export const FIELD_NOTES_MARKETING_DESCRIPTION =
  "Field Notes is Jack's email newsletter, with essays on timing and rest and notes from building Kairos.";

export const fieldNotesMarketingMetadata: Metadata = {
  title: FIELD_NOTES_MARKETING_TITLE,
  description: FIELD_NOTES_MARKETING_DESCRIPTION,
  ...openGraphAndTwitter(
    FIELD_NOTES_MARKETING_TITLE,
    FIELD_NOTES_MARKETING_DESCRIPTION,
    "/field-notes",
  ),
  alternates: {
    canonical: marketingCanonicalUrl("/field-notes"),
  },
};
