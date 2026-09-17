import 'server-only'

import { cache } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'

export interface AppProfile {
  id: string
  onboarding_completed_at: string | null
  plan_year: number | null
}

/**
 * Three distinct outcomes, deliberately not collapsed into `AppProfile | null`.
 *
 * `supabase-js` does not throw when the data API is unreachable — it returns
 * `{ data: null, error }`. Reading only `data` makes "Supabase timed out" look
 * identical to "this user has never onboarded", which is how a ~28 minute
 * PostgREST outage on 2026-09-03 turned into an onboarding redirect loop for
 * signed-in users. Callers must handle `unavailable` without redirecting.
 */
export type AppProfileResult =
  | { status: 'ok'; profile: AppProfile }
  | { status: 'missing' }
  | { status: 'unavailable'; message: string }

export const getAppProfile = cache(async (clerkUserId: string): Promise<AppProfileResult> => {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed_at, plan_year')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (error) {
    // Never silent: this is the signal that was missing during the 2026-09-03
    // incident, where Vercel recorded zero runtime errors because nothing threw.
    console.error('[get-app-profile] user_profiles lookup failed', {
      clerkUserId,
      code: error.code,
      message: error.message,
      details: error.details,
    })
    return { status: 'unavailable', message: error.message }
  }

  if (!data) return { status: 'missing' }

  return { status: 'ok', profile: data as AppProfile }
})

/**
 * The profile id, or null when there isn't one to be had — for callers inside
 * the (app) group, where the layout has already turned `unavailable` into a
 * retry screen and `missing` into a redirect. Anything that gates access or
 * redirects must switch on `status` itself rather than use this.
 */
export function appProfileId(result: AppProfileResult | null): string | null {
  return result?.status === 'ok' ? result.profile.id : null
}
