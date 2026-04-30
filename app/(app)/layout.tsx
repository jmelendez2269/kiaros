import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed_at')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  const { data: entitlements } = profile?.id
    ? await admin
        .from('product_entitlements')
        .select('id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan')
        .eq('user_id', profile.id)
        .neq('status', 'revoked')
    : { data: [] }

  const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[])

  const { data: categories } = await admin
    .from('goal_categories')
    .select('id, name, icon_key, sort_order')
    .order('sort_order', { ascending: true })

  // Supabase rows can carry prototypes React won't serialize into Client Components.
  const sidebarCategories = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    icon_key: category.icon_key,
  }))

  if (!profile?.onboarding_completed_at) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-stone-950 bg-shell-glow text-bone">
      <div className="flex min-h-screen">
        <Sidebar categories={sidebarCategories} hasOracleAccess={access.hasOracleAccess} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 pb-8 pt-5 md:px-7 md:pb-10 md:pt-6 xl:px-10 2xl:px-12">
            <div className="mx-auto w-full max-w-[1480px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
