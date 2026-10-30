import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { PeriodReviewPanel } from '@/components/period-review/PeriodReviewPanel'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Period review — ${BRAND.product}`,
}

export default async function PeriodReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!isPeriodReviewEnabled()) redirect('/today')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const params = (await searchParams) ?? {}
  const kindRaw = Array.isArray(params.kind) ? params.kind[0] : params.kind
  const yearRaw = Array.isArray(params.year) ? params.year[0] : params.year
  const indexRaw = Array.isArray(params.index) ? params.index[0] : params.index

  const kind = (kindRaw === 'quarter' ? 'quarter' : 'month') as PeriodReviewKind
  const year = Number(yearRaw)
  const index = Number(indexRaw)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect('/today')
  if (!Number.isInteger(index) || index < 1 || index > (kind === 'month' ? 12 : 4)) redirect('/today')

  periodFor(kind, year, index)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
      <PeriodReviewPanel kind={kind} year={year} index={index} />
    </div>
  )
}
