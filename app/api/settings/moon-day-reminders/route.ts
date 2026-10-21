import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { loadMoonDayNudgeSettings } from '@/lib/today/load-moon-day-nudge-settings'
import { parseDismissalMap } from '@/lib/today/moon-day-phase'

const patchSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  dismissKey: z.string().regex(/^(new|full):\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileResult = await getAppProfile(userId)
  if (profileResult.status !== 'ok') {
    return NextResponse.json({ error: 'Profile unavailable' }, { status: 503 })
  }

  const admin = createAdminSupabase()
  const settings = await loadMoonDayNudgeSettings(admin, profileResult.profile.id)

  return NextResponse.json({
    remindersEnabled: settings.remindersEnabled,
    dismissals: settings.dismissals,
  })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileResult = await getAppProfile(userId)
  if (profileResult.status !== 'ok') {
    return NextResponse.json({ error: 'Profile unavailable' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const userProfileId = profileResult.profile.id
  const existing = await loadMoonDayNudgeSettings(admin, userProfileId)

  const nextDismissals = { ...existing.dismissals }
  if (parsed.data.dismissKey) {
    nextDismissals[parsed.data.dismissKey] = true
  }

  const upsertPayload = {
    user_id: userProfileId,
    moon_day_reminders_enabled: parsed.data.remindersEnabled ?? existing.remindersEnabled,
    moon_day_nudge_dismissals: nextDismissals,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('user_settings').upsert(upsertPayload, { onConflict: 'user_id' })

  if (error) {
    if (error.code === '42703' || error.message?.includes('moon_day')) {
      return NextResponse.json(
        { error: 'Moon-day reminders are not available until the database migration is applied.' },
        { status: 503 },
      )
    }
    console.error('[settings/moon-day-reminders] PATCH failed:', error)
    return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 })
  }

  return NextResponse.json({
    remindersEnabled: upsertPayload.moon_day_reminders_enabled,
    dismissals: parseDismissalMap(nextDismissals),
  })
}
