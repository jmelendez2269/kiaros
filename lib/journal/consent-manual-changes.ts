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
  | 'current_include_in_insights'
  | 'current_include_in_stelloquy'
>

function insightsSwitchChanged(row: AuditRow): boolean {
  return (
    row.previous_include_in_insights !== null &&
    row.current_include_in_insights !== row.previous_include_in_insights
  )
}

function stelloquySwitchChanged(row: AuditRow): boolean {
  return (
    row.previous_include_in_stelloquy !== null &&
    row.current_include_in_stelloquy !== row.previous_include_in_stelloquy
  )
}

/**
 * Per-entry manual change: a `changed` audit row from the member UI where that
 * switch's value actually changed (not importance-only or the other switch).
 */
export function entryIdsWithManualInsightsChange(rows: AuditRow[]): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    if (!row.journal_entry_id) continue
    if (row.event_type !== 'changed') continue
    if (row.change_source !== MANUAL_CHANGE_SOURCE) continue
    if (!insightsSwitchChanged(row)) continue
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
    if (!stelloquySwitchChanged(row)) continue
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
      'journal_entry_id, event_type, change_source, previous_include_in_insights, previous_include_in_stelloquy, current_include_in_insights, current_include_in_stelloquy',
    )
    .eq('user_id', userProfileId)

  if (error) throw new Error('Failed to load journal consent audit')
  return data ?? []
}
