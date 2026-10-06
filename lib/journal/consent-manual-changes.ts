import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const MANUAL_CHANGE_SOURCE = 'database_trigger'

type AuditRow = Pick<
  Database['public']['Tables']['journal_entry_consent_audit']['Row'],
  | 'journal_entry_id'
  | 'event_type'
  | 'change_source'
  | 'previous_include_in_insights'
  | 'previous_include_in_stelloquy'
>

/**
 * Entries the member changed via per-entry UI/API carry audit rows with
 * change_source `database_trigger`. Bulk and migration sources are excluded.
 */
export function entryIdsWithManualInsightsChange(rows: AuditRow[]): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    if (!row.journal_entry_id) continue
    if (row.event_type !== 'changed') continue
    if (row.change_source !== MANUAL_CHANGE_SOURCE) continue
    if (row.previous_include_in_insights === null) continue
    ids.add(row.journal_entry_id)
  }
  return ids
}

export function entryIdsWithManualStelloquyChange(rows: AuditRow[]): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    if (!row.journal_entry_id) continue
    if (row.event_type !== 'changed') continue
    if (row.change_source !== MANUAL_CHANGE_SOURCE) continue
    if (row.previous_include_in_stelloquy === null) continue
    ids.add(row.journal_entry_id)
  }
  return ids
}

export async function loadConsentAuditForUser(
  admin: SupabaseClient<Database>,
  userProfileId: string,
): Promise<AuditRow[]> {
  const { data, error } = await admin
    .from('journal_entry_consent_audit')
    .select(
      'journal_entry_id, event_type, change_source, previous_include_in_insights, previous_include_in_stelloquy',
    )
    .eq('user_id', userProfileId)

  if (error) throw new Error('Failed to load journal consent audit')
  return data ?? []
}
