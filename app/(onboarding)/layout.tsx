import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { resolveUserAccess, type ProductEntitlementRecord } from "@/lib/commerce/entitlements";

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
    .select("id, onboarding_completed_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  if (profile?.id) {
    const { data: entitlements } = await admin
      .from("product_entitlements")
      .select("id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan")
      .eq("user_id", profile.id)
      .neq("status", "revoked");

    const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[]);
    if (!access.hasPlannerAccess) {
      redirect("/activate");
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 bg-shell-glow">
      {children}
    </div>
  );
}
