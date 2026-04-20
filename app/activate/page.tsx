import { auth } from "@clerk/nextjs/server";

import { ActivationClaimForm } from "@/components/commerce/ActivationClaimForm";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ActivatePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const { userId } = await auth();

  const claimParam = params.claim;
  const initialClaimToken = Array.isArray(claimParam) ? claimParam[0] : claimParam;

  return (
    <div className="page-wrapper">
      <div className="container py-12 md:py-16">
        <ActivationClaimForm initialClaimToken={initialClaimToken} isSignedIn={Boolean(userId)} />
      </div>
    </div>
  );
}
