import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { GuidePageContent } from "@/components/marketing/GuidePageContent";
import { guideMarketingMetadata } from "@/lib/marketing/guide-page-metadata";
import { getGuideBySlug, GUIDE_SLUGS } from "@/lib/marketing/guides";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return guideMarketingMetadata(guide);
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  return <GuidePageContent guide={guide} />;
}
