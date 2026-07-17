import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { getDayPlan } from '@/lib/planner/get-day-plan'
import { suggestPlacements, type PlacedBlock, type PlacementTask } from '@/lib/ai/plan-placement-generator'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const date = typeof body.date === 'string' ? body.date : ''
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.filter((x: unknown) => typeof x === 'string') : []
  if (itemIds.length === 0) {
    return NextResponse.json({ error: 'itemIds must be a non-empty array' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  if (!profile?.id) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const dayPlan = await getDayPlan(profile.id, date)
  const requested = new Set(itemIds)

  // Only place items that belong to this user, are on this date, and are
  // currently unscheduled. Already-timed items become context, not tasks.
  const tasks: PlacementTask[] = dayPlan.planItems
    .filter((i) => requested.has(i.id) && i.start_minute === null)
    .map((i) => ({ id: i.id, title: i.title }))

  if (tasks.length === 0) {
    return NextResponse.json({ error: 'No unscheduled tasks to place' }, { status: 400 })
  }

  const existing: PlacedBlock[] = dayPlan.planItems
    .filter((i) => i.start_minute !== null)
    .map((i) => ({ title: i.title, startMinute: i.start_minute as number, durationMinutes: i.duration_minutes }))

  try {
    const result = await suggestPlacements({ date, windows: dayPlan.windows, existing, tasks, weekGoals: dayPlan.weekGoals })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not suggest placements'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
