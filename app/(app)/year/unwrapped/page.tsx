import { redirect } from 'next/navigation'
import { ReflectionsHub } from '@/components/reflections/ReflectionsHub'
import { isIaJournalEnabled } from '@/lib/feature-flags'

export const metadata = { title: 'Yearly Unwrapped · Kairos' }

export default function UnwrappedPage() {
  if (isIaJournalEnabled()) {
    redirect('/journal/look-back?view=year')
  }
  return <ReflectionsHub initialKind="year" />
}
