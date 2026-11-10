import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { checkInRhythms, describePhaseRhythm, type CheckInRow } from '@/lib/insights/check-in-rhythms'

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

  return (
    <section aria-labelledby="check-in-rhythms" className="channel-mine channel-panel space-y-4 px-6 py-6 md:px-7">
      <header>
        <p className="channel-kicker">From your check-ins</p>
        <h2 id="check-in-rhythms" className="mt-1.5 font-display text-[1.45rem] leading-tight text-bone">Under each moon</h2>
      </header>

      {rhythms.toGo > 0 ? (
        <p className="text-sm leading-7 text-bone-muted">
          {rhythms.total} {rhythms.total === 1 ? 'check-in' : 'check-ins'} so far. After about {rhythms.toGo} more, this
          begins to show how your energy and mood have sat under each moon phase.{' '}
          <Link href="/today" className="text-bone underline underline-offset-4">Check in on Today</Link>
        </p>
      ) : rhythms.phases.length ? (
        <>
          <p className="text-sm text-bone-muted">
            {rhythms.usualEnergyWord ? `Your usual energy sits around ${rhythms.usualEnergyWord}. ` : ''}
            An observation from {rhythms.total} check-ins, not a rule.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2" style={{ listStyle: 'none', padding: 0 }}>
            {rhythms.phases.map((rhythm) => (
              <li key={rhythm.phase} className="rounded-2xl border border-border/70 bg-stone-950/50 p-4">
                <p className="font-display text-[1.15rem] text-bone">{rhythm.phase} Moon</p>
                <p className="mt-1.5 text-sm leading-6 text-bone-muted">{describePhaseRhythm(rhythm)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{rhythm.checkIns} check-ins</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm leading-7 text-bone-muted">
          {rhythms.total} check-ins so far, and no moon phase stands apart from your usual yet. That is a finding too: it
          fills in as the moon comes round again.
        </p>
      )}
    </section>
  )
}
