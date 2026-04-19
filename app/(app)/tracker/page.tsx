import { createServerSupabase } from '@/lib/supabase/server'
import { TrackerView } from '@/components/tracker/TrackerView'

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createServerSupabase()
  const today = new Date().toISOString().slice(0, 10)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10)

  const [metricsRes, todayLogRes, recentLogsRes] = await Promise.all([
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
  ])

  return (
    <TrackerView
      metrics={metricsRes.data ?? []}
      todayLog={todayLogRes.data}
      recentLogs={recentLogsRes.data ?? []}
      today={today}
      filterCategoryId={category}
    />
  )
}
