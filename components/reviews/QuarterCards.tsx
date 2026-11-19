'use client'

import { K } from '@/components/almanac'
import { usePeriodReview } from '@/components/period-review/PeriodReviewProvider'
import type { QuarterCard } from '@/lib/reviews/quarter-cards'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase' } as const

/** The year's four quarters above the timeline. A closed quarter opens its review. */
export function QuarterCards({ cards, year }: { cards: QuarterCard[]; year: number }) {
  const { openPeriodReview } = usePeriodReview()
  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
      {cards.map((c) => {
        const body = (
          <>
            <span style={{ ...mono, color: c.current ? K.copperHi : K.inkDim }}>{c.range}{c.current ? ' · now' : ''}</span>
            <span style={{ fontSize: 13, color: K.inkDim }}>{c.status}</span>
            {c.openable ? <span style={{ ...mono, color: K.copperHi }}>Open review →</span> : null}
          </>
        )
        const style = {
          display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box', borderRadius: 16, padding: 20, textAlign: 'left', color: K.ink,
          border: `1px solid ${c.current ? `${K.copper}66` : K.line}`,
          background: c.current ? `linear-gradient(to right, ${K.copper}1a, transparent), ${K.bg2}` : K.bg2,
          opacity: c.status === 'Not yet' ? 0.6 : 1,
        } as const
        return c.openable ? (
          <button key={c.index} type="button" style={{ ...style, cursor: 'pointer' }} onClick={() => openPeriodReview('quarter', year, c.index)}>{body}</button>
        ) : (
          <div key={c.index} style={style}>{body}</div>
        )
      })}
    </div>
  )
}
