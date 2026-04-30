import Link from 'next/link'
import { Activity, ArrowRight, Brain, CalendarDays, Compass, Orbit, Stars } from 'lucide-react'
import { deriveAstrologicalYearWord } from '@/lib/astrology/year-word'
import { createServerSupabase } from '@/lib/supabase/server'
import { DailySignalsGuide } from '@/components/dashboard/DailySignalsGuide'
import { DashboardHeroInsights } from '@/components/dashboard/DashboardHeroInsights'
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

const ENERGY_WEEK_GUIDANCE: Record<
  string,
  {
    title: string
    approach: string
    bestUse: string
  }
> = {
  push: {
    title: 'Move it forward',
    approach: 'This is a week for visible movement, firmer decisions, and putting weight behind what is already alive.',
    bestUse: 'Best use: choose one meaningful push instead of scattering yourself across five starts.',
  },
  rest: {
    title: 'Protect your reserves',
    approach: 'This is a week for maintenance, pacing, and protecting your energy so the larger cycle can keep unfolding.',
    bestUse: 'Best use: simplify, restore, and only keep the promises that still feel supportive.',
  },
  reflect: {
    title: 'Review and recalibrate',
    approach: 'This is a week for edits, reflection, and noticing what wants a gentler or wiser adjustment.',
    bestUse: 'Best use: revise the plan, rethink the approach, and let clarity catch up before pushing harder.',
  },
  initiate: {
    title: 'Start the thread',
    approach: 'This is a week for brave beginnings, first moves, and opening a door that has been waiting for attention.',
    bestUse: 'Best use: make one clean start, then protect enough space for it to take root.',
  },
}

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

function phaseLabel(phase: string) {
  return phase
    .split('-')
    .map((part) => sentenceCase(part))
    .join(' ')
}

function sentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
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

function lowercaseFirst(text: string) {
  if (!text) return text
  return text.charAt(0).toLowerCase() + text.slice(1)
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

function intentionToAction(text: string) {
  const softened = softenIntentionLanguage(text)
  const withoutLead = compactWhitespace(softened).replace(/^I\s+/i, '')

  return withoutLead ? lowercaseFirst(withoutLead) : ''
}

function formatList(items: string[]) {
  const cleaned = [...new Set(items.map((item) => compactWhitespace(item)).filter(Boolean))]

  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`

  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned.at(-1)}`
}

function summarizeStudyFocus(text: string | null | undefined) {
  if (!text) return null

  const items = text
    .split(/[,;]+/)
    .map((item) => compactWhitespace(item))
    .filter(Boolean)

  if (items.length >= 2) {
    return {
      label: `${items[0]} + ${items[1]}`,
      detail: formatList(items.slice(0, 2)),
    }
  }

  const normalized = compactWhitespace(text)
  return {
    label: normalized.length > 34 ? `${normalized.slice(0, 31).trimEnd()}...` : normalized,
    detail: normalized,
  }
}

function categoryDetail(name: string, categories: GoalCategorySummary[]) {
  const category = categories.find((item) => item.name.toLowerCase() === name.toLowerCase())
  const fallback = getAreaDefinition(name)

  return {
    icon: category?.icon_key ?? null,
    summary: ensureSentence(firstSentence(category?.success || category?.description || fallback.plannerPrompt)),
  }
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

function buildTransitHighlight(ephemeris: EphemerisDay | null) {
  if (!ephemeris) {
    return 'Today’s transit pattern will settle in once your ephemeris is available.'
  }

  if (ephemeris.transits.length === 0) {
    return 'The sky is relatively quiet today, so your pacing matters more than forcing momentum.'
  }

  const mostExactTransit = [...ephemeris.transits].sort((a, b) => a.orb - b.orb)[0]
  const aspectLabel = sentenceCase(mostExactTransit.aspect)
  const applyingLabel = mostExactTransit.applying ? 'applying' : 'separating'

  return `${mostExactTransit.planet} ${aspectLabel.toLowerCase()} natal ${mostExactTransit.natalPlanet} is the tightest thread today (${applyingLabel}, ${mostExactTransit.orb.toFixed(1)}° orb).`
}

function formatTransitLine(transit: EphemerisDay['transits'][number]) {
  return `${transit.planet} ${transit.aspect} natal ${transit.natalPlanet} (${transit.applying ? 'applying' : 'separating'}, ${transit.orb.toFixed(1)}° orb)`
}

function buildActiveTransitItems(ephemeris: EphemerisDay | null) {
  if (!ephemeris || ephemeris.transits.length === 0) {
    return []
  }

  return [...ephemeris.transits]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 4)
    .map(formatTransitLine)
}

function buildUpcomingTransitItems(yearEphemeris: YearEphemeris, today: string) {
  const upcomingItems: string[] = []
  const seenTransitKeys = new Set<string>()

  const nextMoonPhase = yearEphemeris.moonPhases.find((phase) => phase.date > today)
  if (nextMoonPhase) {
    upcomingItems.push(
      `${phaseLabel(nextMoonPhase.phase)} Moon in ${nextMoonPhase.sign} on ${new Date(`${nextMoonPhase.date}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`
    )
  }

  for (const day of yearEphemeris.days) {
    if (day.date <= today) continue

    const sortedTransits = [...day.transits].sort((a, b) => a.orb - b.orb)
    for (const transit of sortedTransits) {
      const key = `${transit.planet}-${transit.aspect}-${transit.natalPlanet}`
      if (seenTransitKeys.has(key)) continue

      seenTransitKeys.add(key)
      upcomingItems.push(
        `${transit.planet} ${transit.aspect} natal ${transit.natalPlanet} on ${new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} (${transit.orb.toFixed(1)}° orb)`
      )

      if (upcomingItems.length >= 4) {
        return upcomingItems
      }
    }
  }

  return upcomingItems
}

function buildDailyPhaseSummary({
  ephemeris,
  daySignals,
  currentWeek,
}: {
  ephemeris: EphemerisDay | null
  daySignals: ReturnType<typeof computeDaySignals> | null
  currentWeek: WeekBlueprint | null
}) {
  if (!ephemeris || !daySignals) {
    return {
      label: 'Orientation day',
      title: 'Listen before you organize the day',
      description: 'Your dashboard will name the day’s energetic tone once today’s sky data is loaded.',
      support: 'Use the morning to notice what feels open, heavy, or unfinished before you commit your energy.',
    }
  }

  if (daySignals.dominant.key === 'activation') {
    return {
      label: 'Action day',
      title: 'The day favors movement and outward traction',
      description: 'Momentum is easier to access today, so decisions, outreach, and forward steps have more support behind them.',
      support: currentWeek?.intentions[0]
        ? `Best use: ${intentionToAction(currentWeek.intentions[0])}.`
        : 'Best use: choose one visible move and give it the strongest part of your energy.',
    }
  }

  if (daySignals.dominant.key === 'review') {
    return {
      label: 'Recalibration day',
      title: 'The day wants edits, review, and better positioning',
      description: 'Frictive or reflective energy is louder today, which makes revision, cleanup, and quieter course-correction more useful than brute force.',
      support: 'Best use: refine the plan, revisit the details, and let clarity arrive before pushing the next step.',
    }
  }

  return {
    label: 'Lunar day',
    title: `${phaseLabel(ephemeris.moon.lunarPhase)} mood with ${ephemeris.moon.sign} emphasis`,
    description: buildLunarMessage(ephemeris),
    support: ephemeris.moonPhaseEvent
      ? `The ${phaseLabel(ephemeris.moonPhaseEvent.phase)} intensifies the emotional weather today.`
      : 'Best use: leave more room for intuition, feeling, and atmosphere to shape the pace.',
  }
}

interface DashboardOverviewProps {
  firstName: string | null
}

export async function DashboardOverview({ firstName }: DashboardOverviewProps) {
  const supabase = await createServerSupabase()
  const today = todayISO()
  const currentYear = new Date().getFullYear()

  const [profileRes, blueprintRes, ephemerisRes, categoriesRes, oracleMemoryRes, journalEntriesRes, sabianMoonSymbol] = await Promise.all([
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
    supabase.from('goal_categories').select('id, name, description, success, icon_key, sort_order').order('sort_order', { ascending: true }),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('oracle_memory', true),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
    fetchCurrentMoonSabianSymbol(),
  ])

  const profile = profileRes.data
  const categories = (categoriesRes.data ?? []) as GoalCategorySummary[]
  const blueprintRow = blueprintRes.data
  const oracleMemoryCount = oracleMemoryRes.error ? 0 : (oracleMemoryRes.count ?? 0)
  const journalEntriesCount = journalEntriesRes.error ? 0 : (journalEntriesRes.count ?? 0)
  const natalChart = (profile?.natal_chart as NatalChart | null) ?? null
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
    ? ENERGY_WEEK_GUIDANCE[currentWeek.energyType]?.title || `${ENERGY_TYPE_LABELS[currentWeek.energyType] ?? sentenceCase(currentWeek.energyType)} rhythm`
    : 'Tend the vessel'
  const studyFocusSummary = summarizeStudyFocus(profile?.study_focus)
  const secondaryAreas = (currentWeek?.goalCategoryFocus ?? []).slice(1, 3)
  const incubationLane =
    secondaryAreas.length > 0
      ? formatList(secondaryAreas)
      : studyFocusSummary?.label || profile?.word_of_year || profile?.year_vision || 'Long-range thread'
  const primaryDetail = categoryDetail(primaryLane, categories)
  const secondaryDetails = secondaryAreas.map((areaName) => categoryDetail(areaName, categories).summary)
  const primaryAction = currentWeek?.intentions[0]
    ? `Focus on ${intentionToAction(currentWeek.intentions[0])}.`
    : 'Focus on the part of life that is asking for your clearest attention.'
  const energyGuidance = currentWeek?.energyType ? ENERGY_WEEK_GUIDANCE[currentWeek.energyType] : null
  const secondarySupport = secondaryDetails[0]
    ? ensureSentence(firstSentence(secondaryDetails[0]))
    : studyFocusSummary
      ? `Let ${studyFocusSummary.detail.toLowerCase()} stay exploratory and low-pressure.`
      : 'Keep this lane steady in the background instead of turning it into another main push.'
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
  const dailyPhase = buildDailyPhaseSummary({
    ephemeris: todayEphemeris,
    daySignals: todayPulseSignals,
    currentWeek,
  })
  const transitHighlight = buildTransitHighlight(todayEphemeris)
  const moonPreview = todayEphemeris
    ? `${phaseLabel(todayEphemeris.moon.lunarPhase)} in ${todayEphemeris.moon.sign}`
    : 'Moon insight pending'
  const moonDetail = todayEphemeris
    ? [
        `${phaseLabel(todayEphemeris.moon.lunarPhase)} in ${todayEphemeris.moon.sign} sets the emotional weather today.`,
        `Illumination is ${Math.round(todayEphemeris.moon.illumination * 100)}%.`,
        buildLunarMessage(todayEphemeris),
        sabianMoonSymbol ? `Sabian symbol: ${sabianMoonSymbol.symbol}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : 'Today\'s moon signature will appear here once your ephemeris is available.'
  const weekStartLabel = currentWeek
    ? new Date(`${currentWeek.startDate}T12:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : new Date(`${today}T12:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
  const displayWeekNumber = getISOWeekNumber(currentWeek?.startDate ?? today)
  const weekRangeLabel = (() => {
    const weekStart = new Date(`${currentWeek?.startDate ?? today}T12:00:00`)
    const weekEnd = new Date(`${currentWeek?.endDate ?? today}T12:00:00`)

    const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear()
    if (sameMonth) {
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', {
        day: 'numeric',
        year: 'numeric',
      })}`
    }

    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  })()
  const activeTransitItems = buildActiveTransitItems(todayEphemeris)
  const upcomingTransitItems = yearEphemeris ? buildUpcomingTransitItems(yearEphemeris, today) : []
  const heroInsights = [
    {
      id: 'daily-phase',
      kicker: 'Daily phase',
      title: dailyPhase.title,
      preview: dailyPhase.label,
      detail: `${dailyPhase.description} ${dailyPhase.support}`,
      accent: 'leather' as const,
    },
    {
      id: 'transit-emphasis',
      kicker: 'Transit emphasis',
      title: currentWeek?.theme || 'Today\'s weather',
      preview: currentWeek?.energyType ? sentenceCase(currentWeek.energyType) : 'Sky pattern',
      detail: `${transitHighlight} ${ensureSentence(currentWeek?.cosmicContext || currentMonth?.energyArc || 'This section translates the sky into pacing, emphasis, and timing.')}`,
      accent: 'plum' as const,
    },
    {
      id: 'moon-of-day',
      kicker: 'Moon of the day',
      title: moonPreview,
      preview: sabianMoonSymbol?.degreeLabel || `${todayEphemeris?.moon.sign || 'Moon'} tone`,
      detail: moonDetail,
      accent: 'default' as const,
    },
  ]
  const architectureCards = quarters.slice(0, 4).map((quarter) => ({
    id: quarter.quarter,
    title: quarter.theme,
    detail: quarter.intention,
    areas: quarter.focusAreas,
  }))

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <section className="shell-panel overflow-hidden px-4 py-4 md:px-5 md:py-5">
        <div className="mb-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="text-bone-muted" />
              <p className="font-serif text-[1.25rem] tracking-[0.03em] text-bone md:text-[1.35rem]">Weekly Execution Map</p>
            </div>
            <p className="hidden">
              Start with the week’s energetic read, then jump into the places where your reflections, memory, and deeper architecture already live.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="shell-pill border-leather-400/30 bg-leather-500/12 text-leather-200">
                Week {displayWeekNumber}
              </span>
              <span className="shell-pill border-border/70 bg-stone-950/70 text-bone-muted">
                {weekRangeLabel}
              </span>
              <span className="hidden">
                {maintenanceLane}
              </span>
            </div>
            <div className="hidden">
              <div className="rounded-[0.95rem] border border-border/60 bg-stone-900/60 px-3.5 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-bone-muted/65">Operating layer</p>
                <p className="mt-2 text-base font-medium text-bone">{maintenanceLane}</p>
                <p className="mt-1 text-sm leading-6 text-bone-muted">{firstSentence(currentWeek?.cosmicContext || currentMonth?.energyArc || transitHighlight)}</p>
              </div>
              <div className="rounded-[0.95rem] border border-border/60 bg-stone-900/60 px-3.5 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-bone-muted/65">Primary focus</p>
                <p className="mt-2 text-base font-medium text-bone">{primaryLane}</p>
                <p className="mt-1 text-sm leading-6 text-bone-muted">{primaryAction}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.15rem] border border-border/70 bg-stone-950/35">
          <div className="grid gap-0 xl:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="border-b border-border/70 px-4 py-4 xl:border-b-0 xl:border-r md:px-5 md:py-5">
              <p className="font-serif text-[1.8rem] leading-none text-bone md:text-[1.95rem]">
                Week {displayWeekNumber}
              </p>
              <p className="mt-2.5 text-[0.78rem] uppercase tracking-[0.16em] text-bone-muted/72">Week of year</p>
              <p className="mt-1 text-[0.95rem] text-bone-muted">{weekRangeLabel}</p>
              <p className="mt-1 text-sm text-bone-muted/70">Starts {weekStartLabel}</p>

              <div className="mt-5 max-w-[12.5rem] rounded-[0.9rem] border border-border/70 bg-stone-900/75 px-3 py-2.5">
                <p className="text-[0.9rem] leading-6 text-bone-muted">
                  {firstSentence(currentWeek?.cosmicContext || currentMonth?.energyArc || transitHighlight)}
                </p>
              </div>

              <div className="mt-6">
                <p className="shell-kicker text-bone-muted/60">Climate</p>
                <p className="mt-2.5 max-w-[10.5rem] font-serif text-[0.95rem] italic leading-7 text-bone/92">
                  "{dailyPhase.label}"
                </p>
              </div>
            </div>

            <div className="px-4 py-4 md:px-5 md:py-5">
              <div className="mb-2.5">
                <DashboardHeroInsights insights={heroInsights} />
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
                <article className="rounded-[1rem] border border-border/70 bg-stone-900/80 px-4 py-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-leather-200/75">
                    Current active transits
                  </p>
                  {activeTransitItems.length > 0 ? (
                    <div className="mt-4 space-y-3.5">
                      {activeTransitItems.map((transit, index) => (
                        <div key={`${transit}-${index}`} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full border border-bone-muted/35 text-[0.72rem] text-bone-muted">
                            {index + 1}
                          </span>
                          <p className="text-[0.98rem] font-medium leading-[1.625rem] text-bone">{transit}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 max-w-[34rem] text-[0.95rem] leading-[1.625rem] text-bone-muted">
                      The sky is relatively quiet today, so the strongest signal is pacing and follow-through rather than a major exact hit.
                    </p>
                  )}
                </article>

                <article className="rounded-[1rem] border border-border/70 bg-stone-900/80 px-4 py-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-moss-200/75">
                    Upcoming transits
                  </p>
                  {upcomingTransitItems.length > 0 ? (
                    <div className="mt-4 space-y-3.5">
                      {upcomingTransitItems.map((transit, index) => (
                        <div key={`${transit}-${index}`} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full border border-bone-muted/35 text-[0.72rem] text-bone-muted">
                            {index + 1}
                          </span>
                          <p className="text-[0.98rem] font-medium leading-[1.625rem] text-bone">{transit}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 max-w-[34rem] text-[0.95rem] leading-[1.625rem] text-bone-muted">
                      The next meaningful transit window will appear here once the upcoming sky pattern is available.
                    </p>
                  )}
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!blueprintRow ? (
        <section className="shell-panel px-6 py-9 text-center md:px-8">
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
          <section className="grid gap-4 xl:grid-cols-3">
            {[
              {
                kicker: 'Primary lane',
                value: primaryDetail.icon ? `${primaryDetail.icon} ${primaryLane}` : primaryLane,
                percent: '60%',
                body: [
                  `Put most of your weekly energy into ${primaryLane.toLowerCase()}.`,
                  primaryAction,
                  primaryDetail.summary,
                ]
                  .filter(Boolean)
                  .join(' '),
                tone: 'border-leather-500/35 bg-gradient-to-br from-leather-500/12 to-stone-900',
                icon: Orbit,
              },
              {
                kicker: 'How to work it',
                value: maintenanceLane,
                percent: '30%',
                body: [
                  energyGuidance?.approach,
                  ensureSentence(currentWeek?.cosmicContext || currentMonth?.energyArc || 'Let the sky set the pacing instead of forcing a rhythm that is not there.'),
                  energyGuidance?.bestUse,
                ]
                  .filter(Boolean)
                  .join(' '),
                tone: 'border-moss-500/30 bg-gradient-to-br from-moss-500/10 to-stone-900',
                icon: Activity,
              },
              {
                kicker: 'Background thread',
                value: incubationLane,
                percent: '10%',
                body: [
                  secondaryAreas.length > 0
                    ? `Keep ${formatList(secondaryAreas).toLowerCase()} moving with a lighter touch while ${primaryLane.toLowerCase()} gets the strongest push.`
                    : 'Keep this as a quieter, longer-range thread rather than another urgent project.',
                  secondarySupport,
                ]
                  .filter(Boolean)
                  .join(' '),
                tone: 'border-border/70 bg-gradient-to-br from-stone-850 to-stone-900',
                icon: Brain,
              },
            ].map((lane) => {
              const Icon = lane.icon
              return (
                <article key={lane.kicker} className={`shell-panel px-4 py-4 md:px-5 md:py-5 ${lane.tone}`}>
                  <div className="mb-3.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="shell-kicker">{lane.kicker}</p>
                        <span className="shell-pill border-white/10 bg-black/25 text-bone">{lane.percent}</span>
                      </div>
                      <h2 className="mt-2.5 text-[1.35rem] font-semibold leading-[1.1] text-bone md:text-[1.55rem]">{lane.value}</h2>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-border/70 bg-black/15 text-bone-muted">
                      <Icon size={16} />
                    </div>
                  </div>
                  <p className="border-t border-border/70 pt-3.5 text-[0.92rem] leading-[1.625rem] text-bone-muted">{lane.body}</p>
                </article>
              )
            })}
          </section>

          <section className="shell-panel px-5 py-5 md:px-6 md:py-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="shell-kicker">The Week Pulse</p>
                <h2 className="mt-2 font-serif text-[1.75rem] text-bone md:text-[1.9rem]">{currentWeek ? currentWeek.theme : 'Current week'}</h2>
              </div>
              {currentWeek?.energyType && (
                <span className={`shell-pill ${ENERGY_TYPE_PILLS[currentWeek.energyType] ?? ''}`}>
                  {ENERGY_TYPE_LABELS[currentWeek.energyType] ?? currentWeek.energyType}
                </span>
              )}
            </div>

            <div className="grid gap-2 md:grid-cols-7">
              {weekPulse.map(({ date, ephemeris, isToday, daySignals }) => {
                const display = new Date(`${date}T12:00:00`)
                return (
                  <div
                    key={date}
                    className={`rounded-[0.95rem] border px-2.5 py-3 ${isToday ? 'border-leather-400/50 bg-leather-500/18 shadow-glow' : 'border-border/70 bg-stone-950/60'}`}
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-bone-muted">
                      {display.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="mt-1 text-[1.35rem] font-semibold text-bone">{display.toLocaleDateString('en-US', { day: 'numeric' })}</p>
                    <p className="text-[0.82rem] text-bone-muted">{display.toLocaleDateString('en-US', { month: 'short' })}</p>

                    {ephemeris ? (
                      <>
                        <div className="mt-2.5 flex items-center gap-1.5 text-[0.8rem] text-bone">
                          <MoonPhaseIcon phase={ephemeris.moon.lunarPhase} size={14} />
                          <span>{ephemeris.moon.sign}</span>
                        </div>
                        <div className="mt-2.5 space-y-1.5">
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
                        {daySignals && isToday ? (
                          <p className="mt-2 text-[0.64rem] leading-[1.125rem] text-bone-muted/75">
                            {buildLunarMessage(ephemeris)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-4 text-[0.72rem] text-bone-muted">Cosmic timing will settle in here shortly.</p>
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
              <div className="mt-[1.125rem]">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                    Top life areas activated this week
                  </p>
                  <p className="text-xs text-bone-muted/60">
                    Open an area to see the timing window, chart context, and deeper guidance.
                  </p>
                </div>
                <div className="grid gap-2.5 lg:grid-cols-3">
                {focusedAreas.map((area) => (
                  <Link
                    key={area.name}
                    href={area.href}
                    className="group rounded-[0.95rem] border border-border/70 bg-stone-950/60 px-4 py-3.5 transition-all hover:border-leather-400/40 hover:bg-leather-500/8"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-leather-200/85">
                      Most affected area
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-bone">
                          {area.icon ? `${area.icon} ${area.name}` : area.name}
                        </p>
                        <p className="mt-2 text-sm leading-[1.625rem] text-bone-muted group-hover:text-bone">
                          {area.summary}
                        </p>
                      </div>
                      <span className="shell-pill shrink-0 border-leather-400/20 bg-leather-500/10 text-leather-200">
                        Open
                      </span>
                    </div>
                    <p className="mt-3 border-t border-border/70 pt-3 text-[0.92rem] leading-6 text-bone-muted/80">
                      {area.prompt}
                    </p>
                  </Link>
                ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="shell-panel px-5 py-5 md:px-6 md:py-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="shell-kicker">Celestial Architecture</p>
                <h2 className="mt-2 font-serif text-[1.7rem] text-bone md:text-[1.9rem]">{blueprintRow.plan_year} house activations and annual structure</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
                  Blueprint themes become the backbone of the year. The shell below mirrors the proof-of-concept structure, but it is now driven by your real Kiaros blueprint.
                </p>
              </div>
              <Link href="/blueprint" className="hidden items-center gap-2 rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:text-bone md:inline-flex">
                View full blueprint
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
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

          <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="grid gap-4">
            <article className="shell-panel-soft px-5 py-5">
              <p className="shell-kicker">Customization Layer</p>
              <h2 className="mt-2 text-[1.3rem] font-semibold text-bone">Words of the year</h2>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
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
              <p className="mt-3 text-sm leading-[1.625rem] text-bone-muted">
                {astrologicalWord?.rationale || profile?.what_to_release || 'This area will hold release themes, pivots, and other user-defined yearly anchors.'}
              </p>
              {profile?.what_to_release ? (
                <p className="mt-3 text-sm leading-7 text-bone-muted/80">
                  Release theme: {profile.what_to_release}
                </p>
              ) : null}
            </article>

            <article className="shell-panel-soft px-5 py-5">
              <p className="shell-kicker">Curriculum</p>
              <h2 className="mt-2 text-[1.3rem] font-semibold text-bone">Study tracks and reading</h2>
              <p className="mt-3.5 text-sm leading-[1.625rem] text-bone-muted">
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
            </div>

            <article className="shell-panel px-5 py-5 md:px-6">
              <p className="shell-kicker">Focus Areas</p>
              <h2 className="mt-2 text-[1.55rem] font-semibold text-bone">Life areas in motion</h2>
              <p className="mt-3 max-w-2xl text-sm leading-[1.625rem] text-bone-muted">
                These are the parts of life you’ll actually move through most often. Open a lane to see its timing windows, chart context, and journal prompts.
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {categories.length > 0 ? (
                  categories.slice(0, 6).map((category) => (
                    <Link
                      key={category.id}
                      href={`/areas/${slugifyAreaName(category.name)}`}
                      className={`group rounded-[0.95rem] border px-4 py-3.5 transition-all ${
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

          <section className="shell-panel px-5 py-5 md:px-6 md:py-6">
            <div className="mb-[1.125rem] flex items-start justify-between gap-4">
              <div>
                <p className="shell-kicker">Oracle context</p>
                <h2 className="mt-2 font-serif text-[1.6rem] text-bone md:text-[1.75rem]">What the Oracle already knows about you</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
                  Every Oracle conversation starts here — your chart, your goals, and any journal entries you&apos;ve chosen to include. You control what it remembers.
                </p>
              </div>
              <Link href="/oracle" className="hidden items-center gap-2 rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:text-bone md:inline-flex">
                Ask the Oracle
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {/* Natal chart */}
              <div className="rounded-[1rem] border border-leather-400/25 bg-leather-500/8 p-[1.125rem]">
                <p className="shell-eyebrow mb-3 text-leather-200/80">Natal chart · permanent</p>
                {natalChart ? (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-bone">
                      {natalChart.sun.sign} Sun
                      {!natalChart.birthTimeUnknown && ` · ${natalChart.rising} Rising`}
                    </p>
                    <p className="text-sm text-bone-muted">{natalChart.moon.sign} Moon · House {natalChart.moon.house}</p>
                    {natalChart.birthTimeUnknown && (
                      <p className="text-xs text-bone-muted/60">Birth time unknown — houses approximate</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const).map((p) => (
                        <span key={p} className="shell-pill">
                          {p.charAt(0).toUpperCase() + p.slice(1)} in {natalChart[p].sign}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-bone-muted">Complete onboarding to add your natal chart.</p>
                )}
              </div>

              {/* Goals */}
              <div className="rounded-[1rem] border border-moss-500/25 bg-moss-500/8 p-[1.125rem]">
                <p className="shell-eyebrow mb-3 text-moss-200/80">Your goals · from onboarding</p>
                {categories.length > 0 ? (
                  <ul className="space-y-2">
                    {categories.slice(0, 5).map((cat) => (
                      <li key={cat.id} className="flex items-center gap-2 text-sm text-bone">
                        {cat.icon_key && <span>{cat.icon_key}</span>}
                        <span>{cat.name}</span>
                      </li>
                    ))}
                    {categories.length > 5 && (
                      <li className="text-xs text-bone-muted/60">+{categories.length - 5} more</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-bone-muted">Your goals will appear here after onboarding.</p>
                )}
              </div>

              {/* Journal memory */}
              <div className="rounded-[1rem] border border-plum-400/25 bg-plum-400/8 p-[1.125rem]">
                <p className="shell-eyebrow mb-3 text-plum-300/80">Journal memory · your choice</p>
                {oracleMemoryCount > 0 ? (
                  <div className="space-y-1">
                    <p className="text-3xl font-semibold text-bone">{oracleMemoryCount}</p>
                    <p className="text-sm text-bone-muted">
                      {oracleMemoryCount === 1 ? 'entry' : 'entries'} in Oracle memory
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-bone-muted">
                    No entries yet. Open the journal and toggle &ldquo;Add to Oracle memory&rdquo; on any entry.
                  </p>
                )}
                <Link href="/journal" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-bone-muted hover:text-bone transition-colors">
                  Open journal
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap gap-2.5">
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
