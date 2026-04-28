import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { CurriculumDetail } from '@/components/curriculum/CurriculumDetail'
import type { CurriculumPlanRow } from '@/types/curriculum'

export default async function CurriculumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()

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

  return <CurriculumDetail initialPlan={plan} />
}
