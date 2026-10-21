import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { parseDismissalMap } from '@/lib/today/moon-day-phase'

const MOON_DAY_COLUMNS = 'moon_day_reminders_enabled, moon_day_nudge_dismissals'

export interface MoonDayNudgeSettings {
  remindersEnabled: boolean
  dismissals: Record<string, true>
}

export async function loadMoonDayNudgeSettings(
  supabase: SupabaseClient<Database>,
  userProfileId: string,
): Promise<MoonDayNudgeSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(MOON_DAY_COLUMNS)
    .eq('user_id', userProfileId)
    .maybeSingle()

  if (error) {
    // Graceful fallback when migration has not been applied yet.
    if (error.code === '42703' || error.message?.includes('moon_day')) {
      return { remindersEnabled: true, dismissals: {} }
    }
    throw new Error('Failed to load moon-day reminder settings')
  }

  return {
    remindersEnabled: data?.moon_day_reminders_enabled ?? true,
    dismissals: parseDismissalMap(data?.moon_day_nudge_dismissals),
  }
}

export { MOON_DAY_COLUMNS }
