'use client'

import type { PeriodReviewKind } from '@/lib/period-review/periods'
import { PeriodReviewReviewsRow } from './PeriodReviewReviewsRow'

/** @deprecated props kind/selectedIndex unused — row shows all month/quarter chips */
export function PeriodReviewLookBackLinks({
  planYear,
}: {
  kind: PeriodReviewKind
  planYear: number
  selectedIndex: number
}) {
  return <PeriodReviewReviewsRow planYear={planYear} />
}
