import { auth } from '@clerk/nextjs/server'
import { K } from '@/components/almanac'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { computeTransitWindows } from '@/lib/planetary/transit-windows'
import { resolvePlannerLocation } from '@/lib/planner/resolve-planner-location'
import { appProfileId, getAppProfile } from '@/lib/app/get-app-profile'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { MonthBlueprint, MoonPhase, NatalChart, YearEphemeris } from '@/types/blueprint'
import type { Tables } from '@/types/database'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'

export interface SearchParams {
  view?: string
  month?: string
  date?: string
  quarter?: string
}

export const MONTH_NAMES = [
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

const MOON_PHASE_LABEL: Record<MoonPhase, string> = {
  new: 'New ☾',
  'first-quarter': 'First Q ☾',
  full: 'Full ☾',
  'last-quarter': 'Last Q ☾',
}

function moonPhaseTone(phase: MoonPhase): string {
  return phase === 'new' || phase === 'full' ? K.copper : K.sage
}

type PlanItemRow = Tables<'plan_items'>
type PlannerContextRow = Pick<
  Tables<'user_profiles'>,
  'birth_lat' | 'birth_lng' | 'birth_tz' | 'planner_lat' | 'planner_lng' | 'planner_tz' | 'natal_chart'
>

async function loadSupabaseUserId() {
  const { userId } = await auth()
  if (!userId) return null
  return appProfileId(await getAppProfile(userId))
}

export function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month + offset, 1))
  const nextYear = date.getUTCFullYear()
  const nextMonth = date.getUTCMonth() + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

export function clampMonthToPlanYear(
  selected: { year: number; month: number },
  planYear: number
): { year: number; month: number } {
  if (selected.year < planYear) return { year: planYear, month: 0 }
  if (selected.year > planYear) return { year: planYear, month: 11 }
  return selected
}

export function parseMonth(raw: string | undefined, fallback: { year: number; month: number }) {
  if (!raw) return fallback
  const match = /^(\d{4})-(\d{2})$/.exec(raw)
  if (!match) return fallback
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (!Number.isFinite(year) || month < 0 || month > 11) return fallback
  return { year, month }
}

export function parseDate(raw: string | undefined, fallbackIso: string): string {
  if (!raw) return fallbackIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallbackIso
  return raw
}

export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

export function eventsForMonth(
  monthBlueprint: MonthBlueprint | undefined,
  year: number,
  month: number
): import('@/components/year/MonthGrid').DayEvent[] {
  if (!monthBlueprint) return []
  const events: import('@/components/year/MonthGrid').DayEvent[] = []
  for (const mp of monthBlueprint.moonPhases) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(mp.date)
    if (!match) continue
    const y = Number(match[1])
    const m = Number(match[2]) - 1
    const d = Number(match[3])
    if (y !== year || m !== month) continue
    events.push({ day: d, tag: MOON_PHASE_LABEL[mp.phase], tone: moonPhaseTone(mp.phase) })
  }
  return events
}

export async function loadMonthData(year: number, month: number) {
  const supabaseUserId = await loadSupabaseUserId()
  if (!supabaseUserId) {
    return {
      loaded: null,
      yearEphemeris: null,
      curriculumSessions: [] as CurriculumSessionRow[],
      planItems: [] as PlanItemRow[],
      journalEntries: [] as { entry_date: string }[],
      monthBrief: null,
      plannerContext: null,
      supabaseUserId: null,
    }
  }

  const monthNumber = month + 1
  const monthPrefix = `${year}-${String(monthNumber).padStart(2, '0')}-`
  const monthStart = `${monthPrefix}01`
  const monthEnd = `${monthPrefix}${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
  const admin = createAdminSupabase()
  const [loaded, ephemerisRes, sessionsRes, planItemsRes, journalRes, briefRes, plannerContextRes] =
    await Promise.all([
      loadCurrentBlueprint(supabaseUserId),
      admin.from('ephemeris_cache').select('data').eq('user_id', supabaseUserId).eq('year', year).maybeSingle(),
      admin
        .from('curriculum_sessions')
        .select(
          'id, curriculum_plan_id, curriculum_title, week_number, session_order, title, description, session_type, estimated_minutes, scheduled_for, status'
        )
        .eq('user_id', supabaseUserId)
        .gte('scheduled_for', monthStart)
        .lte('scheduled_for', monthEnd)
        .order('scheduled_for', { ascending: true })
        .order('session_order', { ascending: true }),
      admin
        .from('plan_items')
        .select(
          'id, user_id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source'
        )
        .eq('user_id', supabaseUserId)
        .gte('item_date', monthStart)
        .lte('item_date', monthEnd)
        .order('item_date', { ascending: true })
        .order('sort_order', { ascending: true }),
      admin
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', supabaseUserId)
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd),
      admin
        .from('month_briefs')
        .select('brief_text, generated_at, edited_at, pinned')
        .eq('user_id', supabaseUserId)
        .eq('plan_year', year)
        .eq('month', monthNumber)
        .maybeSingle(),
      admin
        .from('user_profiles')
        .select('birth_lat, birth_lng, birth_tz, planner_lat, planner_lng, planner_tz, natal_chart')
        .eq('id', supabaseUserId)
        .maybeSingle(),
    ])

  return {
    loaded,
    yearEphemeris: (ephemerisRes.data?.data as YearEphemeris | null) ?? null,
    curriculumSessions: (sessionsRes.data ?? []) as CurriculumSessionRow[],
    planItems: (planItemsRes.data ?? []) as PlanItemRow[],
    journalEntries: journalRes.data ?? [],
    monthBrief: briefRes.data ?? null,
    plannerContext: plannerContextRes.data as PlannerContextRow | null,
    supabaseUserId,
  }
}

export function buildDayCharacters(
  dates: string[],
  ephemeris: YearEphemeris | null,
  plannerContext: PlannerContextRow | null
): Map<string, EnergyWindow> {
  const characters = new Map<string, EnergyWindow>()
  if (!ephemeris) return characters

  const { lat, lng, timeZone } = resolvePlannerLocation(plannerContext)
  const natalChart = (plannerContext?.natal_chart as unknown as NatalChart | null) ?? null
  const ephemerisByDate = new Map(ephemeris.days.map((day) => [day.date, day]))

  for (const date of dates) {
    const windows = computeTransitWindows({
      date,
      lat,
      lng,
      timeZone,
      natalChart,
      dayTransits: ephemerisByDate.get(date)?.transits ?? [],
    })
    const character = windows.find((window) => window.label === 'Peak' || window.label === 'Steady')
    if (character) characters.set(date, character)
  }

  return characters
}
