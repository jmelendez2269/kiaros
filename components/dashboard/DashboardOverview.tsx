import Link from 'next/link'
import { Activity, ArrowUpRight, CalendarDays, Compass, FileText, MessageSquare } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { slugifyAreaName } from '@/lib/areas'
import type { BlueprintOutput, EphemerisDay, MonthBlueprint, NatalChart, WeekBlueprint, YearEphemeris } from '@/types/blueprint'

type GoalCategorySummary = {
  id: string
  name: string
  description?: string | null
  success?: string | null
  icon_key?: string | null
}

type SabianMoonSymbol = {
  symbol: string
  degreeLabel: string
}

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

function getISOWeekNumber(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getFullYear(), 0, 1))
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil(((current - yearStart.getTime()) / 86400000 + 1) / 7)
}

function sentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function phaseLabel(phase: string) {
  return phase
    .split('-')
    .map((part) => sentenceCase(part))
    .join(' ')
}

function compactWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function ensureSentence(text: string) {
  const normalized = compactWhitespace(text)
  if (!normalized) return ''
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function firstSentence(text: string) {
  const normalized = compactWhitespace(text)
  if (!normalized) return ''
  const match = normalized.match(/.*?[.!?](?:\s|$)/)
  return match ? match[0].trim() : normalized
}

function monthForWeek(months: MonthBlueprint[], week: WeekBlueprint | null): MonthBlueprint | null {
  if (!week) return null
  const monthNumber = Number.parseInt(week.startDate.slice(5, 7), 10)
  return months.find((month) => month.month === monthNumber) ?? null
}

function clampSignal(value: number) {
  return Math.max(0.14, Math.min(value, 1))
}

async function fetchCurrentMoonSabianSymbol(): Promise<SabianMoonSymbol | null> {
  try {
    const response = await fetch('https://blog.astrologyweekly.com/sabian-symbols/sabian-symbol-moon.php', {
      next: { revalidate: 60 * 60 * 6 },
    })

    if (!response.ok) return null

    const html = await response.text()
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const symbolMatch = plainText.match(/Current Sabian Symbol for the Moon\s+(.+?)\s+Sabian Symbol for/i)
    const degreeMatch = plainText.match(/Sabian Symbol for\s+(\d+º\s+[A-Za-z]+)/i)

    if (!symbolMatch?.[1]) return null

    return {
      symbol: ensureSentence(symbolMatch[1].trim()),
      degreeLabel: degreeMatch?.[1]?.trim() ?? 'Current Moon',
    }
  } catch {
    return null
  }
}

function computeDaySignals(ephemeris: EphemerisDay) {
  const applyingTransits = ephemeris.transits.filter((t) => t.applying).length
  const hardTransits = ephemeris.transits.filter(
    (t) => t.aspect === 'square' || t.aspect === 'opposition' || t.aspect === 'conjunction'
  ).length
  const exactTransits = ephemeris.transits.filter((t) => t.orb <= 1).length

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

  const lunarCharge = (() => {
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

  const lunar = clampSignal(lunarCharge + (ephemeris.moonPhaseEvent ? 0.24 : 0))

  const signals = [
    { key: 'activation', label: 'Activation', value: activation },
    { key: 'review', label: 'Review', value: review },
    { key: 'lunar', label: 'Lunar', value: lunar },
  ] as const

  const dominant = [...signals].sort((a, b) => b.value - a.value)[0]
  return { signals, dominant }
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
  return `${phaseLead} Today is good for days when you ${signLead}.`
}

function buildTransitHighlight(ephemeris: EphemerisDay | null) {
  if (!ephemeris || ephemeris.transits.length === 0) return null
  const tightest = [...ephemeris.transits].sort((a, b) => a.orb - b.orb)[0]
  return `${tightest.planet} ${tightest.aspect} natal ${tightest.natalPlanet} (${tightest.orb.toFixed(1)}° orb)`
}

function buildActiveTransitChips(ephemeris: EphemerisDay | null) {
  if (!ephemeris) return []
  return [...ephemeris.transits]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3)
    .map((t) => ({
      label: `${t.planet} ${t.aspect} ${t.natalPlanet}`,
      orb: `${t.orb.toFixed(1)}°`,
      applying: t.applying,
    }))
}

function buildNextMoonPhasePreview(yearEphemeris: YearEphemeris | null, today: string) {
  if (!yearEphemeris) return null
  const next = yearEphemeris.moonPhases.find((p) => p.date > today)
  if (!next) return null
  const date = new Date(`${next.date}T12:00:00`)
  const days = Math.round((date.getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000)
  return {
    label: `${phaseLabel(next.phase)} in ${next.sign}`,
    when: `in ${days} day${days === 1 ? '' : 's'}`,
  }
}

function buildDailyPhaseSummary({
  ephemeris,
  daySignals,
}: {
  ephemeris: EphemerisDay | null
  daySignals: ReturnType<typeof computeDaySignals> | null
}) {
  if (!ephemeris || !daySignals) {
    return {
      label: 'Orientation day',
      title: 'Listen before you organize the day',
      description:
        "Your dashboard will name the day's energetic tone once today's sky data is loaded.",
    }
  }

  if (daySignals.dominant.key === 'activation') {
    return {
      label: 'Action day',
      title: 'The day favors movement and outward traction',
      description:
        'Momentum is easier to access today, so decisions, outreach, and forward steps have more support behind them.',
    }
  }

  if (daySignals.dominant.key === 'review') {
    return {
      label: 'Recalibration day',
      title: 'The day wants edits, review, and better positioning',
      description:
        'Frictive or reflective energy is louder today, which makes revision and quieter course-correction more useful than brute force.',
    }
  }

  return {
    label: 'Lunar day',
    title: `${phaseLabel(ephemeris.moon.lunarPhase)} mood with ${ephemeris.moon.sign} emphasis`,
    description: buildLunarMessage(ephemeris),
  }
}

function formatLongDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

interface DashboardOverviewProps {
  firstName: string | null
}

export async function DashboardOverview({ firstName }: DashboardOverviewProps) {
  const supabase = await createServerSupabase()
  const today = todayISO()
  const currentYear = new Date().getFullYear()

  const [profileRes, blueprintRes, ephemerisRes, categoriesRes, oracleMemoryRes, journalEntriesRes, sabianMoonSymbol] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('display_name, birth_date, plan_year, word_of_year, year_vision, what_to_release, study_focus, natal_chart')
        .maybeSingle(),
      supabase
        .from('blueprints')
        .select('id, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods, plan_year')
        .eq('plan_year', currentYear)
        .eq('status', 'ready')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('ephemeris_cache').select('data').eq('year', currentYear).maybeSingle(),
      supabase
        .from('goal_categories')
        .select('id, name, description, success, icon_key, sort_order')
        .order('sort_order', { ascending: true }),
      supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('oracle_memory', true),
      supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
      fetchCurrentMoonSabianSymbol(),
    ])

  const profile = profileRes.data
  const categories = (categoriesRes.data ?? []) as GoalCategorySummary[]
  const blueprintRow = blueprintRes.data
  const oracleMemoryCount = oracleMemoryRes.error ? 0 : (oracleMemoryRes.count ?? 0)
  const journalEntriesCount = journalEntriesRes.error ? 0 : (journalEntriesRes.count ?? 0)
  const _natalChart = (profile?.natal_chart as NatalChart | null) ?? null
  void _natalChart
  const yearEphemeris = (ephemerisRes.data?.data as YearEphemeris | null) ?? null
  const weeks = (blueprintRow?.weeks as unknown as WeekBlueprint[]) ?? []
  const months = (blueprintRow?.months as unknown as MonthBlueprint[]) ?? []
  const _quarters = (blueprintRow?.quarters as unknown as BlueprintOutput['quarters']) ?? []
  void _quarters
  const profileName = profile?.display_name?.trim() || firstName?.trim() || 'Architect'

  if (!blueprintRow) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-6">
        <section className="shell-panel px-6 py-9 text-center md:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="shell-kicker mb-3">Awaiting architecture</p>
            <h2 className="shell-section-title text-[2rem]">
              {profileName}, your year is waiting for its first chart-driven blueprint.
            </h2>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Kiaros builds the planner from your birth data and current transits, then layers in your goals and
              customization choices afterward.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/onboarding"
                className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
              >
                Complete setup
              </Link>
              <Link
                href="/calendar"
                className="rounded-2xl border border-border/80 bg-stone-900/80 px-5 py-3 text-sm font-semibold text-bone-muted hover:text-bone"
              >
                Preview calendar shell
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const currentWeek = findCurrentWeek(weeks, today)
  const todayEphemeris = yearEphemeris ? findTodayEphemeris(yearEphemeris, today) : null
  const currentMonth = monthForWeek(months, currentWeek)
  const weekDates = deriveWeekDates(currentWeek, today)
  const todayDaySignals = todayEphemeris ? computeDaySignals(todayEphemeris) : null
  const dailyPhase = buildDailyPhaseSummary({ ephemeris: todayEphemeris, daySignals: todayDaySignals })
  const transitHighlight = buildTransitHighlight(todayEphemeris)
  const transitChips = buildActiveTransitChips(todayEphemeris)
  const nextMoonPreview = buildNextMoonPhasePreview(yearEphemeris, today)
  const displayWeekNumber = getISOWeekNumber(currentWeek?.startDate ?? today)
  const activeCategoryNames = (currentWeek?.goalCategoryFocus ?? []).slice(0, 3)
  const primaryLane = activeCategoryNames[0] || categories[0]?.name || null
  const primaryCategory = primaryLane
    ? categories.find((c) => c.name.toLowerCase() === primaryLane.toLowerCase())
    : null

  const weekRangeLabel = (() => {
    const weekStart = new Date(`${currentWeek?.startDate ?? today}T12:00:00`)
    const weekEnd = new Date(`${currentWeek?.endDate ?? today}T12:00:00`)
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
    if (sameMonth) {
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString(
        'en-US',
        { day: 'numeric' }
      )}`
    }
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' }
    )}`
  })()

  const journalSuggestion = currentWeek?.theme
    ? `Reflect on "${currentWeek.theme}"`
    : "Open a fresh page and write what's true today"
  const oracleSuggestion = transitHighlight
    ? `Ask about ${transitHighlight.split(' (')[0]}`
    : "Ask about today's pattern"

  const cards = [
    {
      id: 'calendar',
      href: '/calendar',
      icon: CalendarDays,
      title: 'Calendar',
      kicker: nextMoonPreview ? 'Next moon phase' : 'Cosmic plan',
      preview: nextMoonPreview ? `${nextMoonPreview.label} · ${nextMoonPreview.when}` : 'Year, month, and week views',
      tint: 'border-leather-400/30 bg-leather-500/10',
    },
    {
      id: 'tracker',
      href: '/tracker',
      icon: Activity,
      title: 'Tracker',
      kicker: 'Today',
      preview: dailyPhase.label,
      tint: 'border-moss-500/25 bg-moss-500/8',
    },
    {
      id: 'journal',
      href: '/journal',
      icon: FileText,
      title: 'Journal',
      kicker: `${journalEntriesCount} ${journalEntriesCount === 1 ? 'entry' : 'entries'}`,
      preview: journalSuggestion,
      tint: 'border-plum-400/25 bg-plum-400/8',
    },
    {
      id: 'oracle',
      href: '/oracle',
      icon: MessageSquare,
      title: 'Oracle',
      kicker: `${oracleMemoryCount} ${oracleMemoryCount === 1 ? 'memory' : 'memories'}`,
      preview: oracleSuggestion,
      tint: 'border-ember-400/25 bg-ember-400/8',
    },
    {
      id: 'growth',
      href: primaryLane ? `/areas/${slugifyAreaName(primaryLane)}` : '/areas',
      icon: Compass,
      title: 'Growth',
      kicker: primaryLane ? 'Active lane' : 'Life areas',
      preview: primaryLane
        ? `${primaryCategory?.icon_key ? `${primaryCategory.icon_key} ` : ''}${primaryLane}`
        : `${categories.length} life areas to explore`,
      tint: 'border-border/70 bg-stone-950/55',
    },
  ]

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      {/* HERO — Today */}
      <section className="shell-panel overflow-hidden px-5 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="shell-pill border-leather-400/30 bg-leather-500/12 text-leather-200">
            {formatLongDate(today)}
          </span>
          <span className="shell-pill border-border/70 bg-stone-950/70 text-bone-muted">
            Week {displayWeekNumber} · {weekRangeLabel}
          </span>
          {todayEphemeris ? (
            <span className="shell-pill border-border/70 bg-stone-950/70 text-bone-muted">
              {phaseLabel(todayEphemeris.moon.lunarPhase)} in {todayEphemeris.moon.sign}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:items-start">
          <div>
            <p className="shell-kicker">Today</p>
            <h1 className="mt-2 font-serif text-[2rem] leading-tight text-bone md:text-[2.5rem]">
              {currentWeek?.theme ?? dailyPhase.title}
            </h1>
            <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-bone-muted">
              {dailyPhase.description}
            </p>
            {currentWeek?.cosmicContext ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted/85">
                {firstSentence(currentWeek.cosmicContext)}
              </p>
            ) : null}

            {transitChips.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {transitChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-3 py-1.5 text-xs text-bone"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${chip.applying ? 'bg-leather-300' : 'bg-bone-muted/60'}`} />
                    <span className="font-medium">{chip.label}</span>
                    <span className="text-bone-muted/70">{chip.orb}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.15rem] border border-border/70 bg-stone-950/55 px-5 py-5">
            <div className="flex items-start gap-4">
              {todayEphemeris ? (
                <MoonPhaseIcon phase={todayEphemeris.moon.lunarPhase} size={64} />
              ) : (
                <div className="h-16 w-16 rounded-full border border-border/70 bg-stone-900/70" />
              )}
              <div className="min-w-0">
                <p className="shell-eyebrow text-bone-muted/80">Moon today</p>
                <p className="mt-1 text-base font-semibold text-bone">
                  {todayEphemeris
                    ? `${phaseLabel(todayEphemeris.moon.lunarPhase)} · ${todayEphemeris.moon.sign}`
                    : 'Awaiting ephemeris'}
                </p>
                {todayEphemeris ? (
                  <p className="mt-1 text-xs text-bone-muted/75">
                    {Math.round(todayEphemeris.moon.illumination * 100)}% illuminated
                  </p>
                ) : null}
              </div>
            </div>
            {todayEphemeris ? (
              <p className="mt-4 text-sm leading-6 text-bone-muted">{buildLunarMessage(todayEphemeris)}</p>
            ) : null}
            {sabianMoonSymbol ? (
              <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-5 text-bone-muted/80">
                <span className="font-semibold text-bone-muted">Sabian symbol</span> · {sabianMoonSymbol.symbol}
              </p>
            ) : null}
          </div>
        </div>

        {/* Week ribbon */}
        <div className="mt-6 grid grid-cols-7 gap-1.5">
          {weekDates.map((date) => {
            const display = new Date(`${date}T12:00:00`)
            const isToday = date === today
            const ephemeris = yearEphemeris?.days.find((d) => d.date === date) ?? null
            return (
              <div
                key={date}
                className={`flex flex-col items-center gap-1.5 rounded-[0.75rem] border px-1 py-2 text-center transition-colors ${
                  isToday
                    ? 'border-leather-400/55 bg-leather-500/16 text-bone shadow-glow'
                    : 'border-border/60 bg-stone-950/40 text-bone-muted/85'
                }`}
              >
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em]">
                  {display.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-base font-semibold ${isToday ? 'text-bone' : 'text-bone-muted'}`}>
                  {display.getDate()}
                </span>
                {ephemeris ? (
                  <MoonPhaseIcon phase={ephemeris.moon.lunarPhase} size={12} />
                ) : (
                  <span className="h-3 w-3 rounded-full bg-stone-800" />
                )}
              </div>
            )
          })}
        </div>

        {currentMonth ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-xs text-bone-muted/75">
              <span className="font-semibold text-bone-muted">{currentMonth.name}:</span> {currentMonth.theme}
            </p>
            <Link
              href="/blueprint"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-bone-muted hover:text-bone"
            >
              View full blueprint
              <ArrowUpRight size={12} />
            </Link>
          </div>
        ) : null}
      </section>

      {/* CARD GRID — destinations */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.id}
              href={card.href}
              className={`group flex h-full flex-col rounded-[1.15rem] border px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-leather-400/45 hover:shadow-glow ${card.tint}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] border border-border/60 bg-stone-900/70 text-bone-muted group-hover:text-bone">
                  <Icon size={18} />
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-bone-muted/40 transition-colors group-hover:text-bone-muted"
                />
              </div>
              <p className="mt-4 shell-eyebrow text-bone-muted/75">{card.kicker}</p>
              <p className="mt-1 font-serif text-[1.45rem] leading-tight text-bone">{card.title}</p>
              <p className="mt-3 text-sm leading-6 text-bone-muted group-hover:text-bone">{card.preview}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
