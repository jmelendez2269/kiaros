import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { JournalMemorySettings } from '@/lib/journal/memory-defaults'
import type { Database } from '@/types/database'

const MEMORY_SETTINGS_COLUMNS =
  'journal_memory_mode, default_include_in_insights, default_include_in_stelloquy, memory_mode_prompted_at, past_entries_included_at'

export async function loadJournalMemorySettings(
  supabase: SupabaseClient<Database>,
  userProfileId: string,
): Promise<JournalMemorySettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(MEMORY_SETTINGS_COLUMNS)
    .eq('user_id', userProfileId)
    .maybeSingle()

  if (error) throw new Error('Failed to load journal memory settings')

  return {
    journal_memory_mode: (data?.journal_memory_mode as JournalMemorySettings['journal_memory_mode']) ?? null,
    default_include_in_insights: data?.default_include_in_insights ?? null,
    default_include_in_stelloquy: data?.default_include_in_stelloquy ?? null,
    memory_mode_prompted_at: data?.memory_mode_prompted_at ?? null,
    past_entries_included_at: data?.past_entries_included_at ?? null,
  }
}

export { MEMORY_SETTINGS_COLUMNS }
