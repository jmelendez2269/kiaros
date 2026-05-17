import { createServerSupabase } from '@/lib/supabase/server'
import type { BlueprintOutput, MoonPhase } from '@/types/blueprint'
import type { ArcPeriod } from '@/components/year/PushRestRibbon'
import { sanitizePushRestArc } from '@/lib/year/push-rest-arc'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function sanitizePeriodRanges(value: unknown): BlueprintOutput['pushPeriods'] {
  return asArray<Record<string, unknown>>(value).map((item) => ({
    startDate: typeof item.startDate === 'string' ? item.startDate : '',
    endDate: typeof item.endDate === 'string' ? item.endDate : '',
    reason: typeof item.reason === 'string' ? item.reason : '',
  }))
}

function sanitizeMoonPhase(value: unknown): MoonPhase {
  return value === 'new' || value === 'first-quarter' || value === 'full' || value === 'last-quarter'
    ? value
    : 'new'
}

function sanitizeMonths(value: unknown): BlueprintOutput['months'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    month: typeof item.month === 'number' ? item.month : index + 1,
    name: typeof item.name === 'string' ? item.name : `Month ${index + 1}`,
    theme: typeof item.theme === 'string' ? item.theme : '',
    intentions: asStringArray(item.intentions),
    keyTransits: asStringArray(item.keyTransits),
    moonPhases: asArray<Record<string, unknown>>(item.moonPhases).map((phase) => ({
      phase: sanitizeMoonPhase(phase.phase),
      date: typeof phase.date === 'string' ? phase.date : '',
      significance: typeof phase.significance === 'string' ? phase.significance : '',
    })),
    energyArc: typeof item.energyArc === 'string' ? item.energyArc : '',
  }))
}

function sanitizeQuarters(value: unknown): BlueprintOutput['quarters'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    quarter: typeof item.quarter === 'number' ? item.quarter : index + 1,
    theme: typeof item.theme === 'string' ? item.theme : `Quarter ${index + 1}`,
    intention: typeof item.intention === 'string' ? item.intention : '',
    focusAreas: asStringArray(item.focusAreas),
    cosmicHighlights: asStringArray(item.cosmicHighlights),
    pushPeriods: sanitizePeriodRanges(item.pushPeriods),
    restPeriods: sanitizePeriodRanges(item.restPeriods),
  }))
}

function sanitizeWeeks(value: unknown): BlueprintOutput['weeks'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    weekNumber: typeof item.weekNumber === 'number' ? item.weekNumber : index + 1,
    startDate: typeof item.startDate === 'string' ? item.startDate : '',
    endDate: typeof item.endDate === 'string' ? item.endDate : '',
    theme: typeof item.theme === 'string' ? item.theme : '',
    intentions: asStringArray(item.intentions),
    energyType:
      item.energyType === 'push' ||
      item.energyType === 'rest' ||
      item.energyType === 'reflect' ||
      item.energyType === 'initiate'
        ? item.energyType
        : 'reflect',
    cosmicContext: typeof item.cosmicContext === 'string' ? item.cosmicContext : '',
    goalCategoryFocus: asStringArray(item.goalCategoryFocus),
  }))
}

export interface LoadedBlueprint {
  blueprint: BlueprintOutput
  planYear: number
  /** Authored push/rest/edit arc; null when the column is empty (UI falls back to deriving). */
  pushRestArc: ArcPeriod[] | null
}

export async function loadCurrentBlueprint(): Promise<LoadedBlueprint | null> {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()

  const { data: row } = await supabase
    .from('blueprints')
    .select(
      'id, plan_year, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods, push_rest_arc'
    )
    .eq('plan_year', currentYear)
    .eq('status', 'ready')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return null

  return {
    blueprint: {
      yearTheme: row.year_theme ?? '',
      yearSummary: row.year_summary ?? '',
      quarters: sanitizeQuarters(row.quarters),
      months: sanitizeMonths(row.months),
      weeks: sanitizeWeeks(row.weeks),
      pushPeriods: sanitizePeriodRanges(row.push_periods),
      restPeriods: sanitizePeriodRanges(row.rest_periods),
    },
    planYear: row.plan_year,
    pushRestArc: sanitizePushRestArc(row.push_rest_arc),
  }
}
