import { createServerSupabase } from '@/lib/supabase/server'
import { CosmicCalendar } from '@/components/calendar/CosmicCalendar'
import type { YearEphemeris, WeekBlueprint } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'

export default async function CalendarPage() {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  const [ephemerisRes, blueprintRes, curriculumRes] = await Promise.all([
    supabase
      .from('ephemeris_cache')
      .select('data')
      .eq('year', currentYear)
      .maybeSingle(),
    supabase
      .from('blueprints')
      .select('weeks')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .gte('scheduled_for', startOfYear)
      .lte('scheduled_for', endOfYear)
      .order('scheduled_for', { ascending: true })
      .order('session_order', { ascending: true }),
  ])

  const yearEphemeris = ephemerisRes.data?.data as YearEphemeris | null
  const weeks = (blueprintRes.data?.weeks as unknown as WeekBlueprint[]) ?? []
  const curriculumSessions = (curriculumRes.data ?? []) as unknown as CurriculumSessionRow[]

  if (!yearEphemeris) {
    return (
      <div className="space-y-6">
        <div>
          <p className="shell-kicker mb-3">Cosmic Plan</p>
          <h1 className="shell-section-title">Your personal year map</h1>
        </div>
        <div className="shell-panel space-y-3 px-8 py-12 text-center">
          <div className="text-3xl text-bone-muted">✦</div>
          <p className="text-bone-muted">
            Your ephemeris data isn&apos;t ready yet. Finish generating your blueprint and check back
            here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="shell-kicker mb-3">Cosmic Plan</p>
          <h1 className="shell-section-title">Planner built from your chart and this year&apos;s sky</h1>
        </div>
        <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
          Birth data creates the timing framework. Your onboarding choices deepen the customization.
        </div>
      </div>
      <CosmicCalendar yearEphemeris={yearEphemeris} weeks={weeks} curriculumSessions={curriculumSessions} />
    </div>
  )
}
