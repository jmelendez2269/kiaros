import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserProfileId } from '@/lib/ai/usage'
import {
  ESTABLISHED_PATTERN_MIN_SAMPLE,
  type PatternDiscovery,
} from '@/lib/journal/pattern-discoveries'
import { createAdminSupabase } from '@/lib/supabase/admin'

type DiscoveryResponse =
  | { success: true; data: { patterns: PatternDiscovery[] } }
  | { success: false; error: string }

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<DiscoveryResponse>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 },
      )
    }

    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('user_pattern_insights')
      .select('id, pattern_type, pattern_key, sample_size, summary, ai_summary, updated_at')
      .eq('user_id', profileId)
      .gte('sample_size', ESTABLISHED_PATTERN_MIN_SAMPLE)
      .order('updated_at', { ascending: false })
      .limit(250)

    if (error) throw error

    return NextResponse.json(
      { success: true, data: { patterns: data ?? [] } },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[journal-insights/discoveries] Failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not check for new patterns' },
      { status: 500 },
    )
  }
}
