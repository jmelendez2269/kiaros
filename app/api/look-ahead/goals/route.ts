import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { parseGoalChoice } from '@/lib/look-ahead/goals'
import { isLookAheadMember } from '@/lib/look-ahead/load'
import { lookAheadWindowAt } from '@/lib/look-ahead/window'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isMockTodayDateAllowed, parseMockTodayDateParam } from '@/lib/today/mock-today-date'

/** Save one goal's choice (carry, reshape or release) for the year being looked into. */
export async function PUT(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const profileResult = await getAppProfile(userId)
  if (profileResult.status !== 'ok') {
    return NextResponse.json({ error: 'We could not find your profile just now. Please try again.' }, { status: 503 })
  }
  const profileId = profileResult.profile.id

  const body: unknown = await req.json().catch(() => null)
  const parsed = parseGoalChoice(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { goalId, year, choice, reshapedTitle } = parsed.value

  // Previews can pass the same mock day the page was opened with.
  const rawMock = body && typeof body === 'object' ? (body as { mockToday?: unknown }).mockToday : undefined
  const mockToday = isMockTodayDateAllowed() && typeof rawMock === 'string' ? parseMockTodayDateParam(rawMock) : null
  const window = lookAheadWindowAt({ mockToday })
  if (!window.open || window.year !== year) {
    return NextResponse.json({ error: `The look-ahead for ${year} is not open right now.` }, { status: 409 })
  }
  if (!(await isLookAheadMember(profileId))) {
    return NextResponse.json({ error: 'The look-ahead is part of an active membership.' }, { status: 403 })
  }

  const admin = createAdminSupabase()
  const { data: goal, error: goalError } = await admin
    .from('area_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', profileId)
    .maybeSingle()
  if (goalError) return NextResponse.json({ error: 'Could not reach your goals. Please try again.' }, { status: 503 })
  if (!goal) return NextResponse.json({ error: 'That goal was not found.' }, { status: 404 })

  const { error } = await admin
    .from('goal_year_choices')
    .upsert(
      { user_id: profileId, area_goal_id: goalId, plan_year: year, choice, reshaped_title: reshapedTitle },
      { onConflict: 'user_id,area_goal_id,plan_year' },
    )
  if (error) {
    console.error('[look-ahead/goals] save failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Your choice could not be saved just now. Please try again.' }, { status: 503 })
  }
  return NextResponse.json({ success: true, data: { goalId, choice, reshapedTitle } })
}
