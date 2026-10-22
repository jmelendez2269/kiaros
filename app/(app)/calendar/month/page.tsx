import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { MonthChartView } from '@/components/year/MonthChartView'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

interface SearchParams {
  month?: string
  date?: string
}

export default async function CalendarMonthPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const params = await searchParams

  if (!isCalendarDayEnabled()) {
    const month = params.month
    redirect(month ? `/year?view=month&month=${month}` : '/year?view=month')
  }

  return <MonthChartView searchParams={params} calendarDayEnabled />
}
