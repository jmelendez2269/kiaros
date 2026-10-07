import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  entryIdsWithManualInsightsChange,
  entryIdsWithManualStelloquyChange,
  loadConsentAuditForUser,
} from '@/lib/journal/consent-manual-changes'
import {
  invalidateJournalDerivedContent,
  rebuildJournalDerivedContent,
} from '@/lib/journal/derived-rebuild'
import { resolvedDefaultToggles, type JournalMemorySettings } from '@/lib/journal/memory-defaults'
import type { Database } from '@/types/database'

export type BulkPastEntriesResult = {
  updatedCount: number
  insightsTouched: boolean
}

export async function applyPastEntriesConsentBulk(params: {
  admin: SupabaseClient<Database>
  userProfileId: string
  settings: JournalMemorySettings
  hasOracleAccess: boolean
}): Promise<BulkPastEntriesResult> {
  const { admin, userProfileId, settings, hasOracleAccess } = params
  const targets = resolvedDefaultToggles(settings, hasOracleAccess)

  const auditRows = await loadConsentAuditForUser(admin, userProfileId)
  const skipInsights = entryIdsWithManualInsightsChange(auditRows)
  const skipStelloquy = entryIdsWithManualStelloquyChange(auditRows)

  const { data: entries, error: entriesError } = await admin
    .from('journal_entries')
    .select('id, include_in_insights, include_in_stelloquy')
    .eq('user_id', userProfileId)

  if (entriesError) throw new Error('Failed to load journal entries for bulk consent')

  const toUpdate = (entries ?? []).filter((entry) => {
    const insightsOk =
      targets.include_in_insights &&
      !skipInsights.has(entry.id) &&
      !entry.include_in_insights
    const stelloquyOk =
      targets.include_in_stelloquy &&
      !skipStelloquy.has(entry.id) &&
      !entry.include_in_stelloquy
    return insightsOk || stelloquyOk
  })

  if (toUpdate.length === 0) {
    await insertBulkAuditEvent(admin, userProfileId, {
      entriesUpdated: 0,
      stelloquyApplied: false,
      insightsApplied: false,
    })
    return { updatedCount: 0, insightsTouched: false }
  }

  const insightsWillChange = toUpdate.some(
    (entry) =>
      targets.include_in_insights &&
      !skipInsights.has(entry.id) &&
      !entry.include_in_insights,
  )

  if (insightsWillChange) {
    await invalidateJournalDerivedContent(userProfileId)
  }

  const rpcResult = await admin.rpc('bulk_apply_journal_entry_consent', {
    p_user_id: userProfileId,
    p_set_insights: targets.include_in_insights,
    p_set_stelloquy: targets.include_in_stelloquy,
    p_skip_insights_entry_ids: Array.from(skipInsights),
    p_skip_stelloquy_entry_ids: Array.from(skipStelloquy),
  })

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message)
  }

  const updatedCount = typeof rpcResult.data === 'number' ? rpcResult.data : toUpdate.length

  const stelloquyApplied =
    hasOracleAccess &&
    targets.include_in_stelloquy &&
    toUpdate.some(
      (entry) =>
        !skipStelloquy.has(entry.id) && !entry.include_in_stelloquy,
    )

  await insertBulkAuditEvent(admin, userProfileId, {
    entriesUpdated: updatedCount,
    stelloquyApplied,
    insightsApplied: insightsWillChange,
  })

  if (insightsWillChange) {
    await rebuildJournalDerivedContent(userProfileId)
  }

  return { updatedCount, insightsTouched: insightsWillChange }
}

async function insertBulkAuditEvent(
  admin: SupabaseClient<Database>,
  userProfileId: string,
  summary: {
    entriesUpdated: number
    insightsApplied: boolean
    stelloquyApplied: boolean
  },
) {
  const { error } = await admin.from('journal_entry_consent_audit').insert({
    journal_entry_id: null,
    user_id: userProfileId,
    event_type: 'bulk_past_entries_include',
    previous_include_in_insights: null,
    previous_include_in_stelloquy: null,
    previous_memory_pinned: null,
    previous_memory_importance: null,
    current_include_in_insights: summary.insightsApplied,
    current_include_in_stelloquy: summary.stelloquyApplied,
    current_memory_pinned: false,
    current_memory_importance: null,
    change_source: 'bulk_past_entries_include',
  })

  if (error) throw new Error('Failed to record bulk past-entries consent audit')
}
