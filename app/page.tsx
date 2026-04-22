import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { PublicPricingPage } from "@/components/commerce/PublicPricingPage";

export default function HomePage() {
  return (
    <>
      <SignedInRedirect href="/dashboard" />
      <PublicPricingPage isSignedIn={false} mode="home" />
    </>
  );
}
