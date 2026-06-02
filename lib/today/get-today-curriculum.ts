import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'

export interface TodayCurriculumSession {
  id: string
  planId: string
  curriculumTitle: string
  title: string
  description: string | null
  sessionType: 'lesson' | 'practice' | 'review' | 'project'
  estimatedMinutes: number
  weekNumber: number
  scheduledFor: string
  status: 'scheduled' | 'done' | 'skipped'
}

export type TodayCurriculumResult =
  | { status: 'today'; sessions: TodayCurriculumSession[] }
  | { status: 'upcoming'; session: TodayCurriculumSession; daysAway: number }
  | { status: 'none' }

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00`).getTime()
  const to = new Date(`${toISO}T12:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}

/**
 * Returns today's scheduled curriculum sessions, or the next upcoming one if
 * today is empty. Sessions are scoped to approved (ready) plans via RLS —
 * draft/pending plans don't have sessions inserted yet.
 */
export async function getTodayCurriculum(date: string): Promise<TodayCurriculumResult> {
  const supabase = await createServerSupabase()

  const { data: todayRows } = await supabase
    .from('curriculum_sessions')
    .select('id, curriculum_plan_id, curriculum_title, title, description, session_type, estimated_minutes, week_number, scheduled_for, status')
    .eq('scheduled_for', date)
    .order('session_order', { ascending: true })

  if (todayRows && todayRows.length > 0) {
    return {
      status: 'today',
      sessions: todayRows.map((r) => ({
        id: r.id,
        planId: r.curriculum_plan_id,
        curriculumTitle: r.curriculum_title,
        title: r.title,
        description: r.description,
        sessionType: r.session_type as TodayCurriculumSession['sessionType'],
        estimatedMinutes: r.estimated_minutes,
        weekNumber: r.week_number,
        scheduledFor: r.scheduled_for,
        status: r.status as TodayCurriculumSession['status'],
      })),
    }
  }

  const { data: nextRow } = await supabase
    .from('curriculum_sessions')
    .select('id, curriculum_plan_id, curriculum_title, title, description, session_type, estimated_minutes, week_number, scheduled_for, status')
    .gt('scheduled_for', date)
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextRow) return { status: 'none' }

  return {
    status: 'upcoming',
    daysAway: daysBetween(date, nextRow.scheduled_for),
    session: {
      id: nextRow.id,
      planId: nextRow.curriculum_plan_id,
      curriculumTitle: nextRow.curriculum_title,
      title: nextRow.title,
      description: nextRow.description,
      sessionType: nextRow.session_type as TodayCurriculumSession['sessionType'],
      estimatedMinutes: nextRow.estimated_minutes,
      weekNumber: nextRow.week_number,
      scheduledFor: nextRow.scheduled_for,
      status: nextRow.status as TodayCurriculumSession['status'],
    },
  }
}
