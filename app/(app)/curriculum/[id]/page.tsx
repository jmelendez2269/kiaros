import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { CurriculumDetail } from '@/components/curriculum/CurriculumDetail'
import type {
  CurriculumPlanRow,
  CurriculumSessionProgressRow,
} from '@/types/curriculum'

export default async function CurriculumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const { data, error } = await supabase
    .from('curriculum_plans')
    .select(
      'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const plan = data as unknown as CurriculumPlanRow

  const { data: progressRows } = await admin
    .from('curriculum_session_progress')
    .select('id, curriculum_plan_id, week_number, session_order, completed_at, updated_at')
    .eq('curriculum_plan_id', plan.id)

  const progress = (progressRows ?? []) as CurriculumSessionProgressRow[]

  return <CurriculumDetail initialPlan={plan} initialProgress={progress} />
}
