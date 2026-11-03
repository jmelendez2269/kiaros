import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { getUserProfileId } from '@/lib/ai/usage'
import { createAdminSupabase } from '@/lib/supabase/admin'

const bodySchema = z.object({ enabled: z.boolean() })

/** Member's own opt-in for sky cycle emails. */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const admin = createAdminSupabase()
  const now = new Date().toISOString()
  const { error } = await admin.from('user_settings').upsert(
    { user_id: profileId, sky_cycle_emails: parsed.data.enabled, sky_cycle_emails_updated_at: now, updated_at: now },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('[sky-cycle-emails] toggle failed:', error.message)
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 })
  }
  return NextResponse.json({ enabled: parsed.data.enabled })
}
