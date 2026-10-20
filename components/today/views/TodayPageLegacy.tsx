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
import { DeeperToday } from '@/components/today/DeeperToday'
import type { TodayPageData } from '@/lib/today/load-today-page-data'

export function TodayPageLegacy({ data }: { data: TodayPageData }) {
  const {
    context,
    shape,
    activeTransits,
    journalStreak,
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
    deeperOpenByDefault,
  } = data

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
      <SkyBanner
        context={context}
        weekTheme={currentWeekTheme}
        humanDesignWeather={humanDesignWeather}
      />

      <Frame tone="umber" padding={18}>
        <RightNowCard windows={nowEnergyWindows} />
      </Frame>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
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
        </div>

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

      <TodayCurriculum result={curriculum} />

      <DeeperToday defaultOpen={deeperOpenByDefault}>
        <div className="grid gap-5">
          {blueprintLoaded ? (
            <Frame tone="umber" padding={20}>
              <WeekArc
                weeks={blueprintLoaded.blueprint.weeks}
                currentWeekNumber={context.meta.isoWeek}
              />
            </Frame>
          ) : null}

          {jupiterSeason.status === 'ok' ? <JupiterSeason data={jupiterSeason} /> : null}

          {blueprintLoaded && yearEphemeris ? (
            <Frame tone="umber" padding={20}>
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
      </DeeperToday>
    </div>
  )
}
