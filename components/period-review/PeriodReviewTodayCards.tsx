import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import {
  isPromoWindow,
  latestClosedMonth,
  latestClosedQuarter,
  periodFor,
  type PeriodReviewKind,
} from '@/lib/period-review/periods'
import { PeriodReviewTodayCard } from '@/components/period-review/PeriodReviewTodayCard'

export function PeriodReviewTodayCards({ todayDate }: { todayDate: string }) {
  if (!isPeriodReviewEnabled()) return null

  const monthPeriod = latestClosedMonth(todayDate)
  const quarterPeriod = latestClosedQuarter(todayDate)

  const cards: { kind: PeriodReviewKind; period: ReturnType<typeof periodFor>; copy: string }[] = []

  if (isPromoWindow(todayDate, monthPeriod)) {
    cards.push({
      kind: 'month',
      period: monthPeriod,
      copy: 'TODO-STELLA: A gentle read on the month that just closed, from your sky and your plans.',
    })
  }
  if (isPromoWindow(todayDate, quarterPeriod)) {
    cards.push({
      kind: 'quarter',
      period: quarterPeriod,
      copy: 'TODO-STELLA: Three months in view, without a form, when you are ready.',
    })
  }

  if (!cards.length) return null

  return (
    <>
      {cards.map((card) => (
        <PeriodReviewTodayCard key={card.kind} period={card.period} promoCopy={card.copy} />
      ))}
    </>
  )
}
