import { createServerSupabase } from '@/lib/supabase/server'
import { CurriculumWorkspace } from '@/components/curriculum/CurriculumWorkspace'
import type { CurriculumPlanRow, CurriculumPlanProgress } from '@/types/curriculum'

/** Total sessions across every week of a plan's generated curriculum. */
function countSessions(plan: CurriculumPlanRow): number {
  const weeks = plan.curriculum?.weeks
  if (!Array.isArray(weeks)) return 0
  return weeks.reduce((total, week) => total + (week.sessions?.length ?? 0), 0)
}

/**
 * Which week the user is actually standing in. Prefers elapsed calendar time
 * from the start date; falls back to the furthest week they've completed
 * something in, so an unscheduled plan still reads as in-motion.
 */
function deriveCurrentWeek(
  plan: CurriculumPlanRow,
  furthestCompletedWeek: number,
): number {
  if (plan.start_date) {
    const started = new Date(`${plan.start_date}T00:00:00Z`).getTime()
    if (Number.isFinite(started)) {
      const weeksElapsed = Math.floor((Date.now() - started) / (7 * 24 * 60 * 60 * 1000))
      return Math.min(Math.max(weeksElapsed + 1, 1), plan.duration_weeks || 1)
    }
  }
  return Math.min(Math.max(furthestCompletedWeek, 1), plan.duration_weeks || 1)
}

export default async function CurriculumPage() {
  const supabase = await createServerSupabase()

  const [profileRes, categoriesRes, plansRes, progressRes] = await Promise.all([
    supabase.from('user_profiles').select('study_focus').maybeSingle(),
    supabase.from('goal_categories').select('name').order('sort_order', { ascending: true }),
    supabase
      .from('curriculum_plans')
      .select(
        'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('curriculum_session_progress')
      .select('curriculum_plan_id, week_number, completed_at')
      .not('completed_at', 'is', null),
  ])

  const plans = (plansRes.data ?? []) as unknown as CurriculumPlanRow[]
  const goalNames = (categoriesRes.data ?? []).map((category) => category.name)

  const completedByPlan = new Map<string, { count: number; furthestWeek: number }>()
  for (const row of progressRes.data ?? []) {
    const planId = row.curriculum_plan_id as unknown as string
    const week = (row.week_number as unknown as number) ?? 0
    const current = completedByPlan.get(planId) ?? { count: 0, furthestWeek: 0 }
    completedByPlan.set(planId, {
      count: current.count + 1,
      furthestWeek: Math.max(current.furthestWeek, week),
    })
  }

  const progressByPlan: Record<string, CurriculumPlanProgress> = {}
  for (const plan of plans) {
    const completed = completedByPlan.get(plan.id) ?? { count: 0, furthestWeek: 0 }
    const totalSessions = countSessions(plan)
    progressByPlan[plan.id] = {
      completedSessions: Math.min(completed.count, totalSessions || completed.count),
      totalSessions,
      currentWeek: deriveCurrentWeek(plan, completed.furthestWeek),
    }
  }

  return (
    <CurriculumWorkspace
      initialPlans={plans}
      progressByPlan={progressByPlan}
      studyFocus={profileRes.data?.study_focus ?? null}
      goalNames={goalNames}
    />
  )
}
