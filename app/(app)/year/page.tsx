import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CosmicPlanView } from '@/components/cosmic-plan/CosmicPlanView'
import { WeekView } from '@/components/calendar/WeekView'
import { YearChartShell } from '@/components/year/YearChartShell'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createServerSupabase } from '@/lib/supabase/server'
import type { EphemerisDay, YearEphemeris } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { Frame, Kicker, K } from '@/components/almanac'
import { YearViewSwitcher } from '@/components/year/YearViewSwitcher'
import { MonthGrid, type DayEvent } from '@/components/year/MonthGrid'
import { PushRestRibbon, type ArcPeriod } from '@/components/year/PushRestRibbon'
import { MONTH_NAMES as CAL_MONTH_NAMES } from '@/components/calendar/utils'

type View = 'year' | 'month' | 'week'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface SearchParams {
  view?: string
  month?: string
  date?: string
}

function parseView(raw: string | undefined): View {
  if (raw === 'month') return 'month'
  if (raw === 'week') return 'week'
  return 'year'
}

function parseMonth(raw: string | undefined, fallback: { year: number; month: number }) {
  if (!raw) return fallback
  const match = /^(\d{4})-(\d{2})$/.exec(raw)
  if (!match) return fallback
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (!Number.isFinite(year) || month < 0 || month > 11) return fallback
  return { year, month }
}

function parseDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw) return fallbackIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallbackIso
  return raw
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

function placeholderEvents(month: number): DayEvent[] {
  if (month === 4) {
    return [
      { day: 7, tag: 'New ☾ Taurus', tone: K.copper },
      { day: 15, tag: 'Today', tone: K.copperHi },
      { day: 22, tag: 'Full ☾ Scorpio', tone: K.copper },
      { day: 26, tag: 'Mercury cazimi', tone: K.sage },
    ]
  }
  return []
}

function placeholderArc(): ArcPeriod[] {
  return [
    { kind: 'push', startPct: 0, endPct: 14, label: 'PUSH · Year arc opens' },
    { kind: 'rest', startPct: 14, endPct: 22, label: 'REST · Editorial pause' },
    { kind: 'push', startPct: 22, endPct: 48, label: 'PUSH · Build Q2' },
    { kind: 'rest', startPct: 48, endPct: 56, label: 'REST · Solstice rest' },
    { kind: 'push', startPct: 56, endPct: 78, label: 'PUSH · Ripen the work' },
    { kind: 'edit', startPct: 78, endPct: 88, label: 'EDIT · Cull & close' },
    { kind: 'rest', startPct: 88, endPct: 100, label: 'REST · Year closes' },
  ]
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

async function loadYearData() {
  const loaded = await loadCurrentBlueprint()
  if (!loaded) return { loaded: null, yearEphemeris: null, curriculumSessions: [] as CurriculumSessionRow[] }

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

  return {
    loaded,
    yearEphemeris: (ephemerisRes.data?.data as YearEphemeris | null) ?? null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
  }
}

export default async function YearPage({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const params = await searchParams
  const view = parseView(params.view)

  if (view === 'month') {
    return <MonthChartView searchParams={params} />
  }

  if (view === 'week') {
    return <WeekChartView searchParams={params} />
  }

  return <YearChartView />
}

function NoBlueprintCard() {
  const currentYear = new Date().getFullYear()
  return (
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
  )
}

function PageHeader({ current }: { current: View }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="shell-kicker mb-3">Cosmic Plan</p>
        <h1 className="shell-section-title">
          Planner built from your chart and this year&apos;s sky
        </h1>
      </div>
      <YearViewSwitcher current={current} />
    </div>
  )
}

async function YearChartView() {
  const { loaded, yearEphemeris } = await loadYearData()

  return (
    <div className="space-y-6">
      <PageHeader current="year" />
      {loaded ? (
        <div className="space-y-6">
          {yearEphemeris ? (
            <YearChartShell yearEphemeris={yearEphemeris} weeks={loaded.blueprint.weeks} />
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
        <NoBlueprintCard />
      )}
    </div>
  )
}

async function WeekChartView({ searchParams }: { searchParams: SearchParams }) {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const selectedDate = parseDate(searchParams.date, todayIso)

  const { loaded, yearEphemeris, curriculumSessions } = await loadYearData()

  if (!loaded || !yearEphemeris) {
    return (
      <div className="space-y-6">
        <PageHeader current="week" />
        {loaded ? (
          <div className="shell-panel px-6 py-8">
            <p className="shell-kicker mb-3">Cosmic Calendar</p>
            <h2 className="shell-section-title">Week data is still forming</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-bone-muted">
              Your {loaded.planYear} sky map will appear here once the ephemeris cache is available.
            </p>
          </div>
        ) : (
          <NoBlueprintCard />
        )}
      </div>
    )
  }

  const dayMap = new Map<string, EphemerisDay>()
  for (const day of yearEphemeris.days) dayMap.set(day.date, day)
  const curriculumByDate = new Map<string, CurriculumSessionRow[]>()
  for (const session of curriculumSessions) {
    const current = curriculumByDate.get(session.scheduled_for) ?? []
    current.push(session)
    curriculumByDate.set(session.scheduled_for, current)
  }

  const monthIdx = Number(selectedDate.slice(5, 7)) - 1
  const monthName = CAL_MONTH_NAMES[monthIdx] ?? ''

  return (
    <div className="space-y-6">
      <PageHeader current="week" />
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/year" className="text-bone-muted transition-colors hover:text-bone">
          {yearEphemeris.year}
        </Link>
        <span className="text-bone-muted/40">/</span>
        <Link
          href={`/year?view=month&month=${selectedDate.slice(0, 7)}`}
          className="text-bone-muted transition-colors hover:text-bone"
        >
          {monthName}
        </Link>
        <span className="text-bone-muted/40">/</span>
        <span className="text-bone">Week</span>
      </nav>
      <WeekView
        selectedDate={selectedDate}
        dayMap={dayMap}
        weeks={loaded.blueprint.weeks}
        curriculumByDate={curriculumByDate}
        today={todayIso}
      />
    </div>
  )
}

function MonthChartView({ searchParams }: { searchParams: SearchParams }) {
  const now = new Date()
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
  const selected = parseMonth(searchParams.month, { year: today.year, month: today.month })

  const weekStart = new Date(selected.year, selected.month, 1)
  const weekNumber = isoWeek(weekStart)
  const events = placeholderEvents(selected.month)
  const arc = placeholderArc()
  const todayPct = (dayOfYear(now) / 365) * 100

  return (
    <div className="space-y-6">
      <PageHeader current="month" />
      <div
        style={{
          fontFamily: K.fBody,
          color: K.ink,
          background: K.bg,
          minHeight: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Kicker>Year · {selected.year}</Kicker>
            <div
              style={{
                fontFamily: K.fSerif,
                fontStyle: 'italic',
                fontSize: 32,
                color: K.ink,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              Your year, anchored to the sky.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, minHeight: 0 }}>
          <Frame tone="umber" padding={18}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink }}>
                {MONTH_NAMES[selected.month]}
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10,
                  color: K.inkSoft,
                  letterSpacing: '0.14em',
                }}
              >
                WK {weekNumber} — WK {weekNumber + 4}
              </div>
            </div>
            <MonthGrid year={selected.year} month={selected.month} today={today} events={events} />
          </Frame>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <Frame tone="raised" padding={18} style={{ borderColor: `${K.brickHi}55` }}>
              <Kicker color={K.brickHi}>{MONTH_NAMES[selected.month]} brief</Kicker>
              <div
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: K.ink,
                  marginTop: 6,
                  lineHeight: 1.2,
                }}
              >
                Brief is generated per month.
              </div>
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 12,
                  color: K.inkDim,
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                Cached Claude generation drawing on your blueprint and the month&apos;s transits.
                Layout placeholder until that wiring lands.
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: K.fMono,
                  fontSize: 9.5,
                  color: K.copperHi,
                  letterSpacing: '0.14em',
                }}
              >
                FOCUS · PLACEHOLDER
              </div>
            </Frame>

            <Frame tone="cocoa" padding={16} stars>
              <Kicker color={K.copper}>Sabian for this week</Kicker>
              <div
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: K.ink,
                  marginTop: 8,
                  lineHeight: 1.3,
                }}
              >
                &quot;A symbol drawn from the sun&apos;s degree this week.&quot;
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 9,
                  color: K.inkSoft,
                  letterSpacing: '0.14em',
                  marginTop: 8,
                }}
              >
                SUN · — °
              </div>
            </Frame>

            <Frame tone="umber" padding={16}>
              <Kicker>Curriculum</Kicker>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Sample track · placeholder', minutes: '12 min', tone: K.copper },
                  { label: 'Another track · placeholder', minutes: '8 min', tone: K.sage },
                ].map((t) => (
                  <div
                    key={t.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: K.bg,
                      border: `1px solid ${K.line}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ color: t.tone, fontSize: 14 }}>◐</span>
                    <span style={{ fontFamily: K.fBody, fontSize: 12, color: K.ink, flex: 1 }}>
                      {t.label}
                    </span>
                    <span style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft }}>
                      {t.minutes}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 9,
                  color: K.copperHi,
                  letterSpacing: '0.14em',
                  marginTop: 10,
                  textAlign: 'right',
                }}
              >
                BROWSE ALL TRACKS →
              </div>
            </Frame>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <Kicker>Year&apos;s pulse · push / rest / edit</Kicker>
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 9.5,
                color: K.inkSoft,
                letterSpacing: '0.14em',
              }}
            >
              JAN — DEC
            </div>
          </div>
          <PushRestRibbon periods={arc} todayPct={todayPct} />
        </div>
      </div>
    </div>
  )
}
