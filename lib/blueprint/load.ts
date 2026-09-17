import 'server-only'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { cache } from 'react'
import type { BlueprintOutput, HouseSystem, MoonPhase, Tradition } from '@/types/blueprint'
import type { Json } from '@/types/database'
import type { ArcPeriod } from '@/components/year/PushRestRibbon'
import { sanitizePushRestArc } from '@/lib/year/push-rest-arc'
import { isMonthlyBlueprintWindowEnabled } from '@/lib/feature-flags'
import {
  getBlueprintYearCapability,
  type BlueprintYearCapability,
} from '@/lib/commerce/capabilities'
import {
  resolveUserAccess,
  type ProductEntitlementRecord,
} from '@/lib/commerce/entitlements'
import {
  projectBlueprintForAccess,
  projectPushRestArcForAccess,
} from '@/lib/blueprint/access-projection'

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
  access: BlueprintYearCapability
  blueprint: BlueprintOutput
  blueprintId: string
  houseSystem: HouseSystem | null
  planYear: number
  /** Authored push/rest/edit arc; null when the column is empty (UI falls back to deriving). */
  pushRestArc: ArcPeriod[] | null
  tradition: Tradition | null
}

export function toBlueprintPromptRecord(loaded: LoadedBlueprint | null): {
  year_theme: string | null
  year_summary: string | null
  quarters: Json
  months: Json
  weeks: Json
} | null {
  if (!loaded) return null

  return {
    year_theme: loaded.blueprint.yearTheme,
    year_summary: loaded.blueprint.yearSummary,
    quarters: loaded.blueprint.quarters as unknown as Json,
    months: loaded.blueprint.months as unknown as Json,
    weeks: loaded.blueprint.weeks as unknown as Json,
  }
}

async function loadBlueprintForYearUncached(
  supabaseUserId: string,
  planYear: number,
  isAdmin: boolean,
): Promise<LoadedBlueprint | null> {
  const admin = createAdminSupabase()

  const blueprintQuery = admin
      .from('blueprints')
      .select(
        'id, plan_year, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods, push_rest_arc, tradition, house_system'
      )
      .eq('user_id', supabaseUserId)
      .eq('plan_year', planYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

  const [blueprintResult, entitlementResult] = await Promise.all([
    blueprintQuery,
    isMonthlyBlueprintWindowEnabled() && !isAdmin
      ? admin
          .from('product_entitlements')
          .select(
            'id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan'
          )
          .eq('user_id', supabaseUserId)
          .neq('status', 'revoked')
      : Promise.resolve({ data: [] as ProductEntitlementRecord[], error: null }),
  ])

  const { data: row, error: blueprintError } = blueprintResult
  if (blueprintError) {
    console.error('[blueprint-load] Blueprint query failed:', blueprintError.message)
    return null
  }

  if (!row) return null

  let access: BlueprintYearCapability = { access: 'full', windowEnd: null, windowStart: null }
  if (isMonthlyBlueprintWindowEnabled() && !isAdmin) {
    if (entitlementResult.error) {
      console.error('[blueprint-load] Entitlement query failed:', entitlementResult.error.message)
      return null
    }
    const capabilities = resolveUserAccess(
      (entitlementResult.data ?? []) as ProductEntitlementRecord[],
    ).capabilities
    access = getBlueprintYearCapability(capabilities, row.plan_year)
  }

  const rawBlueprint: BlueprintOutput = {
    yearTheme: row.year_theme ?? '',
    yearSummary: row.year_summary ?? '',
    quarters: sanitizeQuarters(row.quarters),
    months: sanitizeMonths(row.months),
    weeks: sanitizeWeeks(row.weeks),
    pushPeriods: sanitizePeriodRanges(row.push_periods),
    restPeriods: sanitizePeriodRanges(row.rest_periods),
  }
  const blueprint = projectBlueprintForAccess(rawBlueprint, row.plan_year, access)
  if (!blueprint) return null

  const rawPushRestArc = sanitizePushRestArc(row.push_rest_arc)

  return {
    access,
    blueprint,
    blueprintId: row.id,
    houseSystem: row.house_system as HouseSystem | null,
    planYear: row.plan_year,
    pushRestArc: projectPushRestArcForAccess(rawPushRestArc, row.plan_year, access),
    tradition: row.tradition as Tradition | null,
  }
}

export const loadBlueprintForYear = cache(loadBlueprintForYearUncached)

export const loadCurrentBlueprint = cache(
  async (supabaseUserId: string, isAdmin = false): Promise<LoadedBlueprint | null> =>
    loadBlueprintForYearUncached(supabaseUserId, new Date().getFullYear(), isAdmin),
)
