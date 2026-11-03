import 'server-only'

import { K, Kicker } from '@/components/almanac'
import { addDays } from '@/lib/sky-cycles/detect'
import { journalHrefFor, phaseLabel, stelloquyPromptFor } from '@/lib/sky-cycles/copy'
import { loadCyclesInRange } from '@/lib/sky-cycles/load'
import { statusForListing } from '@/lib/sky-cycles/status'
import type { SkyCycleStatus } from '@/lib/sky-cycles/types'
import { SkyCycleActions } from './SkyCycleActions'

function Row({ status, withActions }: { status: SkyCycleStatus; withActions: boolean }) {
  const { cycle } = status
  return (
    <li style={{ borderLeft: `2px solid ${cycle.scope === 'personal' ? K.copper : K.violetDim}`, paddingLeft: 12 }}>
      <div style={{ fontSize: 15, color: K.ink }}>
        {cycle.title}
        {cycle.scope === 'personal' ? <span style={{ color: K.inkDim, fontSize: 12 }}> · your chart</span> : null}
      </div>
      <div style={{ fontSize: 13, color: K.inkDim, marginTop: 2 }}>
        {cycle.subtitle}
        {status.phase !== 'ended' ? ` · ${phaseLabel(status)}` : ''}
      </div>
      {withActions ? (
        <SkyCycleActions
          phase={status.phase}
          stelloquyPrompt={stelloquyPromptFor(status)}
          journalHref={journalHrefFor(status)}
        />
      ) : null}
    </li>
  )
}

/** Reviews page: this year's sky cycles, with a look back for the ones that ended. */
export async function SkyCyclesYearList({ profileId, today }: { profileId: string; today: string }) {
  let statuses: SkyCycleStatus[]
  try {
    const year = today.slice(0, 4)
    const cycles = await loadCyclesInRange(profileId, `${year}-01-01`, addDays(today, 60), today)
    statuses = cycles.map((c) => statusForListing(c, today))
  } catch (error) {
    console.error('[reviews] sky cycles unavailable:', error)
    return null
  }

  const now = statuses.filter((s) => s.phase !== 'ended')
  const past = statuses.filter((s) => s.phase === 'ended').reverse()

  return (
    <div>
      <Kicker color={K.violetDim}>Sky cycles</Kicker>
      <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: K.inkDim }}>
        Retrogrades, eclipses, seasons, slow planets changing sign, and the slow transits to your own chart. Each one
        gets a heads-up on Today, and a look back when it ends.
      </p>
      {now.length > 0 ? (
        <>
          <h3 style={{ margin: '18px 0 10px', fontSize: 13, fontFamily: K.fMono, letterSpacing: '0.12em', textTransform: 'uppercase', color: K.inkDim }}>
            Now and coming up
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
            {now.map((s) => (
              <Row key={s.cycle.id} status={s} withActions={s.phase === 'active'} />
            ))}
          </ul>
        </>
      ) : null}
      {past.length > 0 ? (
        <>
          <h3 style={{ margin: '22px 0 10px', fontSize: 13, fontFamily: K.fMono, letterSpacing: '0.12em', textTransform: 'uppercase', color: K.inkDim }}>
            Earlier this year
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
            {past.map((s) => (
              <Row key={s.cycle.id} status={s} withActions />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
