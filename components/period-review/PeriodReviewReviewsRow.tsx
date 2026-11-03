'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { K } from '@/components/almanac'
import { periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { usePeriodReview } from './PeriodReviewProvider'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ChipState = { index: number; cached: boolean; ended: boolean }

export function PeriodReviewReviewsRow({ planYear, label = 'Reviews' }: { planYear: number; label?: string }) {
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

  function onChip(kind: PeriodReviewKind, index: number, ended: boolean) {
    if (!ended) return
    openPeriodReview(kind, planYear, index)
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
        {label}
      </div>
      <div className="period-review-reviews-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {months.map((m) => (
          <button
            key={`m-${m.index}`}
            type="button"
            disabled={!m.ended}
            aria-disabled={!m.ended}
            onClick={() => onChip('month', m.index, m.ended)}
            style={chipStyle(m.cached, m.ended)}
          >
            {MONTH_SHORT[m.index - 1]}
          </button>
        ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {quarters.map((q) => (
          <button
            key={`q-${q.index}`}
            type="button"
            disabled={!q.ended}
            aria-disabled={!q.ended}
            onClick={() => onChip('quarter', q.index, q.ended)}
            style={chipStyle(q.cached, q.ended)}
          >
            Q{q.index}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}

function chipStyle(filled: boolean, ended: boolean): CSSProperties {
  if (!ended) {
    return {
      fontFamily: K.fMono,
      fontSize: 11,
      letterSpacing: '0.06em',
      padding: '6px 12px',
      borderRadius: 999,
      cursor: 'not-allowed',
      background: 'transparent',
      color: '#A4A3B1',
      border: '1px dashed #6E6D7C',
    }
  }
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
