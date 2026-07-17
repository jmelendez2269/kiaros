import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { Frame, K, Kicker } from '@/components/almanac'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getShapeOfToday } from '@/lib/today/shape-of-today'
import { SkyBanner } from '@/components/today/SkyBanner'
import { ShapeOfTodayCards } from '@/components/today/ShapeOfToday'
import { WeekRibbon } from '@/components/today/WeekRibbon'
import { RightNowCard } from '@/components/today/RightNowCard'
import { SkyNow } from '@/components/today/SkyNow'
import { LineForToday } from '@/components/today/LineForToday'
import { ActiveTransits } from '@/components/today/ActiveTransits'
import { LifeArcRead } from '@/components/today/LifeArcRead'
import { JupiterSeason } from '@/components/today/JupiterSeason'
import { TodayIntention } from '@/components/today/TodayIntention'
import { TodayCurriculum } from '@/components/today/TodayCurriculum'
import { WeekArc } from '@/components/today/WeekArc'
import { PlanChecklist } from '@/components/plan/PlanChecklist'
import { PlanImportModal } from '@/components/plan/PlanImportModal'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { getActiveTransits } from '@/lib/today/get-active-transits'
import { getJournalStreak } from '@/lib/today/get-journal-streak'
import { getTodayIntention } from '@/lib/today/get-today-intention'
import { getTodayCurriculum } from '@/lib/today/get-today-curriculum'
import { getSkyNow } from '@/lib/today/get-sky-now'
import { getLifeArc } from '@/lib/today/get-life-arc'
import { getJupiterSeason } from '@/lib/today/get-jupiter-season'
import { getNowEnergyWindows } from '@/lib/today/get-now-energy'
import { YearChartShell } from '@/components/year/YearChartShell'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import type { YearEphemeris } from '@/types/blueprint'

export default async function TodayPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, display_name')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  // If no profile row exists the app layout would have already redirected to
  // /onboarding, so this is a safety net only — don't loop back to /sign-in.
  if (!profile?.id) redirect('/onboarding')
  const supabaseUserId = profile.id

  const context = getTodayContext()
  const shape = getShapeOfToday({
    moonPhase: context.today.moonPhase,
    moonSign: context.today.moon.sign,
  })
  const [
    activeTransits,
    journalStreak,
    intention,
    curriculum,
    skyNow,
    lifeArc,
    jupiterSeason,
    nowEnergyWindows,
    todayPlanItemsRes,
    todayCurriculumSessionsRes,
  ] = await Promise.all([
    getActiveTransits(context.today.date, supabaseUserId),
    getJournalStreak(context.today.date, supabaseUserId),
    getTodayIntention(context.today.date, supabaseUserId),
    getTodayCurriculum(context.today.date, supabaseUserId),
    getSkyNow(context.today.date, supabaseUserId),
    getLifeArc(context.today.date, supabaseUserId),
    getJupiterSeason(context.today.date, supabaseUserId),
    getNowEnergyWindows(supabaseUserId, context.today.date),
    admin
      .from('plan_items')
      .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, user_id, start_minute, duration_minutes, area_goal_id, source')
      .eq('user_id', supabaseUserId)
      .eq('item_date', context.today.date)
      .order('sort_order', { ascending: true }),
    admin
      .from('curriculum_sessions')
      .select(
        'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
      )
      .eq('user_id', supabaseUserId)
      .eq('scheduled_for', context.today.date),
  ])
  const todayPlanItems = todayPlanItemsRes.data ?? []
  const todayCurriculumSessions = (todayCurriculumSessionsRes.data ?? []) as CurriculumSessionRow[]

  // Year-at-a-glance grid (same data the Year tab uses): the current
  // blueprint's weeks plus the cached year ephemeris.
  const blueprintLoaded = await loadCurrentBlueprint(supabaseUserId)
  let yearEphemeris: YearEphemeris | null = null
  if (blueprintLoaded) {
    const { data: ephemerisRow } = await admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', supabaseUserId)
      .eq('year', blueprintLoaded.planYear)
      .maybeSingle()
    yearEphemeris = (ephemerisRow?.data as YearEphemeris | null) ?? null
  }

  const currentWeek = blueprintLoaded?.blueprint.weeks.find(
    (w) => w.weekNumber === context.meta.isoWeek
  ) ?? null

  return (
    <div
      className="grid gap-5 p-4 sm:p-6 md:p-7"
      style={{
        fontFamily: K.fBody,
        color: K.ink,
        background: K.bg,
        backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
        minHeight: '100%',
      }}
    >
      <SkyBanner context={context} firstName={profile?.display_name ?? null} weekTheme={currentWeek?.theme ?? null} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Left column — stacks naturally, no row-height coupling to SkyNow */}
        <div className="flex flex-col gap-4 min-w-0">
          <TodayIntention result={intention} />
          <Frame tone="umber" padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Kicker color={K.copper}>Today&rsquo;s plan</Kicker>
              <PlanImportModal />
            </div>
            <div style={{ marginTop: 12 }}>
              <PlanChecklist
                date={context.today.date}
                manualItems={todayPlanItems}
                curriculumSessions={todayCurriculumSessions}
                variant="full"
              />
            </div>
          </Frame>
          <Frame tone="umber" padding={22}>
            <ShapeOfTodayCards
              shape={shape}
              isoWeek={context.meta.isoWeek}
              dayOfYear={context.meta.dayOfYear}
            />
          </Frame>
          <LineForToday streak={journalStreak} />
          <Frame tone="umber" padding={20}>
            <WeekRibbon week={context.week} />
          </Frame>
          <Frame tone="umber" padding={18}>
            <RightNowCard windows={nowEnergyWindows} />
          </Frame>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 min-w-0">
          {skyNow.status === 'ok' ? (
            <SkyNow data={skyNow.data} />
          ) : (
            <Frame tone="cocoa" padding={20} stars>
              <Kicker color={K.copper}>Sky now</Kicker>
              <p
                style={{
                  marginTop: 10,
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: K.inkDim,
                  lineHeight: 1.5,
                }}
              >
                Complete your birth chart on the Self screen to see today&rsquo;s sky over your natal
                chart with live aspect lines.
              </p>
            </Frame>
          )}
          <ActiveTransits data={activeTransits} />
        </div>
      </div>

      {blueprintLoaded ? (
        <Frame tone="umber" padding={20}>
          <WeekArc weeks={blueprintLoaded.blueprint.weeks} currentWeekNumber={context.meta.isoWeek} />
        </Frame>
      ) : null}
      <TodayCurriculum result={curriculum} />

      {/* Jupiter season — changes ~yearly, sits between the daily and the era */}
      {jupiterSeason.status === 'ok' ? <JupiterSeason data={jupiterSeason} /> : null}

      {blueprintLoaded && yearEphemeris ? (
        <Frame tone="umber" padding={20}>
          <Kicker color={K.copper}>The year at a glance</Kicker>
          <div style={{ marginTop: 12 }}>
            <YearChartShell yearEphemeris={yearEphemeris} weeks={blueprintLoaded.blueprint.weeks} />
          </div>
        </Frame>
      ) : null}

      {/* Life arc — Saturn/Uranus/Neptune/Pluto; years-long eras */}
      {lifeArc.status === 'ok' ? <LifeArcRead data={lifeArc} /> : null}
    </div>
  )
}
