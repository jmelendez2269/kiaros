import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { AlmanacSidebar } from '@/components/almanac/AlmanacSidebar'
import { StelloquyShell } from '@/components/oracle/StelloquyShell'
import { StelloquyProvider } from '@/components/oracle/StelloquyProvider'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { FeedbackButton } from '@/components/feedback/FeedbackButton'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()])
  if (!userId) redirect('/sign-in')

  const isAppAdmin = clerkUser?.publicMetadata?.isAdmin === true

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed_at, plan_year')
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

  const { data: categories } = profile?.id
    ? await admin
        .from('goal_categories')
        .select('id, name, icon_key, sort_order')
        .eq('user_id', profile.id)
        .order('sort_order', { ascending: true })
    : { data: [] }

  // Supabase rows can carry prototypes React won't serialize into Client Components.
  const sidebarCategories = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    icon_key: category.icon_key,
  }))

  if (!profile?.onboarding_completed_at) {
    redirect('/onboarding')
  }

  // If the calendar year has advanced past the user's plan_year and they still
  // have an active entitlement (monthly sub still billing), send them to the
  // year-rollover generation page. The check for an existing current-year blueprint
  // prevents a redirect loop once the rollover route has created the blueprint row.
  const currentYear = new Date().getFullYear()
  if (access.hasPlannerAccess && profile?.plan_year && profile.plan_year < currentYear) {
    const { data: currentYearBlueprint } = await admin
      .from('blueprints')
      .select('id')
      .eq('user_id', profile.id)
      .eq('plan_year', currentYear)
      .limit(1)
      .maybeSingle()

    if (!currentYearBlueprint) {
      redirect('/renewing')
    }
  }

  // Expiry banner — only for yearly entitlements (monthly subs are handled by Stripe).
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeYearlyEntitlement = (entitlements ?? []).find(
    (e) => e.access_plan === 'yearly' && e.status !== 'revoked' && e.ends_at >= todayStr
  )
  const daysUntilExpiry = activeYearlyEntitlement
    ? Math.ceil(
        (new Date(activeYearlyEntitlement.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null
  const showExpiredBanner = !isAppAdmin && access.hasReadOnlyPlannerAccess
  const showExpiringSoonBanner = !isAppAdmin && !showExpiredBanner && daysUntilExpiry !== null && daysUntilExpiry <= 30
  // entitlements exist but none are active/read-only → lapsed monthly sub or other expired state
  const showLapsedBanner = !isAppAdmin && !access.hasPlannerAccess && !access.hasReadOnlyPlannerAccess && access.entitlements.length > 0
  const showNoAccessBanner = !isAppAdmin && !access.hasPlannerAccess && !access.hasReadOnlyPlannerAccess && access.entitlements.length === 0

  return (
    <StelloquyProvider hasOracleAccess={isAppAdmin || access.hasOracleAccess}>
      <div className="min-h-screen overflow-x-hidden bg-stone-950 bg-shell-glow text-bone">
        <div className="flex min-h-screen flex-col md:flex-row">
          <AlmanacSidebar categories={sidebarCategories} hasOracleAccess={isAppAdmin || access.hasOracleAccess} />
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:min-h-screen">
            <main className="w-full min-w-0 flex-1 px-3 pb-8 pt-4 sm:px-4 md:px-7 md:pb-10 md:pt-6 xl:px-10 2xl:px-12">
              <div className="mx-auto w-full max-w-[1480px]">
                {showNoAccessBanner && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-500/40 bg-amber-500/10 px-5 py-3.5">
                    <p className="text-sm text-bone">
                      Your planner access isn&apos;t active yet.{' '}
                      <span className="text-bone-muted">Purchase a plan to get started, or finish activating an Etsy order.</span>
                    </p>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Link
                        href="/activate"
                        className="inline-flex items-center rounded-full border border-amber-400/50 px-4 py-2 text-xs font-semibold text-bone shrink-0"
                      >
                        Activate Etsy order →
                      </Link>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-xs font-semibold text-stone-950 shrink-0"
                      >
                        Get access →
                      </Link>
                    </div>
                  </div>
                )}
                {showLapsedBanner && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-500/40 bg-amber-500/10 px-5 py-3.5">
                    <p className="text-sm text-bone">
                      Your subscription has lapsed.{' '}
                      <span className="text-bone-muted">Renew to continue creating new content.</span>
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-xs font-semibold text-stone-950 shrink-0"
                    >
                      Renew access →
                    </Link>
                  </div>
                )}
                {showExpiredBanner && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-ember-500/40 bg-ember-500/10 px-5 py-3.5">
                    <p className="text-sm text-bone">
                      Your planner access has expired.{' '}
                      <span className="text-bone-muted">Your journal and blueprint are still readable.</span>
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-xs font-semibold text-stone-950 shrink-0"
                    >
                      Renew access →
                    </Link>
                  </div>
                )}
                {showExpiringSoonBanner && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-leather-500/35 bg-leather-500/8 px-5 py-3.5">
                    <p className="text-sm text-bone">
                      Your access expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.{' '}
                      <span className="text-bone-muted">Renew early and your loyalty discount is waiting.</span>
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-full border border-leather-400/60 px-4 py-2 text-xs font-semibold text-leather-200 shrink-0"
                    >
                      Renew access →
                    </Link>
                  </div>
                )}
                {children}
              </div>
            </main>
          </div>
        </div>
        <StelloquyShell
          today={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        />
        <TourOverlay />
        <FeedbackButton />
      </div>
    </StelloquyProvider>
  )
}
