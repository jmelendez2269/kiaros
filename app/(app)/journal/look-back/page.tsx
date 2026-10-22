import { redirect } from 'next/navigation'
import { ReflectionsHub } from '@/components/reflections/ReflectionsHub'
import { JournalQuarterLookBack } from '@/components/journal/JournalQuarterLookBack'
import { resolveLookBackSubView } from '@/lib/journal/ia-journal-routes'
import { isIaJournalEnabled } from '@/lib/feature-flags'
import { BRAND } from '@/lib/brand'
import type { PeriodKind } from '@/lib/reflections/periods'

export const metadata = {
  title: `Look back — ${BRAND.product}`,
  description: 'Monthly and quarterly reflections and your year in review.',
}

export default async function JournalLookBackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  if (!isIaJournalEnabled()) {
    redirect('/reflections')
  }

  const params = (await searchParams) ?? {}
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view
  const subView = resolveLookBackSubView(rawView ?? null)
  const quarterParam = Array.isArray(params.quarter) ? params.quarter[0] : params.quarter

  if (subView === 'quarter') {
    return (
      <div className="space-y-6">
        <JournalQuarterLookBack quarterParam={quarterParam} />
      </div>
    )
  }

  const kind: PeriodKind = subView === 'year' ? 'year' : 'month'

  return <ReflectionsHub initialKind={kind} journalIaEmbed />
}
