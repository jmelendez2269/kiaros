'use client'

import Link from 'next/link'
import { periodReviewHref, periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { todayCardButtonLabel } from '@/lib/period-review/copy'
import { K, Kicker } from '@/components/almanac'

export function PeriodReviewLookBackLinks({
  kind,
  planYear,
  selectedIndex,
}: {
  kind: PeriodReviewKind
  planYear: number
  selectedIndex: number
}) {
  const period = periodFor(kind, planYear, selectedIndex)
  const href = periodReviewHref(kind, planYear, selectedIndex)

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${K.brick}44`,
        background: `${K.bg3}`,
      }}
    >
      <Kicker color={K.copper}>Period review</Kicker>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          marginTop: 10,
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
    </div>
  )
}
