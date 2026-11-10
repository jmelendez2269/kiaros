import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { loadCachedPeriodReview, loadPeriodReviewCacheStatus } from '@/lib/period-review/cache'
import { cacheKey, periodFor } from '@/lib/period-review/periods'
import { loadCyclesInRange } from '@/lib/sky-cycles/load'
import { memberSince } from '@/lib/reflections/service'
import { reflectionLine } from '@/lib/reflections/report-line'
import {
  daysInYear,
  daysWrittenByMonth,
  dayOfYear,
  fallbackLine,
  firstSentence,
  reviewState,
  shortDay,
  skyGlyph,
  type TimelineMonth,
  type TimelineQuarter,
  type TimelineSkyEvent,
  type TimelineWeek,
  type YearTimeline,
  weeksStartingInYear,
} from './year-timeline'

/** Years from the member's first subscription (or this year) to now. */
export async function timelineYears(profileId: string, today: string): Promise<number[]> {
  const thisYear = Number(today.slice(0, 4))
  const since = await memberSince(profileId).catch(() => null)
  const first = Math.min(thisYear, since ? Number(since.slice(0, 4)) : thisYear)
  return Array.from({ length: thisYear - first + 1 }, (_, i) => first + i)
}

/** Everything the Reviews page needs for one calendar year. */
export async function loadYearTimeline(profileId: string, year: number, today: string, years: number[]): Promise<YearTimeline> {
  const admin = createAdminSupabase()
  const from = `${year}-01-01`, to = `${year}-12-31`
  const [cached, entries, cycles, yearReport, weekReports, prefs, since] = await Promise.all([
    loadPeriodReviewCacheStatus(profileId, year).catch(() => ({} as Record<string, true>)),
    admin.from('journal_entries').select('entry_date').eq('user_id', profileId).gte('entry_date', from).lte('entry_date', to),
    loadCyclesInRange(profileId, from, to, today).catch(() => []),
    admin.from('reflection_reports').select('status').eq('user_id', profileId).eq('kind', 'year').eq('period_start', from).maybeSingle(),
    admin.from('reflection_reports').select('period_start,status,revision,content,analysis').eq('user_id', profileId).eq('kind', 'week').gte('period_start', from).lte('period_start', to),
    admin.from('reflection_preferences').select('evidence_revision').eq('user_id', profileId).maybeSingle(),
    memberSince(profileId).catch(() => null),
  ])
  const revision = Number(prefs.data?.evidence_revision ?? 0)
  // Only a reflection that is current counts as prepared; one made stale by a later change reads as ready again.
  const weekLines = new Map<string, string | null>()
  for (const row of weekReports.data ?? []) {
    if (Number(row.revision) !== revision) continue
    const line = reflectionLine(row)
    if (line !== undefined) weekLines.set(String(row.period_start), line)
  }
  const weeks: TimelineWeek[] = weeksStartingInYear(year)
    // Nothing from before the member joined.
    .filter(w => !since || w.end >= since)
    .map(w => {
      const prepared = weekLines.has(w.start)
      const line = weekLines.get(w.start) ?? null
      return { ...w, state: reviewState(w.start, w.end, today, prepared), line: line ? firstSentence(line) : null }
    })
  const written = daysWrittenByMonth((entries.data ?? []).map(r => String(r.entry_date)), year)

  const months: TimelineMonth[] = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
    const period = periodFor('month', year, i + 1)
    const isCached = Boolean(cached[cacheKey(period)])
    const state = reviewState(period.periodStart, period.periodEnd, today, isCached)
    let line = fallbackLine(state, written[i], shortDay(period.periodEnd))
    let chips: string[] = []
    if (state === 'read') {
      const entry = await loadCachedPeriodReview(profileId, period).catch(() => null)
      const sections = entry?.sections
      // A thread that quoted the journal stays hidden once no entries are included, as in the review itself.
      const quotesJournal = (entry?.sourceChips?.journal?.length ?? 0) > 0
      const text = (quotesJournal && written[i] === 0 ? null : sections?.thread) ?? sections?.sky ?? entry?.summary
      if (text) line = firstSentence(text)
      chips = entry?.sourceChips ? [...entry.sourceChips.journal, ...entry.sourceChips.plans].slice(0, 4) : []
    }
    return { index: i + 1, start: period.periodStart, end: period.periodEnd, state, daysWritten: written[i], line, chips }
  }))

  const quarters: TimelineQuarter[] = Array.from({ length: 4 }, (_, i) => {
    const period = periodFor('quarter', year, i + 1)
    return { index: i + 1, start: period.periodStart, end: period.periodEnd, state: reviewState(period.periodStart, period.periodEnd, today, Boolean(cached[cacheKey(period)])) }
  })

  const sky: TimelineSkyEvent[] = cycles
    .filter(c => c.endDate >= from && c.startDate <= to)
    .map(c => ({
      id: c.id,
      kind: c.kind,
      personal: c.scope === 'personal',
      title: c.title,
      subtitle: c.subtitle,
      start: c.startDate,
      end: c.endDate,
      glyph: skyGlyph(c.kind, c.planet, c.aspect),
    }))

  const opensOn = `${year + 1}-01-01`
  const yearStatus = yearReport.data?.status
  const unwrapped = {
    state: to >= today ? 'waiting' as const : yearStatus === 'ready' || yearStatus === 'empty' ? 'read' as const : 'ready' as const,
    opensOn,
    daysToGo: to >= today ? daysInYear(year) - dayOfYear(today) + 1 : 0,
  }

  return { year, today, years, months, quarters, weeks, sky, unwrapped }
}
