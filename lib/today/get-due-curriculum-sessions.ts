import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { CurriculumSessionRow } from '@/types/curriculum'

// Today's Plan checklist should show what's actually next, not just what
// calendar date a session happened to land on — a session only counts as
// due once everything before it in its plan is done, so falling behind
// never surfaces a mid-course session while Week 1 is still outstanding.
export async function getDueCurriculumSessions(supabaseUserId: string, date: string): Promise<CurriculumSessionRow[]> {
  const admin = createAdminSupabase()

  const { data: activePlans } = await admin
    .from('curriculum_plans')
    .select('id')
    .eq('user_id', supabaseUserId)
    .eq('status', 'approved')

  const activePlanIds = (activePlans ?? []).map((p) => p.id)
  if (activePlanIds.length === 0) return []

  const { data: rows } = await admin
    .from('curriculum_sessions')
    .select(
      'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
    )
    .eq('user_id', supabaseUserId)
    .eq('status', 'scheduled')
    .in('curriculum_plan_id', activePlanIds)
    .lte('scheduled_for', date)
    .order('scheduled_for', { ascending: true })
    .order('week_number', { ascending: true })
    .order('session_order', { ascending: true })

  if (!rows || rows.length === 0) return []

  const earliestPerPlan = new Map<string, CurriculumSessionRow>()
  for (const row of rows as CurriculumSessionRow[]) {
    if (!earliestPerPlan.has(row.curriculum_plan_id)) {
      earliestPerPlan.set(row.curriculum_plan_id, row)
    }
  }
  return Array.from(earliestPerPlan.values())
}
