import Link from 'next/link'
import { redirect } from 'next/navigation'
import { JournalHistoryList, type RecentJournalEntry } from '@/components/insights/JournalHistoryList'
import { memberHasOracleAccess } from '@/lib/commerce/member-oracle-access'
import type { ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { isIaJournalEnabled, isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'
import { createServerSupabase } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Entries — ${BRAND.product}`,
  description: 'Your saved journal entries.',
}

export default async function JournalEntriesPage() {
  if (!isIaJournalEnabled()) {
    redirect('/insights/map')
  }

  const supabase = await createServerSupabase()
  const consentV2Enabled = isJournalConsentV2Enabled()
  const memoryDefaultsEnabled = isMemoryDefaultsEnabled() && consentV2Enabled
  const { userId } = await auth()

  const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()

  let hasOracleAccess = false
  if (profile?.id && userId) {
    const { data: entitlements } = await supabase
      .from('product_entitlements')
      .select('*')
      .eq('user_id', profile.id)
    hasOracleAccess = await memberHasOracleAccess(
      profile.id,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )
  }

  const { data: entriesRes } = await supabase
    .from('journal_entries')
    .select(
      'id, title, body, entry_date, is_ritual, created_at, oracle_memory, include_in_insights, include_in_stelloquy, memory_pinned, memory_importance, lunar_phase, lunar_sign, transit_context',
    )
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const recentEntries = (entriesRes ?? []) as RecentJournalEntry[]

  return (
    <div className="space-y-6">
      <header className="max-w-2xl space-y-2">
        <h2 className="font-display text-[1.4rem] text-bone">Your saved reflections</h2>
        <p className="shell-prose text-sm">
          Revisit past entries, rituals, and timing-window notes in one place.
        </p>
      </header>
      <JournalHistoryList
        entries={recentEntries}
        consentV2Enabled={consentV2Enabled}
        hasOracleAccess={hasOracleAccess}
        simplifiedMemoryUi={memoryDefaultsEnabled}
        emptyState={
          <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
            <p>Nothing written yet.</p>
            <Link href="/journal" className="mt-2 inline-block text-violet-300 underline underline-offset-4">
              Write your first entry
            </Link>
          </div>
        }
      />
    </div>
  )
}
