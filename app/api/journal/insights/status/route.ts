import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'

// Stuck-in-flight guard: if a row has been marked `ai_synthesizing_at`
// for longer than this without resolving, treat it as failed so the
// page can stop polling. Worker writes back synchronously on success
// or failure, so this only fires when the function itself died.
const STALE_SYNTHESIS_AFTER_MS = 5 * 60 * 1000

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileId = await getUserProfileId(userId)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('user_pattern_insights')
      .select('id, ai_summary, ai_synthesizing_at')
      .eq('user_id', profileId)

    if (error) throw error

    const rows = data ?? []
    const now = Date.now()
    let total = rows.length
    let complete = 0
    let inFlight = 0

    for (const row of rows) {
      const inFlightAt = row.ai_synthesizing_at
        ? new Date(row.ai_synthesizing_at as unknown as string).getTime()
        : null
      const isStale = inFlightAt !== null && now - inFlightAt > STALE_SYNTHESIS_AFTER_MS
      if (inFlightAt !== null && !isStale) {
        inFlight++
      } else if (row.ai_summary) {
        complete++
      }
    }

    return NextResponse.json({ total, complete, inFlight })
  } catch (error) {
    console.error('[journal-insights/status] Failed:', error)
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
