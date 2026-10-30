'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { K } from '@/components/almanac'
import { periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { usePeriodReview } from './PeriodReviewProvider'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ChipState = { index: number; cached: boolean }

export function PeriodReviewReviewsRow({ planYear }: { planYear: number }) {
  const { openPeriodReview, statusNonce } = usePeriodReview()
  const [months, setMonths] = useState<ChipState[]>([])
  const [quarters, setQuarters] = useState<ChipState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/period-review/status?planYear=${planYear}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setMonths(data.months ?? [])
        setQuarters(data.quarters ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [planYear, statusNonce])

  if (loading) return null

  function onChip(kind: PeriodReviewKind, index: number, cached: boolean) {
    openPeriodReview(kind, planYear, index, { autoGenerate: !cached })
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <div
        style={{
          fontFamily: K.fMono,
          fontSize: 10,
          letterSpacing: '0.16em',
          color: '#A4A3B1',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Reviews
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {months.map((m) => (
          <button
            key={`m-${m.index}`}
            type="button"
            onClick={() => onChip('month', m.index, m.cached)}
            style={chipStyle(m.cached)}
          >
            {MONTH_SHORT[m.index - 1]}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'rgba(164,163,177,0.35)', margin: '0 4px' }} aria-hidden />
        {quarters.map((q) => (
          <button
            key={`q-${q.index}`}
            type="button"
            onClick={() => onChip('quarter', q.index, q.cached)}
            style={chipStyle(q.cached)}
          >
            Q{q.index}
          </button>
        ))}
      </div>
    </div>
  )
}

function chipStyle(filled: boolean): CSSProperties {
  return {
    fontFamily: K.fMono,
    fontSize: 11,
    letterSpacing: '0.06em',
    padding: '6px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    background: filled ? '#A98AEF' : 'transparent',
    color: filled ? '#0A0C14' : '#A4A3B1',
    border: filled ? '1px solid #A98AEF' : '1px solid rgba(164,163,177,0.45)',
  }
}
