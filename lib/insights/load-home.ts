import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { loadCachedPeriodReview } from '@/lib/period-review/cache'
import { latestClosedMonth, periodLabel } from '@/lib/period-review/periods'
import { addDays } from '@/lib/reflections/periods'
import { reflectionLine } from '@/lib/reflections/report-line'
import { memberSince } from '@/lib/reflections/service'
import { firstSentence, weekRangeLabel, weekReflectionHref } from '@/lib/reviews/year-timeline'
import type { YearEphemeris } from '@/types/blueprint'
import { brightestTheme, overheadPatterns, strongestPattern, type HomePattern, type HomeStar, type PatternRowForHome } from './home'

export interface InsightsHome {
  /** The week that most recently closed. null before the member's first full week. */
  week: { label: string; href: string; line: string | null } | null
  /** The month that most recently closed, when month look backs are on. */
  month: { label: string; href: string; line: string | null } | null
  /** The member's patterns whose sky is overhead today. */
  overhead: HomePattern[]
  /** Shown when nothing is overhead. */
  strongest: HomePattern | null
  patternCount: number
  /** null without Stelloquy access, or before any conversation is saved. */
  star: HomeStar | null
}

/** Each part is optional: one that cannot be read is left out, never an error page. */
export async function loadInsightsHome(profileId: string, today: string, opts: { monthLookBacks: boolean; mindMap: boolean }): Promise<InsightsHome> {
  const admin = createAdminSupabase()
  const sinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const weekStart = addDays(today, -sinceMonday - 7), weekEnd = addDays(weekStart, 6)
  const monthPeriod = latestClosedMonth(today)

  const [since, weekReport, prefs, monthEntry, patternsRes, ephemerisRes, topicsRes] = await Promise.all([
    memberSince(profileId).catch(() => null),
    admin.from('reflection_reports').select('status,revision,content,analysis').eq('user_id', profileId).eq('kind', 'week').eq('period_start', weekStart).maybeSingle(),
    admin.from('reflection_preferences').select('evidence_revision').eq('user_id', profileId).maybeSingle(),
    opts.monthLookBacks ? loadCachedPeriodReview(profileId, monthPeriod).catch(() => null) : null,
    admin.from('user_pattern_insights').select('pattern_type, pattern_key, sample_size').eq('user_id', profileId),
    admin.from('ephemeris_cache').select('data').eq('user_id', profileId).eq('year', Number(today.slice(0, 4))).maybeSingle(),
    opts.mindMap
      ? admin.from('capture_topics').select('capture_id, kind, label').eq('user_id', profileId).order('created_at', { ascending: false }).limit(5000)
      : null,
  ])

  const current = weekReport.data && Number(weekReport.data.revision) === Number(prefs.data?.evidence_revision ?? 0)
  const weekLine = current ? reflectionLine(weekReport.data!) ?? null : null
  const week = since && weekEnd < since ? null : {
    label: weekRangeLabel({ start: weekStart, end: weekEnd }),
    href: weekReflectionHref({ start: weekStart }),
    line: weekLine ? firstSentence(weekLine, 200) : null,
  }

  const monthText = monthEntry?.sections?.thread ?? monthEntry?.sections?.sky ?? null
  const month = !opts.monthLookBacks || (since && monthPeriod.periodEnd < since) ? null : {
    label: periodLabel(monthPeriod),
    href: `/reviews?year=${monthPeriod.planYear}&month=${monthPeriod.index}`,
    line: monthText ? firstSentence(monthText, 200) : null,
  }

  const patterns = (patternsRes.data ?? []) as PatternRowForHome[]
  const days = (ephemerisRes.data?.data as unknown as YearEphemeris | null)?.days
  const todayDay = Array.isArray(days) ? days.find((d) => d.date === today) : null

  return {
    week,
    month,
    overhead: overheadPatterns(patterns, todayDay),
    strongest: strongestPattern(patterns),
    patternCount: patterns.length,
    star: topicsRes?.data ? brightestTheme(topicsRes.data.map((t) => ({ capture_id: String(t.capture_id), kind: String(t.kind), label: String(t.label) }))) : null,
  }
}
