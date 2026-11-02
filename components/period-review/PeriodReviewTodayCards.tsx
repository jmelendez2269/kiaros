import { isIaJournalEnabled, isPeriodReviewEnabled } from '@/lib/feature-flags'
import { journalTabLookBackHref, reflectionsHubHref } from '@/lib/journal/ia-journal-routes'
import { PeriodReviewTodayCardsClient } from '@/components/period-review/PeriodReviewTodayCardsClient'

export function PeriodReviewTodayCards({ todayDate }: { todayDate: string }) {
  if (!isPeriodReviewEnabled()) return null

  const lookBackHref = isIaJournalEnabled() ? journalTabLookBackHref() : reflectionsHubHref(false)

  return <PeriodReviewTodayCardsClient todayDate={todayDate} lookBackHref={lookBackHref} />
}
