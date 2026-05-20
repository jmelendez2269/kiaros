import { NextResponse, after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import {
  regenerateAllForUser,
  resolveVoicePrompt,
} from '@/lib/ai/journal-insight-synthesis'

// Bulk regen runs in a Next 15 `after()` callback so the client gets
// an immediate 202 with the queued count. The page polls /status to
// watch rows fill in. maxDuration covers the post-response work
// (~40s for a heavy user at concurrency 5).
export const maxDuration = 300

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileId = await getUserProfileId(userId)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const admin = createAdminSupabase()
    const { data: settings } = await admin
      .from('user_settings')
      .select('journal_insight_voice, journal_insight_voice_label')
      .eq('user_id', profileId)
      .maybeSingle()

    const voiceLabel = settings?.journal_insight_voice_label?.trim() || 'Grounded observer'
    const voicePrompt = resolveVoicePrompt(settings?.journal_insight_voice ?? null)

    // Count patterns up front so the caller knows what to expect.
    const { count } = await admin
      .from('user_pattern_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId)

    const queued = count ?? 0
    if (queued === 0) {
      return NextResponse.json({ queued: 0, message: 'No patterns to regenerate.' })
    }

    after(async () => {
      try {
        const result = await regenerateAllForUser({
          userProfileId: profileId,
          voicePrompt,
          voiceLabel,
        })
        console.info(
          `[journal-insights/regenerate] user=${profileId} attempted=${result.attempted} succeeded=${result.succeeded}`,
        )
      } catch (err) {
        console.error('[journal-insights/regenerate] background failure:', err)
      }
    })

    return NextResponse.json({ queued, voiceLabel }, { status: 202 })
  } catch (error) {
    console.error('[journal-insights/regenerate] Failed:', error)
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
