import Link from 'next/link'
import { CosmicPlanView } from '@/components/cosmic-plan/CosmicPlanView'
import { CosmicCalendar } from '@/components/calendar/CosmicCalendar'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'

export default async function CalendarPage() {
  const loaded = await loadCurrentBlueprint()
  const currentYear = new Date().getFullYear()
  let yearEphemeris: YearEphemeris | null = null
  let curriculumSessions: CurriculumSessionRow[] = []

  if (loaded) {
    const supabase = await createServerSupabase()
    const startDate = `${loaded.planYear}-01-01`
    const endDate = `${loaded.planYear}-12-31`

    const [ephemerisRes, sessionsRes] = await Promise.all([
      supabase.from('ephemeris_cache').select('data').eq('year', loaded.planYear).maybeSingle(),
      supabase
        .from('curriculum_sessions')
        .select(
          'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
        )
        .gte('scheduled_for', startDate)
        .lte('scheduled_for', endDate)
        .order('scheduled_for', { ascending: true }),
    ])

    yearEphemeris = (ephemerisRes.data?.data as YearEphemeris | null) ?? null
    curriculumSessions = (sessionsRes.data ?? []) as CurriculumSessionRow[]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="shell-kicker mb-3">Cosmic Plan</p>
          <h1 className="shell-section-title">
            Planner built from your chart and this year&apos;s sky
          </h1>
        </div>
        <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
          Birth data creates the timing framework. Your onboarding choices deepen the customization.
        </div>
      </div>

      {loaded ? (
        <div className="space-y-6">
          {yearEphemeris ? (
            <CosmicCalendar
              yearEphemeris={yearEphemeris}
              weeks={loaded.blueprint.weeks}
              curriculumSessions={curriculumSessions}
            />
          ) : (
            <div className="shell-panel px-6 py-8">
              <p className="shell-kicker mb-3">Cosmic Calendar</p>
              <h2 className="shell-section-title">Calendar data is still forming</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
                Your {loaded.planYear} sky map will appear here once the ephemeris cache is available.
              </p>
            </div>
          )}

          <CosmicPlanView blueprint={loaded.blueprint} planYear={loaded.planYear} />
        </div>
      ) : (
        <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
          <div className="text-4xl text-bone-muted">✦</div>
          <h2 className="font-serif text-3xl text-bone">No plan yet</h2>
          <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
            Your {currentYear} cosmic plan hasn&apos;t been generated. Complete onboarding to create
            your personalised year built from your natal chart and real planetary transits.
          </p>
          <Link
            href="/onboarding"
            className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
          >
            Complete Setup
          </Link>
        </div>
      )}
    </div>
  )
}
