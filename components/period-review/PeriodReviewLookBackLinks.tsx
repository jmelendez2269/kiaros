'use client'

import Link from 'next/link'
import { periodReviewHref, periodLabel, periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
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
  const label = periodLabel(period)

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
      <p style={{ marginTop: 8, fontSize: 13, color: K.inkDim, lineHeight: 1.6 }}>
        TODO-STELLA: Generate or reopen the on-demand review for {label}.
      </p>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          marginTop: 10,
          fontFamily: K.fMono,
          fontSize: 11,
          letterSpacing: '0.14em',
          color: K.copperHi,
          textDecoration: 'underline',
          textUnderlineOffset: 4,
        }}
      >
        OPEN {kind === 'month' ? 'MONTH' : 'QUARTER'} REVIEW
      </Link>
    </div>
  )
}
