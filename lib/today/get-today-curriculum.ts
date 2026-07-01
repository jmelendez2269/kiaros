import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'

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
  isToday: boolean
  daysAway: number
}

export type TodayCurriculumResult =
  | { status: 'sessions'; sessions: TodayCurriculumSession[] }
  | { status: 'none' }

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00`).getTime()
  const to = new Date(`${toISO}T12:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}

export async function getTodayCurriculum(date: string, supabaseUserId: string): Promise<TodayCurriculumResult> {
  const admin = createAdminSupabase()

  const { data: rows } = await admin
    .from('curriculum_sessions')
    .select('id, curriculum_plan_id, curriculum_title, title, description, session_type, estimated_minutes, week_number, scheduled_for, status')
    .eq('user_id', supabaseUserId)
    .gte('scheduled_for', date)
    .order('scheduled_for', { ascending: true })
    .order('session_order', { ascending: true })
    .limit(3)

  if (!rows || rows.length === 0) return { status: 'none' }

  return {
    status: 'sessions',
    sessions: rows.map((r) => ({
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
      isToday: r.scheduled_for === date,
      daysAway: daysBetween(date, r.scheduled_for),
    })),
  }
}
