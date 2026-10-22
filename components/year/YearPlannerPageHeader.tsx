import { CalendarTabs } from '@/components/calendar/CalendarTabs'
import { YearViewSwitcher } from '@/components/year/YearViewSwitcher'

type View = 'year' | 'month' | 'week' | 'review'

export function YearPlannerPageHeader({
  current,
  calendarDayEnabled,
}: {
  current: View
  calendarDayEnabled: boolean
}) {
  const showSwitcher =
    !calendarDayEnabled || current === 'year' || current === 'review' || current === 'week'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="shell-kicker mb-3">Cosmic Plan</p>
          <h1 className="shell-section-title">
            Planner built from your chart and this year&apos;s sky
          </h1>
        </div>
        {showSwitcher ? <YearViewSwitcher current={current} calendarDayEnabled={calendarDayEnabled} /> : null}
      </div>
      {calendarDayEnabled ? <CalendarTabs /> : null}
    </div>
  )
}
