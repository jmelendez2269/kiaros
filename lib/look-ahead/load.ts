import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import {
  extractStripeOrderIds,
  loadOrderSubscriptionMap,
  resolveUserAccess,
  type ProductEntitlementRecord,
} from '@/lib/commerce/entitlements'
import { collectiveCycles, loadNatalChart, personalCyclesBetween } from '@/lib/sky-cycles/load'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { eligibleForLookAhead } from './eligibility'
import { areaLabel, isGoalChoice, type GoalReview, type ReviewGoal } from './goals'
import { buildYearSky, type YearSky } from './sky'
import { lookAheadWindowAt, type LookAheadWindow } from './window'

const ENTITLEMENT_SELECT =
  'id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan'

/** Whether this member may look into the next year. Reads entitlements only; changes nothing. */
export async function isLookAheadMember(profileId: string): Promise<boolean> {
  const clerkUser = await currentUser()
  if (clerkUser?.publicMetadata?.isAdmin === true) return true
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('product_entitlements')
    .select(ENTITLEMENT_SELECT)
    .eq('user_id', profileId)
    .neq('status', 'revoked')
  if (error) return false
  const subscriptionMap = await loadOrderSubscriptionMap(admin, extractStripeOrderIds(data ?? []), { userId: profileId })
  const access = resolveUserAccess((data ?? []) as ProductEntitlementRecord[], undefined, undefined, subscriptionMap)
  return eligibleForLookAhead(access)
}

/** The season band: the year to look into, or null outside the window or for members it isn't for. */
export async function loadLookAheadBand(profileId: string, mockToday: string | null): Promise<{ year: number } | null> {
  const window = lookAheadWindowAt({ mockToday })
  if (!window.open || window.year === null) return null
  const member = await isLookAheadMember(profileId).catch(() => false)
  return member ? { year: window.year } : null
}

interface GoalRow {
  id: string
  title: string
  status: string
  goal_categories: { name: string; sort_order: number | null } | Array<{ name: string; sort_order: number | null }> | null
}

interface ChoiceRow {
  area_goal_id: string
  choice: string
  reshaped_title: string | null
}

/** The member's open goals (active or paused) and any choices already made for `year`. */
export async function loadGoalReview(profileId: string, year: number): Promise<GoalReview> {
  const admin = createAdminSupabase()
  const [goalsRes, choicesRes] = await Promise.all([
    admin
      .from('area_goals')
      .select('id, title, status, sort_order, goal_categories(name, sort_order)')
      .eq('user_id', profileId)
      .in('status', ['active', 'paused'])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('goal_year_choices')
      .select('area_goal_id, choice, reshaped_title')
      .eq('user_id', profileId)
      .eq('plan_year', year),
  ])
  if (goalsRes.error) throw new Error('Could not load your goals')

  const choices = new Map<string, ChoiceRow>()
  for (const row of (choicesRes.data ?? []) as ChoiceRow[]) choices.set(row.area_goal_id, row)

  const rows = (goalsRes.data ?? []) as GoalRow[]
  const goals: Array<ReviewGoal & { areaSort: number }> = rows.map((row) => {
    const category = Array.isArray(row.goal_categories) ? row.goal_categories[0] : row.goal_categories
    const areaName = category?.name ?? 'Unsorted'
    const saved = choices.get(row.id)
    return {
      id: row.id,
      title: row.title,
      areaName,
      areaLabel: areaLabel(areaName),
      status: row.status === 'paused' ? 'paused' : 'active',
      choice: saved && isGoalChoice(saved.choice) ? saved.choice : null,
      reshapedTitle: saved?.reshaped_title ?? null,
      areaSort: category?.sort_order ?? 0,
    }
  })
  goals.sort((a, b) => a.areaSort - b.areaSort)
  // A missing table (migration 0058 not applied yet) reads as "can't save", not as an error.
  return { year, goals: goals.map(({ areaSort: _areaSort, ...g }) => g), canSave: !choicesRes.error }
}

/** The whole year's sky over this member's chart, with their goals for the house links. */
export async function loadYearSky(profileId: string, year: number, goals: ReviewGoal[]): Promise<YearSky> {
  const chart = await loadNatalChart(profileId)
  const personal = chart ? personalCyclesBetween(chart, `${year}-01-01`, `${year}-12-31`) : []
  return buildYearSky({
    year,
    collective: collectiveCycles(),
    personal,
    chart,
    goals: goals.filter((g) => g.status === 'active').map((g) => ({ title: g.title, areaName: g.areaName })),
  })
}

export type { LookAheadWindow }
