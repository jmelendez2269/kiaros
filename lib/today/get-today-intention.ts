import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import type { MonthBlueprint, QuarterBlueprint, WeekBlueprint } from '@/types/blueprint'

export interface TodayIntention {
  /** Most specific theme available — week first, then month, then quarter, then year. */
  theme: string
  /** A single intention line, picked per-weekday so weekly intentions rotate. */
  line: string
  /** Where the line came from — used for the small footer label. */
  source: 'week' | 'month' | 'quarter' | 'year'
  /** Cosmic context for the surrounding period — short paragraph. */
  context: string | null
  /** Optional user-supplied word/vision for the year. */
  wordOfYear: string | null
  /** Quarter/week numbers for the breadcrumb. */
  weekNumber: number | null
  quarterNumber: number | null
}

export type TodayIntentionResult =
  | { status: 'ok'; data: TodayIntention }
  | { status: 'no-blueprint' }

function dayOfWeek(iso: string): number {
  // 0 = Mon, 6 = Sun — so rotation index aligns with WeekBlueprint Mon→Sun layout.
  const dow = new Date(`${iso}T12:00:00`).getDay()
  return dow === 0 ? 6 : dow - 1
}

function firstSentence(text: string | null): string | null {
  if (!text) return null
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  const match = normalized.match(/.*?[.!?](?:\s|$)/)
  return (match ? match[0] : normalized).trim()
}

export async function getTodayIntention(date: string): Promise<TodayIntentionResult> {
  const supabase = await createServerSupabase()

  const [{ data: profile }, { data: blueprint }] = await Promise.all([
    supabase.from('user_profiles').select('word_of_year').maybeSingle(),
    supabase
      .from('blueprints')
      .select('year_theme, year_summary, quarters, months, weeks, plan_year')
      .eq('plan_year', Number.parseInt(date.slice(0, 4), 10))
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!blueprint) return { status: 'no-blueprint' }

  const weeks = (blueprint.weeks as unknown as WeekBlueprint[]) ?? []
  const months = (blueprint.months as unknown as MonthBlueprint[]) ?? []
  const quarters = (blueprint.quarters as unknown as QuarterBlueprint[]) ?? []

  const week = weeks.find((w) => w.startDate <= date && date <= w.endDate) ?? null
  const monthNumber = Number.parseInt(date.slice(5, 7), 10)
  const month = months.find((m) => m.month === monthNumber) ?? null
  const quarterNumber = Math.ceil(monthNumber / 3)
  const quarter = quarters.find((q) => q.quarter === quarterNumber) ?? null

  const wordOfYear = profile?.word_of_year?.trim() || null

  if (week && week.intentions.length > 0) {
    const idx = dayOfWeek(date) % week.intentions.length
    return {
      status: 'ok',
      data: {
        theme: week.theme,
        line: week.intentions[idx],
        source: 'week',
        context: firstSentence(week.cosmicContext),
        wordOfYear,
        weekNumber: week.weekNumber,
        quarterNumber,
      },
    }
  }

  if (month && month.intentions.length > 0) {
    const idx = (new Date(`${date}T12:00:00`).getDate() - 1) % month.intentions.length
    return {
      status: 'ok',
      data: {
        theme: month.theme,
        line: month.intentions[idx],
        source: 'month',
        context: firstSentence(month.energyArc),
        wordOfYear,
        weekNumber: null,
        quarterNumber,
      },
    }
  }

  if (quarter && quarter.intention) {
    return {
      status: 'ok',
      data: {
        theme: quarter.theme,
        line: quarter.intention,
        source: 'quarter',
        context: quarter.cosmicHighlights[0] ?? null,
        wordOfYear,
        weekNumber: null,
        quarterNumber,
      },
    }
  }

  const yearTheme = blueprint.year_theme?.trim()
  if (yearTheme) {
    return {
      status: 'ok',
      data: {
        theme: yearTheme,
        line: firstSentence(blueprint.year_summary) ?? yearTheme,
        source: 'year',
        context: null,
        wordOfYear,
        weekNumber: null,
        quarterNumber,
      },
    }
  }

  return { status: 'no-blueprint' }
}
