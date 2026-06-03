import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { Frame, K, Kicker } from '@/components/almanac'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getShapeOfToday } from '@/lib/today/shape-of-today'
import { SkyBanner } from '@/components/today/SkyBanner'
import { ShapeOfTodayCards } from '@/components/today/ShapeOfToday'
import { WeekRibbon } from '@/components/today/WeekRibbon'
import { SkyNow } from '@/components/today/SkyNow'
import { LineForToday } from '@/components/today/LineForToday'
import { ActiveTransits } from '@/components/today/ActiveTransits'
import { SeasonRead } from '@/components/today/SeasonRead'
import { TodayIntention } from '@/components/today/TodayIntention'
import { TodayCurriculum } from '@/components/today/TodayCurriculum'
import { getActiveTransits } from '@/lib/today/get-active-transits'
import { getJournalStreak } from '@/lib/today/get-journal-streak'
import { getTodayIntention } from '@/lib/today/get-today-intention'
import { getTodayCurriculum } from '@/lib/today/get-today-curriculum'
import { getSkyNow } from '@/lib/today/get-sky-now'
import { getSeason } from '@/lib/today/get-season'
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
  const [activeTransits, journalStreak, intention, curriculum, skyNow, season] = await Promise.all([
    getActiveTransits(context.today.date, supabaseUserId),
    getJournalStreak(context.today.date, supabaseUserId),
    getTodayIntention(context.today.date, supabaseUserId),
    getTodayCurriculum(context.today.date, supabaseUserId),
    getSkyNow(context.today.date, supabaseUserId),
    getSeason(context.today.date, supabaseUserId),
  ])

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
      style={{
        fontFamily: K.fBody,
        color: K.ink,
        background: K.bg,
        backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
        minHeight: '100%',
        padding: 28,
        display: 'grid',
        gap: 18,
      }}
    >
      <SkyBanner context={context} firstName={profile?.display_name ?? null} weekTheme={currentWeek?.theme ?? null} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <TodayIntention result={intention} />
        <TodayCurriculum result={curriculum} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Frame tone="umber" padding={22}>
            <ShapeOfTodayCards
              shape={shape}
              isoWeek={context.meta.isoWeek}
              dayOfYear={context.meta.dayOfYear}
            />
          </Frame>
          <ActiveTransits data={activeTransits} />
        </div>
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
      </div>

      {blueprintLoaded && yearEphemeris ? (
        <Frame tone="umber" padding={20}>
          <Kicker color={K.copper}>The year at a glance</Kicker>
          <div style={{ marginTop: 12 }}>
            <YearChartShell yearEphemeris={yearEphemeris} weeks={blueprintLoaded.blueprint.weeks} />
          </div>
        </Frame>
      ) : null}

      {season.status === 'ok' ? <SeasonRead data={season} /> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <Frame tone="umber" padding={20}>
          <WeekRibbon week={context.week} />
        </Frame>
        <LineForToday streak={journalStreak} />
      </div>
    </div>
  )
}
