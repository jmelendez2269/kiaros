import Link from 'next/link'
import { Frame, Kicker, K } from '@/components/almanac'
import { MonthGrid } from '@/components/year/MonthGrid'
import { MonthBriefPanel } from '@/components/year/MonthBriefPanel'
import { PushRestRibbon } from '@/components/year/PushRestRibbon'
import { YearPlannerPageHeader } from '@/components/year/YearPlannerPageHeader'
import { getSabianForDegree } from '@/lib/ephemeris/sabian'
import { derivePushRestArc } from '@/lib/year/push-rest-arc'
import { todayISO } from '@/lib/today/get-today-context'
import { monthChartNavHref } from '@/lib/calendar/calendar-day-routes'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { Tables } from '@/types/database'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import { WindowedAccessNote } from '@/components/year/WindowedAccessNote'
import {
  buildDayCharacters,
  clampMonthToPlanYear,
  eventsForMonth,
  isoWeek,
  dayOfYear,
  loadMonthData,
  MONTH_NAMES,
  parseDate,
  parseMonth,
  shiftMonth,
  type SearchParams,
} from '@/lib/year/month-chart-shared'

type PlanItemRow = Tables<'plan_items'>

export async function MonthChartView({
  searchParams,
  calendarDayEnabled = false,
}: {
  searchParams: SearchParams
  calendarDayEnabled?: boolean
}) {
  const now = new Date()
  const todayIso = todayISO()
  const today = {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
    day: Number(todayIso.slice(8, 10)),
  }
  const requestedDate = parseDate(searchParams.date, todayIso)
  const dateMonth = {
    year: Number(requestedDate.slice(0, 4)),
    month: Number(requestedDate.slice(5, 7)) - 1,
  }
  const planYear = new Date().getFullYear()
  const selected = clampMonthToPlanYear(parseMonth(searchParams.month, dateMonth), planYear)
  const {
    loaded,
    yearEphemeris,
    curriculumSessions,
    planItems,
    journalEntries,
    monthBrief,
    plannerContext,
  } = await loadMonthData(selected.year, selected.month)

  const weekStart = new Date(selected.year, selected.month, 1)
  const weekNumber = isoWeek(weekStart)
  const arc = loaded
    ? (loaded.pushRestArc ?? derivePushRestArc(loaded.blueprint, loaded.planYear))
    : []
  const todayPct = (dayOfYear(now) / 365) * 100

  const monthBlueprint = loaded?.blueprint.months.find((m) => m.month === selected.month + 1)
  const quarterNumber = Math.floor(selected.month / 3) + 1
  const quarterBlueprint = loaded?.blueprint.quarters.find((q) => q.quarter === quarterNumber)
  const events = eventsForMonth(monthBlueprint, selected.year, selected.month)
  const monthPrefix = `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-`
  const monthSessions = curriculumSessions.filter((s) => s.scheduled_for.startsWith(monthPrefix))
  const monthDates = Array.from(
    { length: new Date(selected.year, selected.month + 1, 0).getDate() },
    (_, index) => `${monthPrefix}${String(index + 1).padStart(2, '0')}`
  )
  const charactersByDate = buildDayCharacters(monthDates, yearEphemeris, plannerContext)
  const energyByDay = new Map<number, EnergyWindow>()
  for (const [date, character] of charactersByDate) {
    energyByDay.set(Number(date.slice(8, 10)), character)
  }

  const journalDays = new Set<number>()
  for (const row of journalEntries ?? []) {
    const d = Number(row.entry_date?.slice(8, 10))
    if (Number.isFinite(d)) journalDays.add(d)
  }
  const monthPlanItems = planItems.filter((item) => item.item_date.startsWith(monthPrefix))
  const planItemsByDay = new Map<number, PlanItemRow[]>()
  const curriculumByDay = new Map<number, CurriculumSessionRow[]>()
  for (const item of monthPlanItems) {
    const d = Number(item.item_date.slice(8, 10))
    if (!Number.isFinite(d)) continue
    const items = planItemsByDay.get(d)
    if (items) items.push(item)
    else planItemsByDay.set(d, [item])
  }
  for (const session of monthSessions) {
    const d = Number(session.scheduled_for.slice(8, 10))
    if (!Number.isFinite(d)) continue
    const sessions = curriculumByDay.get(d)
    if (sessions) sessions.push(session)
    else curriculumByDay.set(d, [session])
  }
  const existingBrief = monthBrief ?? null
  const moonPhaseCount = monthBlueprint?.moonPhases.filter((mp) => mp.date.startsWith(monthPrefix)).length ?? 0
  const intentionsCount = monthBlueprint?.intentions.length ?? 0
  const keyTransitsCount = monthBlueprint?.keyTransits.length ?? 0

  // Sabian symbol — use today's Sun degree when the displayed month contains
  // today, otherwise the 15th of the displayed month. Sun moves ~1° / day so
  // this is effectively the week-midpoint reading the handoff called for.
  const sabianTargetIso = (today.year === selected.year && today.month === selected.month)
    ? `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`
    : `${monthPrefix}15`
  const sabianDay = yearEphemeris?.days.find((d) => d.date === sabianTargetIso)
  const sabian = sabianDay ? getSabianForDegree(sabianDay.sun.longitude) : null
  const sabianDateLabel = sabianDay
    ? new Date(`${sabianTargetIso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-6">
      <YearPlannerPageHeader current="month" calendarDayEnabled={calendarDayEnabled} />
      {loaded?.access.access === 'windowed' ? (
        <WindowedAccessNote windowEnd={loaded.access.windowEnd} />
      ) : null}
      <div
        className={calendarDayEnabled ? 'px-4 sm:px-6' : ''}
        style={{
          fontFamily: K.fBody,
          color: K.ink,
          background: K.bg,
          minHeight: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          ...(calendarDayEnabled ? { gridTemplateColumns: 'minmax(0, 1fr)' } : {}),
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, ...(calendarDayEnabled ? { minWidth: 0 } : {}) }}>
          <div style={calendarDayEnabled ? { minWidth: 0, flex: '1 1 auto', maxWidth: '100%' } : {}}>
            <Kicker>{MONTH_NAMES[selected.month]} · {selected.year}</Kicker>
            <div
              style={{
                fontFamily: K.fSerif,
                fontStyle: 'italic',
                fontSize: 32,
                color: K.ink,
                lineHeight: 1.1,
                marginTop: 4,
                ...(calendarDayEnabled ? { wordWrap: 'break-word' as const } : {}),
              }}
            >
              {monthBlueprint?.theme ?? 'Your year, anchored to the sky.'}
            </div>
            {monthBlueprint?.energyArc ? (
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 13,
                  color: K.inkDim,
                  lineHeight: 1.6,
                  marginTop: 10,
                  maxWidth: calendarDayEnabled ? '100%' : 720,
                  ...(calendarDayEnabled ? { wordWrap: 'break-word' as const } : {}),
                }}
              >
                {monthBlueprint.energyArc}
              </div>
            ) : null}
          </div>
          <nav className="flex items-center gap-2" aria-label="Month navigation">
            {selected.month > 0 ? (
              <Link
                href={monthChartNavHref(shiftMonth(selected.year, selected.month, -1), calendarDayEnabled)}
                className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                Previous
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
              >
                Previous
              </span>
            )}
            <Link
              href={monthChartNavHref(todayIso.slice(0, 7), calendarDayEnabled)}
              className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
            >
              This month
            </Link>
            {selected.month < 11 ? (
              <Link
                href={monthChartNavHref(shiftMonth(selected.year, selected.month, 1), calendarDayEnabled)}
                className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-4 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                Next
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 items-center rounded-full border border-border/40 px-4 text-sm text-bone-muted/35"
              >
                Next
              </span>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, ...(calendarDayEnabled ? { minWidth: 0 } : {}) }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '10px 14px',
              border: `1px solid ${K.line}`,
              borderRadius: 10,
              background: K.bg2,
              ...(calendarDayEnabled ? { minWidth: 0 } : {}),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, ...(calendarDayEnabled ? { minWidth: 0, flex: '1 1 auto' } : {}) }}>
              <span
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: K.copperHi,
                  flexShrink: 0,
                }}
              >
                Q{quarterNumber}
              </span>
              <span
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: K.ink,
                  lineHeight: 1.2,
                  ...(calendarDayEnabled ? { wordWrap: 'break-word' as const, minWidth: 0 } : {}),
                }}
              >
                {quarterBlueprint?.theme ?? 'Quarterly theme'}
              </span>
            </div>
            <div
              className={calendarDayEnabled ? 'flex flex-wrap gap-2 sm:gap-[18px]' : ''}
              style={calendarDayEnabled ? {
                fontFamily: K.fMono,
                fontSize: 11,
                letterSpacing: '0.14em',
                color: K.inkDim,
              } : {
                display: 'flex',
                gap: 18,
                fontFamily: K.fMono,
                fontSize: 11,
                letterSpacing: '0.14em',
                color: K.inkDim,
              }}
            >
              <span>{intentionsCount} INTENTIONS</span>
              <span>{keyTransitsCount} TRANSITS</span>
              <span>{monthSessions.length} SESSIONS</span>
              <span>{moonPhaseCount} MOON {moonPhaseCount === 1 ? 'PHASE' : 'PHASES'}</span>
            </div>
          </div>

          {monthBlueprint ? (
            <MonthBriefPanel
              year={selected.year}
              month={selected.month + 1}
              monthName={MONTH_NAMES[selected.month] ?? ''}
              initialBrief={existingBrief?.brief_text ?? undefined}
              initialGeneratedAt={existingBrief?.generated_at ?? undefined}
              initialEditedAt={(existingBrief as { edited_at?: string | null } | null)?.edited_at ?? undefined}
              initialPinned={Boolean(existingBrief?.pinned)}
              calendarDayEnabled={calendarDayEnabled}
            />
          ) : null}

          <div
            className={calendarDayEnabled ? 'grid gap-[14px] grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]' : ''}
            style={calendarDayEnabled ? { minHeight: 0 } : {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
              minHeight: 0,
            }}
          >
            <Frame tone="raised" padding={20} style={{ borderColor: `${K.brickHi}55` }}>
              <Kicker color={K.brickHi}>Intentions</Kicker>
              {monthBlueprint && monthBlueprint.intentions.length > 0 ? (
                <ul
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    listStyle: 'none',
                    padding: 0,
                  }}
                >
                  {monthBlueprint.intentions.map((intention) => (
                    <li
                      key={intention}
                      style={{
                        fontFamily: K.fSerif,
                        fontStyle: 'italic',
                        fontSize: 17,
                        color: K.ink,
                        lineHeight: 1.4,
                        paddingLeft: 14,
                        borderLeft: `2px solid ${K.copper}`,
                      }}
                    >
                      {intention}
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  Intentions for this month aren&apos;t in your blueprint yet.
                </div>
              )}
            </Frame>

            <Frame tone="umber" padding={20}>
              <Kicker color={K.copper}>Key transits</Kicker>
              {monthBlueprint && monthBlueprint.keyTransits.length > 0 ? (
                <ul
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    listStyle: 'none',
                    padding: 0,
                  }}
                >
                  {monthBlueprint.keyTransits.map((transit) => (
                    <li
                      key={transit}
                      style={{
                        fontFamily: K.fBody,
                        fontSize: 14,
                        color: K.ink,
                        lineHeight: 1.5,
                        display: 'flex',
                        gap: 9,
                      }}
                    >
                      <span style={{ color: K.copperHi, marginTop: 3 }}>•</span>
                      <span style={{ flex: 1 }}>{transit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  No key transits noted for this month.
                </div>
              )}
            </Frame>

            <Frame tone="cocoa" padding={20} stars>
              <Kicker color={K.copper}>Sabian symbol</Kicker>
              {sabian ? (
                <>
                  <div
                    style={{
                      fontFamily: K.fSerif,
                      fontStyle: 'italic',
                      fontSize: 17,
                      color: K.ink,
                      marginTop: 10,
                      lineHeight: 1.35,
                    }}
                  >
                    &ldquo;{sabian.symbol}&rdquo;
                  </div>
                  {sabian.interpretation ? (
                    <div
                      style={{
                        fontFamily: K.fBody,
                        fontSize: 13,
                        color: K.inkDim,
                        marginTop: 10,
                        lineHeight: 1.55,
                      }}
                    >
                      This is a symbol of {sabian.interpretation}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: K.fMono,
                      fontSize: 10,
                      color: K.inkSoft,
                      letterSpacing: '0.14em',
                      marginTop: 10,
                    }}
                  >
                    SUN · {sabian.position.toUpperCase()}
                    {sabianDateLabel ? ` · ${sabianDateLabel.toUpperCase()}` : ''}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  Ephemeris data isn&apos;t ready for this month yet.
                </div>
              )}
            </Frame>

            <Frame tone="umber" padding={20}>
              <Kicker>Curriculum</Kicker>
              {monthSessions.length > 0 ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthSessions.slice(0, 4).map((session) => (
                    <div
                      key={session.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        background: K.bg,
                        border: `1px solid ${K.line}`,
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ color: session.status === 'done' ? K.sage : K.copper, fontSize: 16 }}>◐</span>
                      <span style={{ fontFamily: K.fBody, fontSize: 14, color: K.ink, flex: 1, lineHeight: 1.3 }}>
                        {session.title}
                      </span>
                      <span style={{ fontFamily: K.fMono, fontSize: 10.5, color: K.inkSoft }}>
                        {session.estimated_minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: K.inkDim,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  No curriculum sessions scheduled this month.
                </div>
              )}
              <Link
                href="/curriculum"
                style={{
                  display: 'block',
                  fontFamily: K.fMono,
                  fontSize: 10,
                  color: K.copperHi,
                  letterSpacing: '0.14em',
                  marginTop: 12,
                  textAlign: 'right',
                  textDecoration: 'none',
                }}
              >
                BROWSE ALL TRACKS →
              </Link>
            </Frame>
          </div>

          <Frame tone="umber" padding={20}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 14,
              }}
            >
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 28, color: K.ink }}>
                {MONTH_NAMES[selected.month]}
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 11,
                  color: K.inkSoft,
                  letterSpacing: '0.14em',
                }}
              >
                WK {weekNumber} — WK {weekNumber + 4}
              </div>
            </div>
            <MonthGrid
              year={selected.year}
              month={selected.month}
              today={today}
              events={events}
              journalDays={journalDays}
              planItemsByDay={planItemsByDay}
              curriculumByDay={curriculumByDay}
              energyByDay={energyByDay}
            />
          </Frame>
        </div>

        <div style={calendarDayEnabled ? { marginTop: 24, paddingTop: 24, borderTop: `1px solid ${K.line}`, minWidth: 0 } : {}}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: calendarDayEnabled ? 10 : 6,
              ...(calendarDayEnabled ? { flexWrap: 'wrap' as const, gap: 8, minWidth: 0 } : {}),
            }}
          >
            {calendarDayEnabled ? (
              <div>
                <Kicker>Year&apos;s pulse · full year overview</Kicker>
                <div style={{ fontFamily: K.fBody, fontSize: 11, color: K.inkDim, marginTop: 4 }}>
                  Push / rest / edit rhythm across all 12 months
                </div>
              </div>
            ) : (
              <Kicker>Year&apos;s pulse · push / rest / edit</Kicker>
            )}
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 9.5,
                color: K.inkSoft,
                letterSpacing: '0.14em',
              }}
            >
              JAN — DEC{calendarDayEnabled ? ` ${selected.year}` : ''}
            </div>
          </div>
          <PushRestRibbon periods={arc} todayPct={todayPct} />
        </div>
      </div>
    </div>
  )
}
