import Link from 'next/link'
import { Activity, ArrowRight, Brain, CalendarDays, Compass, Orbit, Stars } from 'lucide-react'
import { deriveAstrologicalYearWord } from '@/lib/astrology/year-word'
import { createServerSupabase } from '@/lib/supabase/server'
import { DailySignalsGuide } from '@/components/dashboard/DailySignalsGuide'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { getAreaDefinition, slugifyAreaName } from '@/lib/areas'
import type { BlueprintOutput, EphemerisDay, MonthBlueprint, NatalChart, WeekBlueprint, YearEphemeris } from '@/types/blueprint'

const ENERGY_TYPE_LABELS: Record<string, string> = {
  push: 'Primary lane',
  rest: 'Restoration lane',
  reflect: 'Reflection lane',
  initiate: 'Initiation lane',
}

const ENERGY_TYPE_PILLS: Record<string, string> = {
  push: 'border-leather-500/30 bg-leather-500/15 text-leather-200',
  rest: 'border-moss-500/30 bg-moss-500/15 text-moss-200',
  reflect: 'border-plum-400/30 bg-plum-400/15 text-plum-300',
  initiate: 'border-ember-400/30 bg-ember-400/15 text-ember-300',
}

const DAY_SIGNAL_STYLES = [
  'bg-leather-300',
  'bg-plum-300',
  'bg-moss-300',
] as const

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function findCurrentWeek(weeks: WeekBlueprint[], today: string): WeekBlueprint | null {
  return weeks.find((w) => w.startDate <= today && today <= w.endDate) ?? null
}

function findTodayEphemeris(yearEphemeris: YearEphemeris, today: string): EphemerisDay | null {
  return yearEphemeris.days.find((d) => d.date === today) ?? null
}

function deriveWeekDates(week: WeekBlueprint | null, today: string): string[] {
  if (week) {
    const dates: string[] = []
    const cursor = new Date(`${week.startDate}T12:00:00`)
    const end = new Date(`${week.endDate}T12:00:00`)
    while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10))
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }

  const selected = new Date(`${today}T12:00:00`)
  const dayOfWeek = selected.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  selected.setDate(selected.getDate() + mondayOffset)

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(selected)
    date.setDate(selected.getDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

function sentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function softenIntentionLanguage(text: string): string {
  if (!text) return text

  return text
    .replace(/\bI write down\b/gi, 'I name')
    .replace(/\bI identify\b/gi, 'I explore')
    .replace(/\bexact\b/gi, 'desired')
    .replace(/\bconcrete\b/gi, 'supportive')
}

function monthForWeek(months: MonthBlueprint[], week: WeekBlueprint | null): MonthBlueprint | null {
  if (!week) return null
  const monthNumber = Number.parseInt(week.startDate.slice(5, 7), 10)
  return months.find((month) => month.month === monthNumber) ?? null
}

function clampSignal(value: number) {
  return Math.max(0.14, Math.min(value, 1))
}

function computeDaySignals(ephemeris: EphemerisDay) {
  const applyingTransits = ephemeris.transits.filter((transit) => transit.applying).length
  const hardTransits = ephemeris.transits.filter((transit) =>
    transit.aspect === 'square' || transit.aspect === 'opposition' || transit.aspect === 'conjunction'
  ).length
  const exactTransits = ephemeris.transits.filter((transit) => transit.orb <= 1).length

  const activation = clampSignal(
    ephemeris.transits.length * 0.16 +
      applyingTransits * 0.14 +
      exactTransits * 0.18 +
      (ephemeris.moon.sign === 'Aries' || ephemeris.moon.sign === 'Leo' || ephemeris.moon.sign === 'Sagittarius'
        ? 0.12
        : 0)
  )

  const review = clampSignal(
    ephemeris.retrogrades.length * 0.24 +
      hardTransits * 0.14 +
      (ephemeris.transits.length === 0 ? 0.18 : 0)
  )

  const lunarPhaseCharge = (() => {
    switch (ephemeris.moon.lunarPhase) {
      case 'new':
      case 'full':
        return 0.85
      case 'first-quarter':
      case 'last-quarter':
        return 0.68
      case 'waxing-gibbous':
      case 'waning-gibbous':
        return 0.55
      default:
        return 0.4
    }
  })()

  const lunar = clampSignal(lunarPhaseCharge + (ephemeris.moonPhaseEvent ? 0.24 : 0))

  const signals = [
    {
      key: 'activation',
      label: 'Activation',
      value: activation,
      detail: 'movement, momentum, and outward push',
    },
    {
      key: 'review',
      label: 'Review',
      value: review,
      detail: 'revision, friction, and inward recalibration',
    },
    {
      key: 'lunar',
      label: 'Lunar charge',
      value: lunar,
      detail: 'moon mood, emotional tide, and phase intensity',
    },
  ] as const

  const dominant = [...signals].sort((a, b) => b.value - a.value)[0]

  return {
    signals,
    dominant,
  }
}

function buildLunarMessage(ephemeris: EphemerisDay) {
  const signThemes: Record<string, string> = {
    Aries: 'move with courage',
    Taurus: 'trust what steadies you',
    Gemini: 'follow curiosity',
    Cancer: 'listen to what feels tender',
    Leo: 'lead with heart',
    Virgo: 'tend what needs care',
    Libra: 'restore balance in connection',
    Scorpio: 'honor what is deepening',
    Sagittarius: 'follow the meaning',
    Capricorn: 'commit to what matters',
    Aquarius: 'make room for a new perspective',
    Pisces: 'move with intuition',
  }

  const phaseMessages: Record<string, string> = {
    new: 'Begin quietly.',
    'waxing-crescent': 'Nurture what is just beginning.',
    'first-quarter': 'Choose the next brave step.',
    'waxing-gibbous': 'Keep building with intention.',
    full: 'Let what is illuminated speak clearly.',
    'waning-gibbous': 'Share what is ripening.',
    'last-quarter': 'Release what no longer fits.',
    'waning-crescent': 'Rest and listen before the next beginning.',
  }

  const phaseLead = phaseMessages[ephemeris.moon.lunarPhase] ?? 'Listen to the day.'
  const signLead = signThemes[ephemeris.moon.sign] ?? 'stay close to what feels true'

  if (ephemeris.moonPhaseEvent) {
    return `${phaseLead} The moon is asking you to ${signLead}.`
  }

  return `${phaseLead} Today is good for days when you ${signLead}.`
}

interface DashboardOverviewProps {
  firstName: string | null
}

export async function DashboardOverview({ firstName }: DashboardOverviewProps) {
  const supabase = await createServerSupabase()
  const today = todayISO()
  const currentYear = new Date().getFullYear()

  const [profileRes, blueprintRes, ephemerisRes, categoriesRes] = await Promise.all([
    supabase.from('user_profiles').select('display_name, birth_date, plan_year, word_of_year, year_vision, what_to_release, study_focus, natal_chart').maybeSingle(),
    supabase
      .from('blueprints')
      .select('id, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods, plan_year')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('ephemeris_cache').select('data').eq('year', currentYear).maybeSingle(),
    supabase.from('goal_categories').select('id, name, icon_key, sort_order').order('sort_order', { ascending: true }),
  ])

  const profile = profileRes.data
  const categories = categoriesRes.data ?? []
  const blueprintRow = blueprintRes.data
  const yearEphemeris = (ephemerisRes.data?.data as YearEphemeris | null) ?? null
  const weeks = (blueprintRow?.weeks as unknown as WeekBlueprint[]) ?? []
  const months = (blueprintRow?.months as unknown as MonthBlueprint[]) ?? []
  const quarters = (blueprintRow?.quarters as unknown as BlueprintOutput['quarters']) ?? []
  const currentWeek = findCurrentWeek(weeks, today)
  const activeCategoryNames = new Set((currentWeek?.goalCategoryFocus ?? []).map((name) => name.toLowerCase()))
  const todayEphemeris = yearEphemeris ? findTodayEphemeris(yearEphemeris, today) : null
  const currentMonth = monthForWeek(months, currentWeek)
  const profileName = profile?.display_name?.trim() || firstName?.trim() || 'Architect'
  const astrologicalWord = deriveAstrologicalYearWord({
    birthDate: profile?.birth_date,
    natalChart: (profile?.natal_chart as NatalChart | null) ?? null,
    planYear: profile?.plan_year ?? currentYear,
  })
  const primaryLane = currentWeek?.goalCategoryFocus[0] || categories[0]?.name || 'Core alignment'
  const maintenanceLane = currentWeek?.energyType
    ? `${ENERGY_TYPE_LABELS[currentWeek.energyType] ?? sentenceCase(currentWeek.energyType)} rhythm`
    : 'Tend the vessel'
  const incubationLane = profile?.study_focus || profile?.word_of_year || profile?.year_vision || 'Future curriculum and reading tracks'
  const focusedAreas = (currentWeek?.goalCategoryFocus ?? []).slice(0, 3).map((areaName) => {
    const category = categories.find((item) => item.name.toLowerCase() === areaName.toLowerCase())
    const definition = getAreaDefinition(areaName)

    return {
      name: areaName,
      href: `/areas/${slugifyAreaName(areaName)}`,
      icon: category?.icon_key ?? null,
      summary: definition.summary,
      prompt: definition.plannerPrompt,
    }
  })
  const weekDates = deriveWeekDates(currentWeek, today)
  const weekPulse = weekDates.map((date) => {
    const ephemeris = yearEphemeris?.days.find((day) => day.date === date) ?? null
    const daySignals = ephemeris ? computeDaySignals(ephemeris) : null

    return {
      date,
      ephemeris,
      isToday: date === today,
      daySignals,
    }
  })
  const todayPulseSignals = weekPulse.find((day) => day.isToday)?.daySignals ?? null
  const architectureCards = quarters.slice(0, 4).map((quarter) => ({
    id: quarter.quarter,
    title: quarter.theme,
    detail: quarter.intention,
    areas: quarter.focusAreas,
  }))

  return (
    <div className="space-y-8">
      <section className="shell-panel overflow-hidden px-6 py-7 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">Kiaros Life OS</p>
            <h1 className="shell-section-title text-[2.4rem] md:text-[3rem]">
              {profileName}, your year runs on timing first and customization second.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone-muted">
              {blueprintRow?.year_theme || 'Your planner is shaped by your birth chart, current transits, and the choices you want this season to hold.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[24rem]">
            <div className="shell-panel-soft px-4 py-4">
              <p className="shell-kicker mb-2">Today</p>
              {todayEphemeris ? (
                <>
                  <div className="flex items-center gap-2 text-bone">
                    <MoonPhaseIcon phase={todayEphemeris.moon.lunarPhase} size={18} />
                    <span className="text-sm font-medium">
                      Moon in {todayEphemeris.moon.sign} - {todayEphemeris.moon.degree.toFixed(0)} deg
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-bone-muted">
                    Sun in {todayEphemeris.sun.sign} - {todayEphemeris.transits.length} active transit
                    {todayEphemeris.transits.length === 1 ? '' : 's'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-bone-muted">Today&apos;s ephemeris will appear here once your year map is generated.</p>
              )}
            </div>

            <div className="shell-panel-soft px-4 py-4">
              <p className="shell-kicker mb-2">Customization</p>
              <p className="text-sm font-medium text-bone">
                {profile?.word_of_year
                  ? `${profile.word_of_year}${astrologicalWord ? ` + ${astrologicalWord.word}` : ''}`
                  : astrologicalWord?.word || 'Word of year not set yet'}
              </p>
              <p className="mt-2 text-sm text-bone-muted">
                {astrologicalWord?.rationale || profile?.year_vision || 'Your onboarding choices become the second layer that personalizes the system.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!blueprintRow ? (
        <section className="shell-panel px-6 py-10 text-center md:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="shell-kicker mb-3">Awaiting architecture</p>
            <h2 className="shell-section-title text-[2rem]">Your Life OS is waiting for its first chart-driven blueprint.</h2>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Kiaros builds the planner from your birth data and current transits, then layers in your goals and customization choices afterward.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/onboarding" className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow">
                Complete setup
              </Link>
              <Link href="/calendar" className="rounded-2xl border border-border/80 bg-stone-900/80 px-5 py-3 text-sm font-semibold text-bone-muted hover:text-bone">
                Preview calendar shell
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-3">
            {[
              {
                kicker: 'Primary lane',
                value: primaryLane,
                percent: '60%',
                body: currentWeek?.intentions[0]
                  ? softenIntentionLanguage(currentWeek.intentions[0])
                  : blueprintRow.year_summary || 'This is the workstream the year is asking you to protect first.',
                tone: 'border-leather-500/35 bg-gradient-to-br from-leather-500/12 to-stone-900',
                icon: Orbit,
              },
              {
                kicker: 'Maintenance',
                value: maintenanceLane,
                percent: '30%',
                body: currentWeek?.cosmicContext || currentMonth?.energyArc || 'Steady support systems keep the year map usable in real life.',
                tone: 'border-moss-500/30 bg-gradient-to-br from-moss-500/10 to-stone-900',
                icon: Activity,
              },
              {
                kicker: 'Incubation',
                value: incubationLane,
                percent: '10%',
                body: profile?.study_focus || 'Curriculum, reading paths, and deeper custom inputs can layer onto the system next.',
                tone: 'border-border/70 bg-gradient-to-br from-stone-850 to-stone-900',
                icon: Brain,
              },
            ].map((lane) => {
              const Icon = lane.icon
              return (
                <article key={lane.kicker} className={`shell-panel px-6 py-6 ${lane.tone}`}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="shell-kicker">{lane.kicker}</p>
                        <span className="shell-pill border-white/10 bg-black/25 text-bone">{lane.percent}</span>
                      </div>
                      <h2 className="mt-4 text-[2rem] font-semibold leading-tight text-bone">{lane.value}</h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-black/15 text-bone-muted">
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="border-t border-border/70 pt-4 text-sm leading-7 text-bone-muted">{lane.body}</p>
                </article>
              )
            })}
          </section>

          <section className="shell-panel px-6 py-6 md:px-8">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="shell-kicker">The Week Pulse</p>
                <h2 className="mt-2 font-serif text-[2rem] text-bone">{currentWeek ? currentWeek.theme : 'Current week'}</h2>
              </div>
              {currentWeek?.energyType && (
                <span className={`shell-pill ${ENERGY_TYPE_PILLS[currentWeek.energyType] ?? ''}`}>
                  {ENERGY_TYPE_LABELS[currentWeek.energyType] ?? currentWeek.energyType}
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-7">
              {weekPulse.map(({ date, ephemeris, isToday, daySignals }) => {
                const display = new Date(`${date}T12:00:00`)
                return (
                  <div
                    key={date}
                    className={`rounded-[1.1rem] border px-3 py-4 ${isToday ? 'border-leather-400/50 bg-leather-500/18 shadow-glow' : 'border-border/70 bg-stone-950/60'}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone-muted">
                      {display.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-bone">{display.toLocaleDateString('en-US', { day: 'numeric' })}</p>
                    <p className="text-sm text-bone-muted">{display.toLocaleDateString('en-US', { month: 'short' })}</p>

                    {ephemeris ? (
                      <>
                        <div className="mt-4 flex items-center gap-2 text-sm text-bone">
                          <MoonPhaseIcon phase={ephemeris.moon.lunarPhase} size={16} />
                          <span>{ephemeris.moon.sign}</span>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          {daySignals ? (
                            daySignals.signals.map((signal, index) => (
                              <div
                                key={`${date}-${signal.key}`}
                                className={`h-1.5 rounded-full ${DAY_SIGNAL_STYLES[index] ?? 'bg-leather-300'} ${isToday ? 'shadow-[0_0_10px_rgba(212,176,136,0.2)]' : ''}`}
                                style={{ width: `${Math.round(signal.value * 100)}%` }}
                                title={`${signal.label}: ${signal.detail}`}
                                aria-label={`${signal.label}: ${signal.detail}`}
                              />
                            ))
                          ) : (
                            <>
                              <div className="h-1.5 rounded-full bg-stone-800" />
                              <div className="h-1.5 rounded-full bg-stone-800" />
                              <div className="h-1.5 rounded-full bg-stone-800" />
                            </>
                          )}
                        </div>
                        {daySignals ? (
                          <p className="mt-2 text-[0.72rem] leading-5 text-bone-muted/75">
                            {buildLunarMessage(ephemeris)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-6 text-xs text-bone-muted">Cosmic timing will settle in here shortly.</p>
                    )}
                  </div>
                )
              })}
            </div>

            {todayPulseSignals ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {todayPulseSignals.signals.map((signal, index) => (
                  <span
                    key={`pulse-${signal.key}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-3 py-1.5 text-xs text-bone-muted"
                  >
                    <span className={`h-2 w-5 rounded-full ${DAY_SIGNAL_STYLES[index] ?? 'bg-leather-300'}`} />
                    <span>{signal.label}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <DailySignalsGuide
              signalStyles={[...DAY_SIGNAL_STYLES]}
            />

            {focusedAreas.length > 0 ? (
              <div className="mt-5">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                    Top life areas activated this week
                  </p>
                  <p className="text-xs text-bone-muted/60">
                    Open an area to see the timing window, chart context, and deeper guidance.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                {focusedAreas.map((area) => (
                  <Link
                    key={area.name}
                    href={area.href}
                    className="group rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 transition-all hover:border-leather-400/40 hover:bg-leather-500/8"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-leather-200/85">
                      Most affected area
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-bone">
                          {area.icon ? `${area.icon} ${area.name}` : area.name}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-bone-muted group-hover:text-bone">
                          {area.summary}
                        </p>
                      </div>
                      <span className="shell-pill shrink-0 border-leather-400/20 bg-leather-500/10 text-leather-200">
                        Open
                      </span>
                    </div>
                    <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-bone-muted/80">
                      {area.prompt}
                    </p>
                  </Link>
                ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="shell-panel px-6 py-6 md:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="shell-kicker">Celestial Architecture</p>
                <h2 className="mt-2 font-serif text-[2rem] text-bone">{blueprintRow.plan_year} house activations and annual structure</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
                  Blueprint themes become the backbone of the year. The shell below mirrors the proof-of-concept structure, but it is now driven by your real Kiaros blueprint.
                </p>
              </div>
              <Link href="/blueprint" className="hidden items-center gap-2 rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:text-bone md:inline-flex">
                View full blueprint
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {architectureCards.length > 0 ? (
                architectureCards.map((card) => (
                  <article key={card.id} className="shell-grid-card">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="font-serif text-4xl leading-none text-bone-muted/35">{String(card.id).padStart(2, '0')}</span>
                      <div className="flex flex-wrap justify-end gap-2">
                        {card.areas.slice(0, 2).map((area) => (
                          <span key={area} className="shell-pill">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-bone">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-bone-muted">{card.detail}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.15rem] border border-border/70 bg-stone-950/60 p-6 text-sm text-bone-muted lg:col-span-2">
                  Quarter architecture will populate here as soon as your blueprint has generated quarter-level themes.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <article className="shell-panel px-6 py-6">
              <p className="shell-kicker">Customization Layer</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold text-bone">Words of the year</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {astrologicalWord ? (
                  <div className="rounded-[1rem] border border-leather-400/30 bg-leather-500/10 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-leather-200/85">Astrological</p>
                    <p className="mt-2 text-lg text-bone">{astrologicalWord.word}</p>
                  </div>
                ) : null}
                {profile?.word_of_year ? (
                  <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-bone-muted/70">Personal</p>
                    <p className="mt-2 text-lg text-bone">{profile.word_of_year}</p>
                  </div>
                ) : null}
                {!astrologicalWord && !profile?.word_of_year ? (
                  <p className="text-lg text-leather-200">Add during onboarding</p>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-bone-muted">
                {astrologicalWord?.rationale || profile?.what_to_release || 'This area will hold release themes, pivots, and other user-defined yearly anchors.'}
              </p>
              {profile?.what_to_release ? (
                <p className="mt-3 text-sm leading-7 text-bone-muted/80">
                  Release theme: {profile.what_to_release}
                </p>
              ) : null}
            </article>

            <article className="shell-panel px-6 py-6">
              <p className="shell-kicker">Curriculum</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold text-bone">Study tracks and reading</h2>
              <p className="mt-4 text-sm leading-7 text-bone-muted">
                {profile?.study_focus || 'Curriculum topics, books, and skill arcs can live here as their own layer instead of being folded into your goal-success prompts.'}
              </p>
              {!profile?.study_focus ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-stone-950/60 p-4 text-sm text-bone-muted">
                  Example future use: Secret Doctrine, music theory, custom reading sprints.
                </div>
              ) : null}
              <Link href="/curriculum" className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-900/70 px-4 py-2 text-sm font-semibold text-bone-muted hover:text-bone">
                Open curriculum builder
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className="shell-panel px-6 py-6">
              <p className="shell-kicker">Focus Areas</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold text-bone">Life areas in motion</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {categories.length > 0 ? (
                  categories.slice(0, 6).map((category) => (
                    <Link
                      key={category.id}
                      href={`/areas/${slugifyAreaName(category.name)}`}
                      className={`group rounded-[1rem] border px-4 py-4 transition-all ${
                        activeCategoryNames.has(category.name.toLowerCase())
                          ? 'border-leather-400/50 bg-leather-500/14 shadow-glow'
                          : 'border-border/70 bg-stone-950/60 hover:border-leather-400/35 hover:bg-leather-500/8'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-bone">
                            {category.icon_key ? `${category.icon_key} ${category.name}` : category.name}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/65">
                            {activeCategoryNames.has(category.name.toLowerCase()) ? 'Active this week' : 'Open life area'}
                          </p>
                        </div>
                        <span className={`shell-pill shrink-0 ${activeCategoryNames.has(category.name.toLowerCase()) ? 'border-leather-400/25 bg-leather-500/12 text-leather-200' : ''}`}>
                          Open
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <span className="text-sm text-bone-muted">Goal categories will appear here once your customization layer is filled in.</span>
                )}
              </div>
            </article>
          </section>

          <section className="flex flex-wrap gap-3">
            <Link href="/calendar" className="inline-flex items-center gap-2 rounded-2xl border border-leather-400/45 bg-leather-500/25 px-5 py-3 text-sm font-semibold text-bone shadow-glow">
              <CalendarDays size={16} />
              Open cosmic plan
            </Link>
            <Link href="/tracker" className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-900/70 px-5 py-3 text-sm font-semibold text-bone-muted hover:text-bone">
              <Compass size={16} />
              Open tracker
            </Link>
            <Link href="/oracle" className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-900/70 px-5 py-3 text-sm font-semibold text-bone-muted hover:text-bone">
              <Stars size={16} />
              Ask the oracle
            </Link>
            <Link href="/curriculum" className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-900/70 px-5 py-3 text-sm font-semibold text-bone-muted hover:text-bone">
              <Brain size={16} />
              Build curriculum
            </Link>
          </section>
        </>
      )}
    </div>
  )
}
