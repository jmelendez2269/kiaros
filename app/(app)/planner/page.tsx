import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { todayISO } from '@/lib/today/get-today-context'
import { getDayPlan } from '@/lib/planner/get-day-plan'
import { getWeekPlan } from '@/lib/planner/get-week-plan'
import { getMonthPlan } from '@/lib/planner/get-month-plan'
import { getWeekDates, MONTH_NAMES } from '@/components/calendar/utils'
import { DayPlanner } from '@/components/planner/DayPlanner'
import { WeekBoard } from '@/components/planner/WeekBoard'
import { MonthBoard } from '@/components/planner/MonthBoard'
import { cn } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
type View = 'day' | 'week' | 'month'

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Steps by a full calendar month, handling day-of-month overflow (Jan 31 + 1mo -> Feb 1, not Mar 3). */
function addMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

function formatLongDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatWeekRange(weekDates: string[]): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const first = new Date(`${weekDates[0]}T12:00:00`)
  const last = new Date(`${weekDates[weekDates.length - 1]}T12:00:00`)
  return `${first.toLocaleDateString('en-US', opts)} – ${last.toLocaleDateString('en-US', opts)}`
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  // If no profile row exists the app layout would have already redirected to
  // /onboarding, so this is a safety net only — don't loop back to /sign-in.
  if (!profile?.id) redirect('/onboarding')

  const params = await searchParams
  const today = todayISO()
  const date = params.date && DATE_RE.test(params.date) ? params.date : today
  const view: View = params.view === 'week' ? 'week' : params.view === 'month' ? 'month' : 'day'

  const weekDates = view === 'week' ? getWeekDates(date) : null
  const monthParts = view === 'month' ? { year: Number.parseInt(date.slice(0, 4), 10), month: Number.parseInt(date.slice(5, 7), 10) } : null

  const [dayPlan, weekPlan, monthPlan] = await Promise.all([
    view === 'day' ? getDayPlan(profile.id, date) : null,
    weekDates ? getWeekPlan(profile.id, weekDates) : null,
    monthParts ? getMonthPlan(profile.id, monthParts.year, monthParts.month) : null,
  ])

  const prevHref =
    view === 'month'
      ? `/planner?view=month&date=${addMonths(date, -1)}`
      : `/planner?view=${view}&date=${addDays(date, view === 'week' ? -7 : -1)}`
  const nextHref =
    view === 'month'
      ? `/planner?view=month&date=${addMonths(date, 1)}`
      : `/planner?view=${view}&date=${addDays(date, view === 'week' ? 7 : 1)}`

  let title: string
  if (view === 'week' && weekDates) title = formatWeekRange(weekDates)
  else if (view === 'month' && monthParts) title = `${MONTH_NAMES[monthParts.month - 1]} ${monthParts.year}`
  else title = formatLongDate(date)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="shell-kicker mb-1">Planner</p>
          <h1 className="font-serif text-3xl text-bone">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone">
            ← Prev
          </Link>
          <Link
            href={`/planner?view=${view}`}
            className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone"
          >
            Today
          </Link>
          <Link href={nextHref} className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone">
            Next →
          </Link>
        </div>
      </div>

      <div className="flex gap-2 text-xs uppercase tracking-wider">
        <Link
          href={`/planner?date=${date}`}
          className={cn(
            'rounded-full border px-3 py-1',
            view === 'day' ? 'border-leather-400/50 bg-leather-500/20 text-bone' : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          Day
        </Link>
        <Link
          href={`/planner?view=week&date=${date}`}
          className={cn(
            'rounded-full border px-3 py-1',
            view === 'week' ? 'border-leather-400/50 bg-leather-500/20 text-bone' : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          Week
        </Link>
        <Link
          href={`/planner?view=month&date=${date}`}
          className={cn(
            'rounded-full border px-3 py-1',
            view === 'month' ? 'border-leather-400/50 bg-leather-500/20 text-bone' : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          Month
        </Link>
      </div>

      {view === 'week' && weekPlan ? (
        <WeekBoard days={weekPlan.days} weekGoals={weekPlan.weekGoals} today={today} />
      ) : view === 'month' && monthPlan ? (
        <MonthBoard plan={monthPlan} today={today} />
      ) : dayPlan ? (
        <DayPlanner date={date} isToday={date === today} initialPlanItems={dayPlan.planItems} windows={dayPlan.windows} />
      ) : null}
    </div>
  )
}
