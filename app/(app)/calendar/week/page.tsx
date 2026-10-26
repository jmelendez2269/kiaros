import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { todayISO } from '@/lib/today/get-today-context'
import { getWeekPlan } from '@/lib/planner/get-week-plan'
import { CalendarTabs } from '@/components/calendar/CalendarTabs'
import { CalendarWeekViewPanel } from '@/components/calendar/CalendarWeekViewPanel'
import { WeekBoard } from '@/components/planner/WeekBoard'
import { weekRangeLabel } from '@/lib/calendar/week-range-label'
import { clampWeekToPlanYear } from '@/lib/calendar/load-week-chart-data'
import { getWeekDates } from '@/components/calendar/utils'
import { isCalendarDayEnabled } from '@/lib/feature-flags'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function CalendarWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  if (!isCalendarDayEnabled()) {
    redirect('/year?view=week')
  }

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />
  if (profileResult.status === 'missing') redirect('/onboarding')
  const profile = profileResult.profile

  const params = await searchParams
  const today = todayISO()
  const date = params.date && DATE_RE.test(params.date) ? params.date : today

  const planYear = new Date().getFullYear()
  const weekDate = clampWeekToPlanYear(date, planYear)
  const rangeLabel = weekRangeLabel(weekDate)
  const weekDates = getWeekDates(weekDate)
  const weekPlan = await getWeekPlan(profile.id, weekDates)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4">
        <div>
          <p className="shell-kicker mb-1">Calendar</p>
          <h1 className="font-serif text-3xl text-bone">{rangeLabel}</h1>
        </div>
        <CalendarTabs />
      </div>
      <CalendarWeekViewPanel date={date} />
      {weekPlan && <WeekBoard days={weekPlan.days} weekGoals={weekPlan.weekGoals} today={today} />}
    </div>
  )
}
