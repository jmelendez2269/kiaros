import { redirect } from 'next/navigation'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

export default async function CalendarBlueprintPage() {
  if (!isCalendarDayEnabled()) {
    redirect('/blueprint')
  }

  const BlueprintPage = (await import('../../blueprint/page')).default
  return <BlueprintPage />
}
