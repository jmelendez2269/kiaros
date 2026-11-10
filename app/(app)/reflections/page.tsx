import { redirect } from 'next/navigation'
import { ReflectionsHub } from '@/components/reflections/ReflectionsHub'
import { isIaJournalEnabled } from '@/lib/feature-flags'
import type { PeriodKind } from '@/lib/reflections/periods'

export const metadata = { title: 'Reflections · Kairos' }

const KINDS: PeriodKind[] = ['week', 'month', 'quarter', 'year']

/** ?kind= picks the tab; ?start=YYYY-MM-DD opens the period that begins on that day. */
export default async function ReflectionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  const params = (await searchParams) ?? {}
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
  const kind = KINDS.find(k => k === first(params.kind)) ?? 'month'
  const rawStart = first(params.start)
  const start = rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) ? rawStart : undefined

  if (isIaJournalEnabled()) {
    const sp = new URLSearchParams()
    if (kind !== 'month') sp.set('view', kind)
    if (start) sp.set('start', start)
    const qs = sp.toString()
    redirect(qs ? `/journal/look-back?${qs}` : '/journal/look-back')
  }
  return <ReflectionsHub key={`${kind}:${start ?? ''}`} initialKind={kind} initialStart={start} />
}
