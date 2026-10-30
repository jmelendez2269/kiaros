'use client'

import Link from 'next/link'
import { Frame, K, Kicker } from '@/components/almanac'
import { periodReviewHref, periodLabel, type PeriodReviewPeriod } from '@/lib/period-review/periods'

interface Props {
  period: PeriodReviewPeriod
  promoCopy: string
}

export function PeriodReviewTodayCard({ period, promoCopy }: Props) {
  const href = periodReviewHref(period.kind, period.planYear, period.index)
  const title = period.kind === 'month' ? `${periodLabel(period)} review` : `${periodLabel(period)} review`

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
        {title}
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
        {promoCopy}
      </p>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          marginTop: 14,
          fontFamily: K.fMono,
          fontSize: 11,
          letterSpacing: '0.16em',
          color: K.copperHi,
          textDecoration: 'underline',
          textUnderlineOffset: 4,
        }}
      >
        OPEN REVIEW
      </Link>
    </Frame>
  )
}
