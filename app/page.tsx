import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PublicPricingPage } from "@/components/commerce/PublicPricingPage";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <PublicPricingPage isSignedIn={false} mode="home" />;
}
