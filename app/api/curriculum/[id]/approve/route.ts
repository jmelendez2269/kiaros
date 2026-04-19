import { NextResponse } from 'next/server'
import type { CurriculumDraft, CurriculumDraftSession } from '@/types/curriculum'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

function getNextMonday(from = new Date()) {
  const date = new Date(from)
  date.setHours(12, 0, 0, 0)
  const day = date.getDay()
  const offset = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  date.setDate(date.getDate() + offset)
  return date
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dayOffsetForSession(index: number, total: number) {
  if (total <= 1) return 0
  return Math.round((index * 4) / (total - 1))
}

function buildScheduledSessions(planId: string, userId: string, title: string, draft: CurriculumDraft, startDate: Date) {
  return draft.weeks.flatMap((week) => {
    const weekStart = addDays(startDate, (week.weekNumber - 1) * 7)

    return week.sessions.map((session: CurriculumDraftSession, index) => ({
      curriculum_plan_id: planId,
      user_id: userId,
      curriculum_title: title,
      week_number: week.weekNumber,
      session_order: index + 1,
      title: session.title,
      description: session.description,
      session_type: session.type,
      estimated_minutes: session.minutes,
      scheduled_for: toISODate(addDays(weekStart, dayOffsetForSession(index, week.sessions.length))),
      status: 'scheduled' as const,
    }))
  })
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const [{ data: profile, error: profileError }, { data: plan, error: planError }] = await Promise.all([
    supabase.from('user_profiles').select('id').maybeSingle(),
    supabase
      .from('curriculum_plans')
      .select(
        'id, user_id, title, topic, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
      )
      .eq('id', params.id)
      .maybeSingle(),
  ])

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (planError || !plan || plan.user_id !== profile.id) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  const draft = plan.curriculum as unknown as CurriculumDraft
  const startDate = plan.start_date ? new Date(`${plan.start_date}T12:00:00`) : getNextMonday()
  const scheduledSessions = buildScheduledSessions(plan.id, profile.id, plan.title, draft, startDate)

  const { error: deleteError } = await admin
    .from('curriculum_sessions')
    .delete()
    .eq('curriculum_plan_id', plan.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to reset scheduled sessions' }, { status: 500 })
  }

  const { error: sessionsError } = await admin
    .from('curriculum_sessions')
    .insert(scheduledSessions)

  if (sessionsError) {
    return NextResponse.json({ error: 'Failed to schedule curriculum' }, { status: 500 })
  }

  const { data: approvedPlan, error: updateError } = await admin
    .from('curriculum_plans')
    .update({
      status: 'approved',
      start_date: toISODate(startDate),
      approved_at: new Date().toISOString(),
    })
    .eq('id', plan.id)
    .select(
      'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
    )
    .single()

  if (updateError || !approvedPlan) {
    return NextResponse.json({ error: 'Failed to approve curriculum' }, { status: 500 })
  }

  return NextResponse.json({ plan: approvedPlan, sessions: scheduledSessions })
}
