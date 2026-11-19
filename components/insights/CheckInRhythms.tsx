import Link from 'next/link'
import { K } from '@/components/almanac'
import { createServerSupabase } from '@/lib/supabase/server'
import { checkInRhythms, phaseOverview, type CheckInRow } from '@/lib/insights/check-in-rhythms'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase' } as const

/**
 * Patterns: how the member's daily check-ins have sat under each moon phase.
 * Read through their own row-level access. Renders nothing before their
 * first check-in, and never fails the page it sits on.
 */
export async function CheckInRhythms() {
  let rows: CheckInRow[] = []
  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('daily_logs')
      .select('log_date, energy_level, mood_tag, lunar_phase')
      .order('log_date', { ascending: false })
      .limit(400)
    if (error) return null
    rows = data ?? []
  } catch {
    return null
  }

  const rhythms = checkInRhythms(rows)
  if (rhythms.total === 0) return null
  const phases = phaseOverview(rows)

  return (
    <section aria-labelledby="check-in-rhythms" className="grid gap-4 rounded-2xl p-6" style={{ background: K.bg2, border: `1px solid ${K.sage}44` }}>
      <header className="grid gap-1.5">
        <span style={{ ...mono, color: K.stelloBlueSoft }}>From your check-ins</span>
        <h2 id="check-in-rhythms" style={{ margin: 0, fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 28 }}>Under each moon</h2>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 14, lineHeight: 1.65, color: K.inkDim }}>
          {rhythms.toGo > 0
            ? `${rhythms.total} ${rhythms.total === 1 ? 'check-in' : 'check-ins'} so far. After about ${rhythms.toGo} more, this begins to show how your energy and mood have sat in each phase.`
            : `How your energy and mood have tended to sit in each phase, from ${rhythms.total} check-ins.`}
          {' '}Days without a check-in are left out, never counted against you.
        </p>
      </header>

      <ul className="grid gap-2.5" style={{ listStyle: 'none', padding: 0, margin: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {phases.map((p) => (
          <li key={p.phase} className="grid gap-2.5 rounded-xl p-3.5" style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
            <div role="img" aria-label={p.energy === null ? `${p.phase}: still gathering` : `${p.phase}: energy about ${p.energy.toFixed(1)} of 5`} className="flex items-end" style={{ height: 56 }}>
              {p.energy === null ? (
                <div style={{ width: '100%', height: 2, borderTop: `1px dashed ${K.inkSoft}` }} />
              ) : (
                <div style={{ width: '45%', height: `${(p.energy / 5) * 100}%`, borderRadius: '3px 3px 0 0', background: K.copper }} />
              )}
            </div>
            <span style={{ fontSize: 13.5 }}>{p.phase}</span>
            {p.mood ? <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 15 }}>{p.mood}</span> : null}
            <span style={{ ...mono, fontSize: 11, color: K.ink }}>{p.verb} · {p.checkIns} {p.checkIns === 1 ? 'check-in' : 'check-ins'}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5" style={{ ...mono, fontSize: 11, color: K.ink }}>
          <span aria-hidden style={{ width: 10, height: 10, background: K.copper }} />Energy · a phase fills in after a few check-ins
        </span>
        <Link href="/today" style={{ ...mono, color: K.stelloBlueSoft, textDecoration: 'none' }}>Check in on today →</Link>
      </div>
    </section>
  )
}
