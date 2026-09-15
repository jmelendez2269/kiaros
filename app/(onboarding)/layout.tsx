import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/app/get-app-profile";
import { DataUnavailable } from "@/components/shared/DataUnavailable";

export default async function OnboardingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getAppProfile(userId);

  // This bounce back to /today is the far half of the loop: (app) sends a user
  // here when its profile lookup comes back empty, and this sends them back.
  // While the data API is flaky, whichever query failed decided the direction.
  // Redirect only on a lookup that actually succeeded.
  if (profileResult.status === "unavailable") {
    return <DataUnavailable />;
  }

  if (profileResult.status === "ok" && profileResult.profile.onboarding_completed_at) {
    redirect("/today");
  }

  return (
    <div className="min-h-screen bg-stone-950 bg-shell-glow">
      {children}
    </div>
  );
}
