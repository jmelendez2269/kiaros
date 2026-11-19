import Link from 'next/link'
import { K } from '@/components/almanac'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { addDays } from '@/lib/reflections/periods'
import { reflectionLine } from '@/lib/reflections/report-line'
import { hasReflectionAccess, memberSince } from '@/lib/reflections/service'
import { firstSentence, lastWeekOnToday, weekRangeLabel, weekReflectionHref } from '@/lib/reviews/year-timeline'

/**
 * Today: a quiet pointer to last week's reflection at the start of a new
 * week. It shows whether or not anything was written, since every week now
 * has at least its sky to read.
 */
export async function LastWeekTodayCard({ todayDate, profileId }: { todayDate: string; profileId: string }) {
  const start = lastWeekOnToday(todayDate)
  if (!start) return null
  const week = { start, end: addDays(start, 6) }

  let line: string | null = null
  try {
    const admin = createAdminSupabase()
    const [access, since, report, prefs] = await Promise.all([
      hasReflectionAccess(profileId),
      memberSince(profileId),
      admin.from('reflection_reports').select('status,revision,content,analysis').eq('user_id', profileId).eq('kind', 'week').eq('period_start', start).maybeSingle(),
      admin.from('reflection_preferences').select('evidence_revision').eq('user_id', profileId).maybeSingle(),
    ])
    // Not for a week that ended before the member joined.
    if (!access || (since && week.end < since)) return null
    const current = report.data && Number(report.data.revision) === Number(prefs.data?.evidence_revision ?? 0)
    line = current ? reflectionLine(report.data!) ?? null : null
  } catch {
    // Today must never fail over an optional card.
    return null
  }

  return (
    <Link
      href={weekReflectionHref(week)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 22,
        borderRadius: 16,
        border: `1px solid ${K.violetDim}66`,
        background: `linear-gradient(to right, ${K.violetDim}1a, transparent 70%), ${K.bg2}`,
        color: K.ink,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.violetDim }}>
        From Insights &middot; last week&rsquo;s look back &middot; {weekRangeLabel(week)}
      </span>
      <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 22, lineHeight: 1.3 }}>
        {line ? firstSentence(line, 180) : 'A look back at the sky you moved through, with whatever you shared woven in.'}
      </span>
      <span style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.copperHi }}>
        {line ? 'Read last week →' : 'Look back on last week →'}
      </span>
    </Link>
  )
}
