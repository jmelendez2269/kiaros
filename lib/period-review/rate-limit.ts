import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'

const MAX_GENERATIONS_PER_24H = 8

export async function assertPeriodReviewRateLimit(userId: string): Promise<void> {
  const admin = createAdminSupabase()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'period_review')
    .gte('updated_at', since)

  if (error) {
    throw new Error('Could not verify generation limit')
  }
  if ((count ?? 0) >= MAX_GENERATIONS_PER_24H) {
    throw new Error('Daily period review generation limit reached. Try again tomorrow.')
  }
}
