import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

const bodySchema = z.object({ completed: z.boolean() })

interface RouteContext {
  params: Promise<{ id: string; week: string; order: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id, week: weekRaw, order: orderRaw } = await context.params
  const weekNumber = Number(weekRaw)
  const sessionOrder = Number(orderRaw)
  if (!Number.isInteger(weekNumber) || !Number.isInteger(sessionOrder) || weekNumber < 1 || sessionOrder < 1) {
    return NextResponse.json({ error: 'Invalid week or session' }, { status: 400 })
  }

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Body must be { completed: boolean }' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const [{ data: profile }, { data: plan, error: planError }] = await Promise.all([
    supabase.from('user_profiles').select('id').maybeSingle(),
    supabase
      .from('curriculum_plans')
      .select('id, user_id, status')
      .eq('id', id)
      .maybeSingle(),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (planError || !plan || plan.user_id !== profile.id) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  const completedAt = parsed.completed ? new Date().toISOString() : null

  const { data: progressRow, error: upsertError } = await admin
    .from('curriculum_session_progress')
    .upsert(
      {
        curriculum_plan_id: plan.id,
        user_id: profile.id,
        week_number: weekNumber,
        session_order: sessionOrder,
        completed_at: completedAt,
      },
      { onConflict: 'curriculum_plan_id,week_number,session_order' }
    )
    .select('id, curriculum_plan_id, week_number, session_order, completed_at, updated_at')
    .single()

  if (upsertError || !progressRow) {
    const rawMessage = upsertError?.message || 'Failed to update progress'
    const relationMissing =
      rawMessage.toLowerCase().includes('relation') &&
      rawMessage.toLowerCase().includes('curriculum_session_progress')
    console.error('[curriculum.session.complete] upsert failed:', upsertError)
    return NextResponse.json(
      {
        error: relationMissing
          ? 'The curriculum_session_progress table is not in Supabase yet. Run migration 0025_curriculum_session_progress.sql and try again.'
          : rawMessage,
      },
      { status: 500 }
    )
  }

  // Sync to curriculum_sessions for approved/paused plans (both still have
  // scheduled rows) so Today reflects completion the moment a paused course
  // resumes. Best-effort: if the scheduled row is missing we don't block the
  // response — the progress row is the truth.
  if (plan.status === 'approved' || plan.status === 'paused') {
    const nextStatus = parsed.completed ? 'done' : 'scheduled'
    const { error: scheduleError } = await admin
      .from('curriculum_sessions')
      .update({ status: nextStatus })
      .eq('curriculum_plan_id', plan.id)
      .eq('week_number', weekNumber)
      .eq('session_order', sessionOrder)
    if (scheduleError) {
      console.error('[curriculum.session.complete] schedule sync failed:', scheduleError)
    }
  }

  return NextResponse.json({ progress: progressRow })
}
