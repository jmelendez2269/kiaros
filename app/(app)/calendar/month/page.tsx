import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { todayISO } from '@/lib/today/get-today-context'
import { getMonthPlan } from '@/lib/planner/get-month-plan'
import { MonthChartView } from '@/components/year/MonthChartView'
import { MonthBoard } from '@/components/planner/MonthBoard'
import { CalendarTabs } from '@/components/calendar/CalendarTabs'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

interface SearchParams {
  month?: string
  date?: string
}

function parseMonthParam(raw: string | undefined): { year: number; month: number } | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null
  const [y, m] = raw.split('-').map(Number)
  if (m < 1 || m > 12) return null
  return { year: y, month: m }
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

  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />
  if (profileResult.status === 'missing') redirect('/onboarding')
  const profile = profileResult.profile

  const today = todayISO()
  const monthParts = parseMonthParam(params.month) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }

  const monthPlan = await getMonthPlan(profile.id, monthParts.year, monthParts.month)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4">
        <CalendarTabs />
      </div>
      <MonthChartView searchParams={params} calendarDayEnabled />
      {monthPlan && <MonthBoard plan={monthPlan} today={today} />}
    </div>
  )
}
