import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { todayISO } from '@/lib/today/get-today-context'
import { getDayPlan } from '@/lib/planner/get-day-plan'
import { PlannerDayShell } from '@/components/planner/PlannerDayShell'
import { CalendarTabs } from '@/components/calendar/CalendarTabs'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  if (!isCalendarDayEnabled()) {
    redirect('/year')
  }

  const params = await searchParams
  if (params.view === 'week') {
    const sp = new URLSearchParams()
    if (params.date && DATE_RE.test(params.date)) {
      sp.set('date', params.date)
    }
    const qs = sp.toString()
    redirect(qs ? `/calendar/week?${qs}` : '/calendar/week')
  }

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />
  if (profileResult.status === 'missing') redirect('/onboarding')
  const profile = profileResult.profile

  const today = todayISO()
  const date = params.date && DATE_RE.test(params.date) ? params.date : today

  const dayPlan = await getDayPlan(profile.id, date)

  return (
    <div className="space-y-6">
      <PlannerDayShell
        basePath="/calendar"
        date={date}
        today={today}
        dayPlan={dayPlan}
        kicker="Calendar"
        activeView="day"
        dayGridScrollMode="calendar"
        belowTitle={<CalendarTabs />}
      />
    </div>
  )
}
