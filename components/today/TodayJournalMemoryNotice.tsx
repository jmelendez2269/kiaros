import 'server-only'

import { memberHasOracleAccess } from '@/lib/commerce/member-oracle-access'
import type { ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'
import { loadJournalMemorySettings } from '@/lib/journal/load-memory-settings'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { TodayJournalMemoryNoticeClient } from './TodayJournalMemoryNoticeClient'

/**
 * Shows the one-time journal memory notice on Today, where members land after
 * signing in. The same notice also appears on the journal write page; answering
 * either one stamps memory_mode_prompted_at, so it never shows twice.
 */
export async function TodayJournalMemoryNotice({ profileId }: { profileId: string }) {
  if (!isMemoryDefaultsEnabled() || !isJournalConsentV2Enabled()) return null

  try {
    const admin = createAdminSupabase()
    const settings = await loadJournalMemorySettings(admin, profileId)
    if (settings.memory_mode_prompted_at !== null) return null

    const [{ data: entitlements }, { count }] = await Promise.all([
      admin.from('product_entitlements').select('*').eq('user_id', profileId),
      admin
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId),
    ])
    const hasOracleAccess = await memberHasOracleAccess(
      profileId,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )

    return (
      <TodayJournalMemoryNoticeClient
        hasOracleAccess={hasOracleAccess}
        hasPastEntries={(count ?? 0) > 0}
      />
    )
  } catch (error) {
    // The notice is optional; never break Today over it.
    console.error('[today] journal memory notice unavailable:', error)
    return null
  }
}
