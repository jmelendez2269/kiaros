import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  generateCurriculumSessionContent,
  CURRICULUM_SESSION_MODEL,
} from '@/lib/ai/curriculum-session-generator'
import { recordUsage } from '@/lib/ai/usage'
import type { CurriculumDraft } from '@/types/curriculum'

export const maxDuration = 120

interface RouteContext {
  params: Promise<{ id: string; week: string; order: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const { id, week: weekRaw, order: orderRaw } = await context.params
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'

  const weekNumber = Number(weekRaw)
  const sessionOrder = Number(orderRaw)
  if (!Number.isInteger(weekNumber) || !Number.isInteger(sessionOrder) || weekNumber < 1 || sessionOrder < 1) {
    return NextResponse.json({ error: 'Invalid week or session' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const [{ data: profile }, { data: plan, error: planError }] = await Promise.all([
    supabase.from('user_profiles').select('id, display_name, study_focus').maybeSingle(),
    supabase
      .from('curriculum_plans')
      .select('id, user_id, title, topic, summary, curriculum')
      .eq('id', id)
      .maybeSingle(),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (planError || !plan || plan.user_id !== profile.id) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  if (!force) {
    const { data: existing } = await admin
      .from('curriculum_session_content')
      .select('id, body, exercises, reflection_prompt, model, generated_at, updated_at, week_number, session_order, curriculum_plan_id')
      .eq('curriculum_plan_id', plan.id)
      .eq('week_number', weekNumber)
      .eq('session_order', sessionOrder)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ content: existing, cached: true })
    }
  }

  const draft = plan.curriculum as unknown as CurriculumDraft
  const week = draft.weeks.find((w) => w.weekNumber === weekNumber)
  if (!week) {
    return NextResponse.json({ error: 'Week not in curriculum' }, { status: 404 })
  }
  const session = week.sessions[sessionOrder - 1]
  if (!session) {
    return NextResponse.json({ error: 'Session not in week' }, { status: 404 })
  }

  let generated
  try {
    generated = await generateCurriculumSessionContent({
      planTitle: plan.title,
      planTopic: plan.topic,
      planSummary: (plan as { summary: string | null }).summary,
      week: { weekNumber: week.weekNumber, theme: week.theme, goal: week.goal, deliverable: week.deliverable },
      session,
      displayName: profile.display_name ?? null,
      studyFocus: profile.study_focus ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate session content'
    const timedOut =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('aborted') ||
      (error instanceof Error && error.name === 'AbortError')
    console.error('[curriculum.session.generate] generation failed:', error)
    return NextResponse.json(
      { error: timedOut ? 'Session generation took too long. Try again in a moment.' : message },
      { status: timedOut ? 504 : 500 }
    )
  }

  const { data: stored, error: upsertError } = await admin
    .from('curriculum_session_content')
    .upsert(
      {
        curriculum_plan_id: plan.id,
        user_id: profile.id,
        week_number: weekNumber,
        session_order: sessionOrder,
        body: generated.body,
        exercises: generated.exercises,
        reflection_prompt: generated.reflectionPrompt,
        model: generated.model,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'curriculum_plan_id,week_number,session_order' }
    )
    .select('id, body, exercises, reflection_prompt, model, generated_at, updated_at, week_number, session_order, curriculum_plan_id')
    .single()

  if (upsertError || !stored) {
    const rawMessage = upsertError?.message || 'Failed to save session content'
    const relationMissing =
      rawMessage.toLowerCase().includes('relation') &&
      rawMessage.toLowerCase().includes('curriculum_session_content')
    console.error('[curriculum.session.generate] upsert failed:', upsertError)
    return NextResponse.json(
      {
        error: relationMissing
          ? 'The curriculum_session_content table is not in Supabase yet. Run migration 0024_curriculum_session_content.sql and try again.'
          : rawMessage,
      },
      { status: 500 }
    )
  }

  await recordUsage({
    userId: profile.id,
    feature: 'curriculum_session',
    model: CURRICULUM_SESSION_MODEL,
    messages: 1,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
  })

  return NextResponse.json({ content: stored, cached: false })
}
