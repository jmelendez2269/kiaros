'use client'

import {
  isPromoWindow,
  latestClosedMonth,
  latestClosedQuarter,
  type PeriodReviewPeriod,
} from '@/lib/period-review/periods'
import { PeriodReviewTodayCard } from '@/components/period-review/PeriodReviewTodayCard'

export function PeriodReviewTodayCardsClient({
  todayDate,
  lookBackHref,
}: {
  todayDate: string
  lookBackHref: string
}) {
  const monthPeriod = latestClosedMonth(todayDate)
  const quarterPeriod = latestClosedQuarter(todayDate)

  const cards: PeriodReviewPeriod[] = []
  if (isPromoWindow(todayDate, monthPeriod)) cards.push(monthPeriod)
  if (isPromoWindow(todayDate, quarterPeriod)) cards.push(quarterPeriod)

  if (!cards.length) return null

  return (
    <>
      {cards.map((period, index) => (
        <PeriodReviewTodayCard
          key={period.kind}
          period={period}
          lookBackHref={lookBackHref}
          showEarlierLink={index === cards.length - 1}
        />
      ))}
    </>
  )
}
