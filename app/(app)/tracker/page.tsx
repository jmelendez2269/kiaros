import { createServerSupabase } from '@/lib/supabase/server'
import { TrackerView } from '@/components/tracker/TrackerView'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { todayISO } from '@/lib/today/get-today-context'

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createServerSupabase()
  const today = todayISO()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10)

  const [metricsRes, todayLogRes, recentLogsRes, categoriesRes, todayPlanItemsRes, todayCurriculumRes] =
    await Promise.all([
      supabase
        .from('tracker_metrics')
        .select('*, goal_categories(id, name, color_key, icon_key)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('daily_logs').select('*').eq('log_date', today).maybeSingle(),
      supabase
        .from('daily_logs')
        .select('*')
        .gte('log_date', fromDate)
        .lte('log_date', today)
        .order('log_date', { ascending: true }),
      supabase.from('goal_categories').select('id, name').order('sort_order', { ascending: true }),
      supabase
        .from('plan_items')
        .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, user_id, start_minute, duration_minutes, area_goal_id, source')
        .eq('item_date', today)
        .order('sort_order', { ascending: true }),
      supabase
        .from('curriculum_sessions')
        .select(
          'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
        )
        .eq('scheduled_for', today),
    ])

  return (
    <TrackerView
      metrics={metricsRes.data ?? []}
      todayLog={todayLogRes.data}
      recentLogs={recentLogsRes.data ?? []}
      today={today}
      filterCategoryId={category}
      goalCategories={categoriesRes.data ?? []}
      todayPlanItems={todayPlanItemsRes.data ?? []}
      todayCurriculumSessions={(todayCurriculumRes.data ?? []) as CurriculumSessionRow[]}
    />
  )
}
