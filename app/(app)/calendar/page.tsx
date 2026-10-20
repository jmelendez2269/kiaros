import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { todayISO } from '@/lib/today/get-today-context'
import { getDayPlan } from '@/lib/planner/get-day-plan'
import { PlannerDayShell } from '@/components/planner/PlannerDayShell'
import { CalendarViewSwitcher } from '@/components/calendar/CalendarViewSwitcher'
import { CalendarWeekViewPanel } from '@/components/calendar/CalendarWeekViewPanel'
import { weekRangeLabel } from '@/lib/calendar/week-range-label'
import { clampWeekToPlanYear } from '@/lib/calendar/load-week-chart-data'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
type View = 'day' | 'week'

function parseView(raw: string | undefined): View {
  if (raw === 'week') return 'week'
  return 'day'
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />
  if (profileResult.status === 'missing') redirect('/onboarding')
  const profile = profileResult.profile

  const params = await searchParams
  const today = todayISO()
  const date = params.date && DATE_RE.test(params.date) ? params.date : today
  const view = parseView(params.view)

  if (view === 'week') {
    const planYear = new Date().getFullYear()
    const weekDate = clampWeekToPlanYear(date, planYear)
    const rangeLabel = weekRangeLabel(weekDate)
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="shell-kicker mb-1">Calendar</p>
            <h1 className="font-serif text-3xl text-bone">{rangeLabel}</h1>
          </div>
          <CalendarViewSwitcher current="week" />
        </div>
        <CalendarWeekViewPanel date={date} />
      </div>
    )
  }

  const dayPlan = await getDayPlan(profile.id, date)

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <CalendarViewSwitcher current="day" />
        </div>
      </div>
      <PlannerDayShell
        basePath="/calendar"
        date={date}
        today={today}
        dayPlan={dayPlan}
        kicker="Calendar"
        activeView="day"
        dayGridScrollMode="calendar"
      />
    </div>
  )
}
