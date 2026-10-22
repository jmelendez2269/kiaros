import { redirect } from 'next/navigation'
import { ReflectionsHub } from '@/components/reflections/ReflectionsHub'
import { isIaJournalEnabled } from '@/lib/feature-flags'

export const metadata = { title: 'Reflections · Kairos' }

export default function ReflectionsPage() {
  if (isIaJournalEnabled()) {
    redirect('/journal/look-back')
  }
  return <ReflectionsHub />
}
