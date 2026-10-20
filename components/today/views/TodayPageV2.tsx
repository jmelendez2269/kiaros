import { Frame, K, Kicker } from '@/components/almanac'
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
import { YearChartShell } from '@/components/year/YearChartShell'
import { TodayZoneLabel } from '@/components/today/views/TodayZoneLabel'
import type { TodayPageData } from '@/lib/today/load-today-page-data'

const pageShellStyle = {
  fontFamily: K.fBody,
  color: K.ink,
  background: K.bg,
  backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
  minHeight: '100%',
} as const

export function TodayPageV2({ data }: { data: TodayPageData }) {
  const {
    context,
    shape,
    journalStreak,
    activeTransits,
    intention,
    curriculum,
    skyNow,
    lifeArc,
    jupiterSeason,
    nowEnergyWindows,
    humanDesignWeather,
    todayPlanItems,
    todayCurriculumSessions,
    blueprintLoaded,
    yearEphemeris,
    currentWeekTheme,
  } = data

  return (
    <div className="grid gap-5 p-4 sm:p-6 md:p-7" style={pageShellStyle}>
      <header className="grid gap-3">
        <h1
          style={{
            fontFamily: K.fSerif,
            fontSize: 28,
            fontWeight: 500,
            margin: 0,
            color: K.ink,
          }}
        >
          Today
        </h1>
        <SkyBanner
          context={context}
          weekTheme={currentWeekTheme}
          humanDesignWeather={humanDesignWeather}
        />
      </header>

      <Frame tone="umber" padding={22} style={{ borderColor: `${K.kairos}55` }}>
        <TodayZoneLabel zone="me-today" primary />
        <div className="grid gap-4">
          <TodayIntention result={intention} />
          <LineForToday streak={journalStreak} />
        </div>
      </Frame>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4 min-w-0">
          <Frame tone="umber" padding={20}>
            <TodayZoneLabel zone="plan" />
            <div className="grid gap-4">
              <RightNowCard windows={nowEnergyWindows} />
              <div>
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
              </div>
              <TodayCurriculum result={curriculum} />
            </div>
          </Frame>
        </div>

        <div className="grid gap-4 min-w-0">
          <Frame tone="umber" padding={20}>
            <TodayZoneLabel zone="sky" />
            <div className="grid gap-4">
              <ShapeOfTodayCards
                shape={shape}
                isoWeek={context.meta.isoWeek}
                dayOfYear={context.meta.dayOfYear}
              />
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
                    Complete your birth chart on the Self screen to see today&rsquo;s sky over your
                    natal chart with live aspect lines.
                  </p>
                </Frame>
              )}
              <ActiveTransits data={activeTransits} />
            </div>
          </Frame>
        </div>
      </div>

      <Frame tone="umber" padding={20}>
        <TodayZoneLabel zone="bigger-picture" />
        <div className="grid gap-5">
          <WeekRibbon week={context.week} />

          {blueprintLoaded ? (
            <Frame tone="cocoa" padding={18}>
              <WeekArc
                weeks={blueprintLoaded.blueprint.weeks}
                currentWeekNumber={context.meta.isoWeek}
              />
            </Frame>
          ) : null}

          {jupiterSeason.status === 'ok' ? <JupiterSeason data={jupiterSeason} /> : null}

          {blueprintLoaded && yearEphemeris ? (
            <Frame tone="cocoa" padding={18}>
              <Kicker color={K.copper}>The year at a glance</Kicker>
              <div style={{ marginTop: 12 }}>
                <YearChartShell
                  yearEphemeris={yearEphemeris}
                  weeks={blueprintLoaded.blueprint.weeks}
                />
              </div>
            </Frame>
          ) : null}

          {lifeArc.status === 'ok' ? <LifeArcRead data={lifeArc} /> : null}
        </div>
      </Frame>
    </div>
  )
}
