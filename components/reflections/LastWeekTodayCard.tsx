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
    <div
      style={{
        border: '1px solid rgba(164,163,177,0.45)',
        borderLeft: '3px solid #A98AEF',
        background: '#0A0C14',
        borderRadius: 4,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: '#A98AEF', textTransform: 'uppercase' }}>
        Last week · {weekRangeLabel(week)}
      </div>
      <p style={{ margin: 0, fontFamily: K.fBody, fontSize: 13, color: '#A4A3B1', lineHeight: 1.45 }}>
        {line ? firstSentence(line, 180) : 'A look back at the sky you moved through, with whatever you shared woven in.'}
      </p>
      <Link
        href={weekReflectionHref(week)}
        style={{
          alignSelf: 'flex-start',
          fontFamily: K.fMono,
          fontSize: 11,
          letterSpacing: '0.08em',
          padding: '10px 14px',
          borderRadius: 999,
          background: '#A98AEF',
          color: '#0A0C14',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {line ? 'Read last week' : 'Look back on last week'}
      </Link>
    </div>
  )
}
