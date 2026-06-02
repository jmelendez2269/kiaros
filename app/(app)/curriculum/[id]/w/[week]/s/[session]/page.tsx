import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { CurriculumSessionView } from '@/components/curriculum/CurriculumSessionView'
import type {
  CurriculumDraft,
  CurriculumPlanRow,
  CurriculumSessionContentRow,
} from '@/types/curriculum'

interface PageParams {
  id: string
  week: string
  session: string
}

export default async function CurriculumSessionPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id, week: weekRaw, session: sessionRaw } = await params
  const weekNumber = Number(weekRaw)
  const sessionOrder = Number(sessionRaw)
  if (!Number.isInteger(weekNumber) || !Number.isInteger(sessionOrder) || weekNumber < 1 || sessionOrder < 1) {
    notFound()
  }

  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const { data: plan, error } = await supabase
    .from('curriculum_plans')
    .select(
      'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !plan) {
    notFound()
  }

  const typedPlan = plan as unknown as CurriculumPlanRow
  const draft = typedPlan.curriculum as CurriculumDraft
  const week = draft.weeks.find((w) => w.weekNumber === weekNumber)
  const session = week?.sessions[sessionOrder - 1]

  if (!week || !session) {
    notFound()
  }

  // RLS already filtered by ownership above; admin client is fine for the
  // content read since we've proven plan access.
  const [{ data: contentRow }, { data: progressRow }] = await Promise.all([
    admin
      .from('curriculum_session_content')
      .select('id, body, exercises, reflection_prompt, model, generated_at, updated_at, week_number, session_order, curriculum_plan_id')
      .eq('curriculum_plan_id', typedPlan.id)
      .eq('week_number', weekNumber)
      .eq('session_order', sessionOrder)
      .maybeSingle(),
    admin
      .from('curriculum_session_progress')
      .select('completed_at')
      .eq('curriculum_plan_id', typedPlan.id)
      .eq('week_number', weekNumber)
      .eq('session_order', sessionOrder)
      .maybeSingle(),
  ])

  const initialContent = contentRow
    ? ({
        id: contentRow.id,
        curriculum_plan_id: contentRow.curriculum_plan_id,
        week_number: contentRow.week_number,
        session_order: contentRow.session_order,
        body: contentRow.body,
        exercises: Array.isArray(contentRow.exercises) ? contentRow.exercises : [],
        reflectionPrompt: contentRow.reflection_prompt ?? null,
        model: contentRow.model,
        generated_at: contentRow.generated_at,
        updated_at: contentRow.updated_at,
      } as CurriculumSessionContentRow)
    : null

  return (
    <CurriculumSessionView
      plan={typedPlan}
      week={week}
      session={session}
      sessionOrder={sessionOrder}
      initialContent={initialContent}
      initialCompletedAt={progressRow?.completed_at ?? null}
    />
  )
}
