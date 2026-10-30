import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { isJournalConsentV2Enabled } from '@/lib/feature-flags'
import { loadBlueprintForYear } from '@/lib/blueprint/load'
import { summarizeSkyForPeriod } from './sky-for-period'
import { quarterForMonth, type PeriodReviewPeriod } from './periods'
import type { PeriodSkySummary } from './sky-for-period'

export interface PeriodReviewSourceBundle {
  period: PeriodReviewPeriod
  displayName: string
  sky: PeriodSkySummary
  planTasksCompleted: { title: string; date: string }[]
  planTasksOpen: { title: string; date: string }[]
  planTasksTotal: number
  dailyLogDays: number
  goalsActive: number
  goalsCompletedInPeriod: number
  journalEntryCount: number
  journalExcerpts: string[]
  quarterBlueprintTheme: string | null
  monthBlueprintTheme: string | null
}

export async function loadPeriodReviewSources(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewSourceBundle> {
  const admin = createAdminSupabase()
  const consentV2 = isJournalConsentV2Enabled()

  const [
    profileRes,
    blueprint,
    dailyLogsRes,
    planItemsRes,
    goalsActiveRes,
    goalsCompletedRes,
    journalRes,
    ephemerisRes,
  ] = await Promise.all([
    admin.from('user_profiles').select('display_name').eq('id', userId).maybeSingle(),
    loadBlueprintForYear(userId, period.planYear, false),
    admin
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', userId)
      .gte('log_date', period.periodStart)
      .lte('log_date', period.periodEnd),
    admin
      .from('plan_items')
      .select('title, item_date, completed_at')
      .eq('user_id', userId)
      .gte('item_date', period.periodStart)
      .lte('item_date', period.periodEnd)
      .order('item_date', { ascending: true }),
    admin
      .from('area_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
    admin
      .from('area_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('updated_at', `${period.periodStart}T00:00:00Z`)
      .lte('updated_at', `${period.periodEnd}T23:59:59Z`),
    (() => {
      let q = admin
        .from('journal_entries')
        .select('body, entry_date')
        .eq('user_id', userId)
        .gte('entry_date', period.periodStart)
        .lte('entry_date', period.periodEnd)
        .order('entry_date', { ascending: false })
        .limit(12)
      if (consentV2) q = q.eq('include_in_insights', true)
      return q
    })(),
    admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', userId)
      .eq('year', period.planYear)
      .maybeSingle(),
  ])

  const ephemeris = (ephemerisRes.data?.data ?? null) as import('@/types/blueprint').YearEphemeris | null
  const sky = summarizeSkyForPeriod(ephemeris, period)

  const planRows = planItemsRes.data ?? []
  const completedTasks = planRows
    .filter((r) => r.completed_at)
    .map((r) => ({ title: r.title, date: r.item_date }))
    .slice(0, 24)
  const openTasks = planRows
    .filter((r) => !r.completed_at)
    .map((r) => ({ title: r.title, date: r.item_date }))
    .slice(0, 24)

  const journalRows = journalRes.data ?? []
  const journalExcerpts = journalRows
    .map((row) => {
      const body = typeof row.body === 'string' ? row.body.trim() : ''
      if (!body) return null
      return body.length > 320 ? `${body.slice(0, 317)}…` : body
    })
    .filter((v): v is string => Boolean(v))

  const monthBlueprint =
    period.kind === 'month'
      ? blueprint?.blueprint.months.find((m) => m.month === period.index)
      : null
  const quarterBlueprint = blueprint?.blueprint.quarters.find((q) =>
    period.kind === 'quarter' ? q.quarter === period.index : q.quarter === quarterForMonth(period.index),
  )

  const uniqueLogDays = new Set((dailyLogsRes.data ?? []).map((r) => r.log_date))

  return {
    period,
    displayName: profileRes.data?.display_name ?? 'there',
    sky,
    planTasksCompleted: completedTasks,
    planTasksOpen: openTasks,
    planTasksTotal: planRows.length,
    dailyLogDays: uniqueLogDays.size,
    goalsActive: goalsActiveRes.count ?? 0,
    goalsCompletedInPeriod: goalsCompletedRes.count ?? 0,
    journalEntryCount: journalRows.length,
    journalExcerpts,
    quarterBlueprintTheme: quarterBlueprint?.theme ?? null,
    monthBlueprintTheme: monthBlueprint?.theme ?? null,
  }
}

export async function countPeriodJournalEntries(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<number> {
  const admin = createAdminSupabase()
  const consentV2 = isJournalConsentV2Enabled()
  let q = admin
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('entry_date', period.periodStart)
    .lte('entry_date', period.periodEnd)
  if (consentV2) q = q.eq('include_in_insights', true)
  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

