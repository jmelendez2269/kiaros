import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import Link from 'next/link'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { AlmanacSidebar } from '@/components/almanac/AlmanacSidebar'
import { StelloquyShell } from '@/components/oracle/StelloquyShell'
import { StelloquyProvider } from '@/components/oracle/StelloquyProvider'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { FeedbackButton } from '@/components/feedback/FeedbackButton'
import { ReflectionNotification } from '@/components/reflections/ReflectionNotification'
import { PatternDiscoveryNotifier } from '@/components/insights/PatternDiscoveryNotifier'
import { resolveUserAccess, loadOrderSubscriptionMap, extractStripeOrderIds, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { shouldRollOver } from '@/lib/commerce/capabilities'
import { getPlannerYearWithOverride } from '@/lib/commerce/planner-year'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { ESTABLISHED_PATTERN_MIN_SAMPLE } from '@/lib/journal/pattern-discoveries'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [clerkUser, profileResult] = await Promise.all([currentUser(), getAppProfile(userId)])
  const isAppAdmin = clerkUser?.publicMetadata?.isAdmin === true

  // The gate query failed rather than came back empty — hold the user here
  // instead of reading it as "never onboarded" and bouncing them to /onboarding.
  if (profileResult.status === 'unavailable') {
    return <DataUnavailable />
  }

  if (profileResult.status === 'missing' || !profileResult.profile.onboarding_completed_at) {
    redirect('/onboarding')
  }

  const profile = profileResult.profile

  const admin = createAdminSupabase()

  const [entitlementsResult, establishedPatternsResult] = await Promise.all([
    admin
      .from('product_entitlements')
      .select('id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan')
      .eq('user_id', profile.id)
      .neq('status', 'revoked'),
    admin
      .from('user_pattern_insights')
      .select('id')
      .eq('user_id', profile.id)
      .gte('sample_size', ESTABLISHED_PATTERN_MIN_SAMPLE)
      .limit(250),
  ])

  // An entitlements query that *failed* looks exactly like a user who owns
  // nothing. Don't tell a paying subscriber their access lapsed because the
  // data API blinked — log it and stay quiet instead.
  if (entitlementsResult.error) {
    console.error('[app-layout] product_entitlements lookup failed', {
      userId: profile.id,
      code: entitlementsResult.error.code,
      message: entitlementsResult.error.message,
    })
  }
  const entitlementsUnknown = Boolean(entitlementsResult.error)
  const entitlements = entitlementsResult.data
  const initialPatternIds = (establishedPatternsResult.data ?? []).map((pattern) => pattern.id)

  // Load subscription info for Stripe entitlements
  const orderIds = extractStripeOrderIds(entitlements ?? []);
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profile.id });

  const access = resolveUserAccess(
    (entitlements ?? []) as ProductEntitlementRecord[],
    undefined,
    undefined,
    subscriptionMap
  )

  // Drives the "quiet sky" win-back email — fire-and-forget so it never
  // slows down the page render.
  after(async () => {
    await admin.from('user_profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', profile.id)
  })

  // If the planner year has rolled (Dec 1) and the user has access to the new year,
  // send them to the year-rollover generation page. The check for an existing
  // current-year blueprint prevents a redirect loop once the rollover route has
  // created the blueprint row.
  const asOf = new Date();
  const currentPlannerYear = getPlannerYearWithOverride(asOf);
  const coveredYears = [
    ...access.capabilities.blueprintFullAccessYears,
    ...access.capabilities.blueprintWindowedAccessYears,
  ];
  
  if (
    access.hasPlannerAccess &&
    shouldRollOver({
      profilePlanYear: profile?.plan_year ?? null,
      coveredYears,
      asOf,
    })
  ) {
    const { data: currentYearBlueprint } = await admin
      .from('blueprints')
      .select('id')
      .eq('user_id', profile.id)
      .eq('plan_year', currentPlannerYear)
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
  // `entitlementsUnknown` means the lookup errored, so `access` describes a
  // failed query rather than this user. Every banner below is an assertion
  // about what they own — suppress them all rather than assert something false.
  const showExpiredBanner = !isAppAdmin && !entitlementsUnknown && access.hasReadOnlyPlannerAccess
  const showExpiringSoonBanner = !isAppAdmin && !entitlementsUnknown && !showExpiredBanner && daysUntilExpiry !== null && daysUntilExpiry <= 30
  // entitlements exist but none are active/read-only → lapsed monthly sub or other expired state
  const showLapsedBanner = !isAppAdmin && !entitlementsUnknown && !access.hasPlannerAccess && !access.hasReadOnlyPlannerAccess && access.entitlements.length > 0
  const showNoAccessBanner = !isAppAdmin && !entitlementsUnknown && !access.hasPlannerAccess && !access.hasReadOnlyPlannerAccess && access.entitlements.length === 0

  return (
    <StelloquyProvider hasOracleAccess={isAppAdmin || access.hasOracleAccess}>
      <div className="min-h-screen overflow-x-hidden bg-stone-950 bg-shell-glow text-bone">
        <div className="flex min-h-screen flex-col md:flex-row">
          <AlmanacSidebar />
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:min-h-screen">
            <main className="w-full min-w-0 flex-1 px-3 pb-8 pt-4 sm:px-4 md:px-7 md:pb-10 md:pt-6 xl:px-10 2xl:px-12">
              <div className="mx-auto w-full max-w-[1480px]">
                {showNoAccessBanner && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-500/40 bg-amber-500/10 px-5 py-3.5">
                    <p className="text-sm text-bone">
                      Your planner access isn&apos;t active yet.{' '}
                      <span className="text-bone-muted">Purchase a plan to get started.</span>
                    </p>
                    <div className="flex flex-wrap gap-2 shrink-0">
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
                <ReflectionNotification />
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
        <PatternDiscoveryNotifier scope={profile.id} initialPatternIds={initialPatternIds} />
        <FeedbackButton />
      </div>
    </StelloquyProvider>
  )
}
