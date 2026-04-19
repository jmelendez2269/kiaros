import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function OnboardingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("onboarding_completed_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-stone-950 bg-shell-glow">
      {children}
    </div>
  );
}
