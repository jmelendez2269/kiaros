import { redirect } from 'next/navigation'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

export default async function CalendarYearPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!isCalendarDayEnabled()) {
    const params = await searchParams
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') sp.set(key, value)
      else if (Array.isArray(value)) sp.set(key, value[0])
    }
    const qs = sp.toString()
    redirect(qs ? `/year?${qs}` : '/year')
  }

  const YearPage = (await import('../../year/page')).default
  return <YearPage searchParams={searchParams} />
}
