import { createServerSupabase } from '@/lib/supabase/server'
import { CurriculumWorkspace } from '@/components/curriculum/CurriculumWorkspace'
import type { CurriculumPlanRow } from '@/types/curriculum'

export default async function CurriculumPage() {
  const supabase = await createServerSupabase()

  const [profileRes, categoriesRes, plansRes] = await Promise.all([
    supabase.from('user_profiles').select('study_focus').maybeSingle(),
    supabase.from('goal_categories').select('name').order('sort_order', { ascending: true }),
    supabase
      .from('curriculum_plans')
      .select(
        'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
      )
      .order('created_at', { ascending: false }),
  ])

  const plans = (plansRes.data ?? []) as unknown as CurriculumPlanRow[]
  const goalNames = (categoriesRes.data ?? []).map((category) => category.name)

  return (
    <CurriculumWorkspace
      initialPlans={plans}
      studyFocus={profileRes.data?.study_focus ?? null}
      goalNames={goalNames}
    />
  )
}
