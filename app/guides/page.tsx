import { GuidesIndexContent } from "@/components/marketing/GuidesIndexContent";
import { getAllGuides } from "@/lib/marketing/guides";
import { guidesIndexMarketingMetadata } from "@/lib/marketing/guide-page-metadata";

export const metadata = guidesIndexMarketingMetadata();

export default function GuidesIndexPage() {
  const guides = getAllGuides();
  return <GuidesIndexContent guides={guides} />;
}
