import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('onboarding_completed_at')
    .eq('clerk_user_id', userId)
    .maybeSingle()

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
        <Sidebar categories={sidebarCategories} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 pb-8 pt-5 md:px-6 md:pb-10 md:pt-6 xl:px-8">
            <div className="mx-auto w-full max-w-[1440px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
