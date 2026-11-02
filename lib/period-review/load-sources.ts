import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { loadBlueprintForYear } from '@/lib/blueprint/load'
import { summarizeSkyForPeriod } from './sky-for-period'
import { quarterForMonth, type PeriodReviewPeriod } from './periods'
import type { PeriodSkySummary } from './sky-for-period'

function sampleEntriesEvenly<T extends { entry_date: string; body: string }>(
  entries: T[],
  period: PeriodReviewPeriod,
  maxSamples: number,
): Array<{ date: string; excerpt: string }> {
  if (entries.length === 0) return []
  if (entries.length <= maxSamples) {
    return entries.map((e) => ({
      date: e.entry_date,
      excerpt: e.body.trim().length > 600 ? `${e.body.trim().slice(0, 597)}…` : e.body.trim(),
    }))
  }

  const bucketCount = period.kind === 'month' ? 4 : period.kind === 'quarter' ? 3 : 12
  const buckets: T[][] = Array.from({ length: bucketCount }, () => [])

  const periodStart = new Date(period.periodStart)
  const periodEnd = new Date(period.periodEnd)
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const bucketDays = totalDays / bucketCount

  for (const entry of entries) {
    const entryDate = new Date(entry.entry_date)
    const dayOffset = Math.ceil((entryDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const bucketIdx = Math.min(Math.floor(dayOffset / bucketDays), bucketCount - 1)
    buckets[bucketIdx].push(entry)
  }

  const samplesPerBucket = Math.floor(maxSamples / bucketCount)
  const remainder = maxSamples % bucketCount

  const sampled: T[] = []
  for (let i = 0; i < bucketCount; i++) {
    const bucket = buckets[i]
    if (bucket.length === 0) continue
    const takeCo = samplesPerBucket + (i < remainder ? 1 : 0)
    const step = bucket.length / takeCo
    for (let j = 0; j < takeCo && j < bucket.length; j++) {
      const idx = Math.floor(j * step)
      sampled.push(bucket[idx])
    }
  }

  return sampled
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({
      date: e.entry_date,
      excerpt: e.body.trim().length > 600 ? `${e.body.trim().slice(0, 597)}…` : e.body.trim(),
    }))
}

export interface CheckInSummary {
  date: string
  mood?: string | null
  energy?: number | null
}

export interface PeriodReviewSourceBundle {
  period: PeriodReviewPeriod
  displayName: string
  sky: PeriodSkySummary
  planTasksCompleted: { title: string; date: string }[]
  planTasksOpen: { title: string; date: string }[]
  planTasksCompletedCount: number
  planTasksOpenCount: number
  planTasksTotal: number
  dailyLogDays: number
  checkIns: CheckInSummary[]
  goalsActive: number
  goalsCompletedInPeriod: number
  goalsCompletedApproximate: boolean
  intentions: string[]
  journalEntryCount: number
  journalExcerpts: Array<{ date: string; excerpt: string }>
  quarterBlueprintTheme: string | null
  monthBlueprintTheme: string | null
}

export async function loadPeriodReviewSources(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<PeriodReviewSourceBundle> {
  const admin = createAdminSupabase()

  const [
    profileRes,
    blueprint,
    dailyLogsRes,
    checkInsRes,
    planItemsRes,
    goalsActiveRes,
    goalsCompletedRes,
    goalsCompletedWithDateRes,
    journalRes,
    journalCountRes,
    intentionsRes,
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
      .from('daily_logs')
      .select('log_date, mood_tag, energy_level')
      .eq('user_id', userId)
      .gte('log_date', period.periodStart)
      .lte('log_date', period.periodEnd)
      .order('log_date', { ascending: true }),
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
    admin
      .from('area_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', `${period.periodStart}T00:00:00Z`)
      .lte('completed_at', `${period.periodEnd}T23:59:59Z`),
    admin
      .from('journal_entries')
      .select('body, entry_date')
      .eq('user_id', userId)
      .eq('include_in_insights', true)
      .gte('entry_date', period.periodStart)
      .lte('entry_date', period.periodEnd)
      .order('entry_date', { ascending: true }),
    admin
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('include_in_insights', true)
      .gte('entry_date', period.periodStart)
      .lte('entry_date', period.periodEnd),
    admin
      .from('reflection_intentions')
      .select('text')
      .eq('user_id', userId)
      .gte('created_at', `${period.periodStart}T00:00:00Z`)
      .lte('created_at', `${period.periodEnd}T23:59:59Z`)
      .order('created_at', { ascending: true }),
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
  const planTasksCompletedCount = planRows.filter((r) => r.completed_at).length
  const planTasksOpenCount = planRows.filter((r) => !r.completed_at).length
  const completedTasks = planRows
    .filter((r) => r.completed_at)
    .map((r) => ({ title: r.title, date: r.item_date }))
    .slice(0, 24)
  const openTasks = planRows
    .filter((r) => !r.completed_at)
    .map((r) => ({ title: r.title, date: r.item_date }))
    .slice(0, 24)

  const checkInsRaw = checkInsRes.data ?? []
  const checkIns: CheckInSummary[] = checkInsRaw.map((r) => ({
    date: r.log_date,
    mood: r.mood_tag,
    energy: r.energy_level,
  }))

  const journalRows = journalRes.data ?? []
  const journalExcerpts = sampleEntriesEvenly(journalRows, period, 12)

  const intentionsRaw = intentionsRes.data ?? []
  const intentions = intentionsRaw.map((r) => r.text)

  const monthBlueprint =
    period.kind === 'month'
      ? blueprint?.blueprint.months.find((m) => m.month === period.index)
      : null
  const quarterBlueprint = blueprint?.blueprint.quarters.find((q) =>
    period.kind === 'quarter' ? q.quarter === period.index : q.quarter === quarterForMonth(period.index),
  )

  const uniqueLogDays = new Set((dailyLogsRes.data ?? []).map((r) => r.log_date))
  const journalEntryCount = journalCountRes.count ?? journalRows.length

  const goalsCompletedWithDate = goalsCompletedWithDateRes.count ?? 0
  const goalsCompletedWithUpdated = goalsCompletedRes.count ?? 0
  const goalsCompletedInPeriod = goalsCompletedWithDate > 0 ? goalsCompletedWithDate : goalsCompletedWithUpdated
  const goalsCompletedApproximate = goalsCompletedWithDate === 0 && goalsCompletedWithUpdated > 0

  return {
    period,
    displayName: profileRes.data?.display_name ?? 'there',
    sky,
    planTasksCompleted: completedTasks,
    planTasksOpen: openTasks,
    planTasksCompletedCount,
    planTasksOpenCount,
    planTasksTotal: planRows.length,
    dailyLogDays: uniqueLogDays.size,
    checkIns,
    goalsActive: goalsActiveRes.count ?? 0,
    goalsCompletedInPeriod,
    goalsCompletedApproximate,
    intentions,
    journalEntryCount,
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
  const { count, error } = await admin
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('include_in_insights', true)
    .gte('entry_date', period.periodStart)
    .lte('entry_date', period.periodEnd)
  if (error) return 0
  return count ?? 0
}

