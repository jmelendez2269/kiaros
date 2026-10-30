'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { K } from '@/components/almanac'
import { todayCardButtonLabel, todayCardLabel, todayCardSubline } from '@/lib/period-review/copy'
import { dismissPeriodReviewPromo, isPeriodReviewDismissed } from '@/lib/period-review/dismiss-storage'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import { usePeriodReview } from './PeriodReviewProvider'

interface CardProps {
  period: PeriodReviewPeriod
  lookBackHref: string
  showEarlierLink: boolean
}

export function PeriodReviewTodayCard({ period, lookBackHref, showEarlierLink }: CardProps) {
  const { openPeriodReview } = usePeriodReview()
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(isPeriodReviewDismissed(period))
    setHydrated(true)
  }, [period])

  if (!hydrated || dismissed) return null

  return (
    <div
      className="period-review-promo-card"
      style={{
        border: '1px solid rgba(164,163,177,0.45)',
        borderLeft: '3px solid #DF9B3F',
        background: '#0A0C14',
        borderRadius: 4,
        padding: '12px 14px',
        minHeight: 96,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
    >
      <button
        type="button"
        aria-label="Not now"
        onClick={() => {
          dismissPeriodReviewPromo(period)
          setDismissed(true)
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'none',
          border: 'none',
          color: '#A4A3B1',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>

      <div
        className="period-review-promo-card__row"
        style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 28 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: K.fMono,
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#A98AEF',
              textTransform: 'uppercase',
            }}
          >
            {todayCardLabel(period)}
          </div>
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: K.fBody,
              fontSize: 13,
              color: '#A4A3B1',
              lineHeight: 1.45,
            }}
          >
            {todayCardSubline(period)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openPeriodReview(period.kind, period.planYear, period.index)}
          style={{
            alignSelf: 'flex-start',
            fontFamily: K.fMono,
            fontSize: 11,
            letterSpacing: '0.08em',
            padding: '10px 14px',
            borderRadius: 999,
            border: 'none',
            background: '#A98AEF',
            color: '#0A0C14',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {todayCardButtonLabel(period)}
        </button>
      </div>

      {showEarlierLink ? (
        <Link
          href={lookBackHref}
          style={{
            fontFamily: K.fBody,
            fontSize: 12,
            color: '#A4A3B1',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          See earlier months
        </Link>
      ) : null}

      <style jsx>{`
        @media (min-width: 1440px) {
          .period-review-promo-card__row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .period-review-promo-card__row button {
            align-self: center;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  )
}
