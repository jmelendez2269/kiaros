import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { todayISO } from '@/lib/today/get-today-context'
import { getDayPlan } from '@/lib/planner/get-day-plan'
import { DayPlanner } from '@/components/planner/DayPlanner'
import { cn } from '@/lib/utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatLongDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
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
  if (params.view === 'week') redirect(`/year?view=week&date=${date}`)
  if (params.view === 'month') redirect(`/year?view=month&month=${date.slice(0, 7)}`)

  const dayPlan = await getDayPlan(profile.id, date)
  const prevHref = `/planner?date=${addDays(date, -1)}`
  const nextHref = `/planner?date=${addDays(date, 1)}`
  const title = formatLongDate(date)

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
            href="/planner"
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
            'border-leather-400/50 bg-leather-500/20 text-bone'
          )}
        >
          Day
        </Link>
        <Link
          href={`/year?view=week&date=${date}`}
          className={cn(
            'rounded-full border px-3 py-1',
            'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          Week
        </Link>
        <Link
          href={`/year?view=month&month=${date.slice(0, 7)}`}
          className={cn(
            'rounded-full border px-3 py-1',
            'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          Month
        </Link>
      </div>

      <DayPlanner date={date} isToday={date === today} initialPlanItems={dayPlan.planItems} windows={dayPlan.windows} />
    </div>
  )
}
