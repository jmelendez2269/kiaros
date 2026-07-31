import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  computeHumanDesign,
  isHumanDesignStale,
  parseStoredHumanDesign,
  type HumanDesignBirthInput,
  type HumanDesignChart,
} from '@/lib/human-design'
import { calculateHumanDesignTransitWeather } from '@/lib/human-design-transits'
import type { HumanDesignTransitWeather } from '@/lib/human-design-transit-model'

function resolveChart(profile: HumanDesignBirthInput & { human_design: unknown }): HumanDesignChart | null {
  const stored = parseStoredHumanDesign(profile.human_design)
  if (stored && !isHumanDesignStale(profile.human_design)) return stored
  return computeHumanDesign(profile)
}

export async function getHumanDesignWeather(
  supabaseUserId: string,
  instant = new Date(),
): Promise<HumanDesignTransitWeather> {
  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select(
      'human_design, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng',
    )
    .eq('id', supabaseUserId)
    .maybeSingle()

  const chart = profile ? resolveChart(profile) : null
  return calculateHumanDesignTransitWeather(instant, chart)
}
