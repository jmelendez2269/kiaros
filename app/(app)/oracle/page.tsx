import Link from 'next/link'

import { OracleChat } from '@/components/oracle/OracleChat'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { createServerSupabase } from '@/lib/supabase/server'

function OracleUpgradeState({ hasReadOnlyPlannerAccess }: { hasReadOnlyPlannerAccess: boolean }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center">
      <section className="shell-panel-hero w-full p-8 md:p-10">
        <p className="shell-kicker mb-4">Stelloquy · steh-LOH-kwee</p>
        <h1 className="shell-hero-title max-w-3xl">
          Unlock Stelloquy&apos;s memory and pattern layer.
        </h1>
        <p className="shell-prose-lead mt-4 max-w-3xl">
          Stelloquy is the voice woven through Kiaros — a conversation with the stars, grounded in
          your chart, the current sky, your marked journal memory, and the recurring astrological
          patterns we observe across your entries. Included with an active Planner + Oracle
          subscription or Etsy Planner + Oracle activation.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            'Journal entries can become Stelloquy memory when you choose.',
            'Each entry carries lunar, retrograde, and transit-aspect context.',
            'Repeated patterns can inform Stelloquy guidance and future calendars.',
          ].map((item) => (
            <div key={item} className="shell-panel-soft p-4 text-sm leading-7 text-bone-muted">
              {item}
            </div>
          ))}
        </div>

        {hasReadOnlyPlannerAccess ? (
          <p className="mt-6 rounded-[1rem] border border-leather-500/25 bg-leather-500/10 px-4 py-3 text-sm leading-6 text-bone-muted">
            Your previous annual planner remains readable, but Stelloquy requires active Planner +
            Oracle access.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing#tiers"
            className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
          >
            See Planner + Oracle
          </Link>
          <Link
            href="/journal"
            className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
          >
            Go to journal
          </Link>
        </div>
      </section>
    </div>
  )
}

export default async function OraclePage() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date())

  const supabase = await createServerSupabase()
  const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()

  const { data: entitlements } = profile?.id
    ? await supabase
        .from('product_entitlements')
        .select('id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan')
        .eq('user_id', profile.id)
        .neq('status', 'revoked')
    : { data: [] }

  const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[])

  if (!access.hasOracleAccess) {
    return <OracleUpgradeState hasReadOnlyPlannerAccess={access.hasReadOnlyPlannerAccess} />
  }

  return <OracleChat today={today} />
}
