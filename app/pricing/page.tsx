import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { PublicPricingPage } from "@/components/commerce/PublicPricingPage";

export const metadata: Metadata = {
  title: "Pricing | Kairos",
  description:
    "Compare monthly, annual, and Etsy access for Kairos Planner and Planner + Oracle, including journal memory and sky-pattern intelligence.",
};

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PricingPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const { userId } = await auth();
  const canceled = Array.isArray(params.canceled) ? params.canceled[0] : params.canceled;

  return (
    <PublicPricingPage
      isSignedIn={Boolean(userId)}
      mode="pricing"
      showCanceledMessage={canceled === "1"}
    />
  );
}
