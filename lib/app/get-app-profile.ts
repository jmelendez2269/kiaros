import 'server-only'

import { cache } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const getAppProfile = cache(async (clerkUserId: string) => {
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed_at, plan_year')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  return data
})
