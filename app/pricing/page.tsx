import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { PublicPricingPage } from "@/components/commerce/PublicPricingPage";
import { pricingMarketingMetadata } from "@/lib/marketing/public-page-metadata";

export const metadata: Metadata = pricingMarketingMetadata;

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PricingPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const { userId } = await auth();
  const canceled = Array.isArray(params.canceled) ? params.canceled[0] : params.canceled;
  const attemptParam = params.attempt_id;
  const canceledCheckoutAttemptId = Array.isArray(attemptParam) ? attemptParam[0] : attemptParam;

  return (
    <PublicPricingPage
      isSignedIn={Boolean(userId)}
      mode="pricing"
      showCanceledMessage={canceled === "1"}
      canceledCheckoutAttemptId={canceled === "1" ? canceledCheckoutAttemptId : undefined}
    />
  );
}
