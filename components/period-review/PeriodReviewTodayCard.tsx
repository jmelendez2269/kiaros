'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Frame, K, Kicker } from '@/components/almanac'
import {
  todayCardButtonLabel,
  todayCardHeadline,
  todayCardSubline,
} from '@/lib/period-review/copy'
import { dismissPeriodReviewPromo, isPeriodReviewDismissed } from '@/lib/period-review/dismiss-storage'
import { periodReviewHref, type PeriodReviewPeriod } from '@/lib/period-review/periods'

interface CardProps {
  period: PeriodReviewPeriod
  lookBackHref: string
  showEarlierLink: boolean
}

export function PeriodReviewTodayCard({ period, lookBackHref, showEarlierLink }: CardProps) {
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(isPeriodReviewDismissed(period))
    setHydrated(true)
  }, [period])

  if (!hydrated || dismissed) return null

  const href = periodReviewHref(period.kind, period.planYear, period.index)

  return (
    <Frame tone="cocoa" padding={18}>
      <Kicker color={K.copperHi}>Period review</Kicker>
      <p
        style={{
          marginTop: 10,
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 18,
          color: K.ink,
          lineHeight: 1.45,
        }}
      >
        {todayCardHeadline(period)}
      </p>
      <p
        style={{
          marginTop: 8,
          fontFamily: K.fBody,
          fontSize: 13,
          color: K.inkDim,
          lineHeight: 1.6,
        }}
      >
        {todayCardSubline(period)}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 14 }}>
        <Link
          href={href}
          style={{
            fontFamily: K.fMono,
            fontSize: 11,
            letterSpacing: '0.12em',
            color: K.copperHi,
            textDecoration: 'underline',
            textUnderlineOffset: 4,
          }}
        >
          {todayCardButtonLabel(period)}
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissPeriodReviewPromo(period)
            setDismissed(true)
          }}
          style={{
            fontFamily: K.fBody,
            fontSize: 13,
            color: K.inkSoft,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Not now
        </button>
      </div>
      {showEarlierLink ? (
        <Link
          href={lookBackHref}
          style={{
            display: 'inline-block',
            marginTop: 14,
            fontFamily: K.fBody,
            fontSize: 12.5,
            color: K.inkDim,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          See earlier months
        </Link>
      ) : null}
    </Frame>
  )
}
