import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KairosHome } from "@/components/marketing/KairosHome";
import { homeMarketingMetadata } from "@/lib/marketing/public-page-metadata";

export const metadata: Metadata = homeMarketingMetadata;

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/today");

  return <KairosHome isSignedIn={false} />;
}
