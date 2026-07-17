import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

const bodySchema = z.object({ paused: z.boolean() })

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Body must be { paused: boolean }' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const [{ data: profile }, { data: plan, error: planError }] = await Promise.all([
    supabase.from('user_profiles').select('id').maybeSingle(),
    supabase.from('curriculum_plans').select('id, user_id, status').eq('id', id).maybeSingle(),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (planError || !plan || plan.user_id !== profile.id) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  const requiredCurrentStatus = parsed.paused ? 'approved' : 'paused'
  if (plan.status !== requiredCurrentStatus) {
    return NextResponse.json(
      {
        error: parsed.paused
          ? 'Only an approved course can be paused.'
          : 'Only a paused course can be resumed.',
      },
      { status: 409 }
    )
  }

  const { data: updated, error: updateError } = await admin
    .from('curriculum_plans')
    .update({ status: parsed.paused ? 'paused' : 'approved' })
    .eq('id', plan.id)
    .select(
      'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
    )
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update course status' }, { status: 500 })
  }

  return NextResponse.json({ plan: updated })
}
