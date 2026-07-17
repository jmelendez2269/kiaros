import 'server-only'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { Tables } from '@/types/database'

export type AreaGoalRow = Tables<'area_goals'>

async function goalsForWeekNumbers(userId: string, weekNumbers: number[]): Promise<AreaGoalRow[]> {
  if (weekNumbers.length === 0) return []
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('area_goals')
    .select('id, category_id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at, user_id')
    .eq('user_id', userId)
    .in('linked_week_number', weekNumbers)
    .order('sort_order', { ascending: true })

  return (data ?? []) as AreaGoalRow[]
}

/**
 * Area goals linked to the blueprint week containing `date`.
 *
 * Blueprint weeks are sequential 7-day blocks from the plan year's actual
 * start date — NOT calendar Monday–Sunday weeks (a plan_year that starts
 * mid-week, e.g. a Thursday, produces blueprint weeks that run Thu–Wed).
 * For a single date this distinction doesn't matter — the date falls in
 * exactly one blueprint week regardless of which day that week starts on.
 * Returns [] when there's no ready blueprint for the current plan year, or
 * no goals are linked to that week.
 */
export async function getWeekGoalsForDate(userId: string, date: string): Promise<AreaGoalRow[]> {
  const blueprintLoaded = await loadCurrentBlueprint(userId)
  if (!blueprintLoaded) return []

  const week = blueprintLoaded.blueprint.weeks.find((w) => w.startDate <= date && date <= w.endDate)
  return week ? goalsForWeekNumbers(userId, [week.weekNumber]) : []
}

/**
 * Area goals linked to any blueprint week that overlaps the Planner's
 * calendar week (`weekDates[0]`..`weekDates[6]`, Monday–Sunday).
 *
 * Since blueprint weeks don't align to Monday starts (see note above), a
 * single Mon–Sun Planner week can straddle two blueprint weeks — e.g.
 * blueprint week 28 = Jul 9–15 and week 29 = Jul 16–22 both fall inside the
 * Planner week Jul 13–19. Matching only the week that contains day 1 (as
 * `getWeekGoalsForDate` does) would silently miss goals linked to the
 * second blueprint week — this collects from every week the range touches.
 */
export async function getWeekGoalsForRange(userId: string, weekDates: string[]): Promise<AreaGoalRow[]> {
  const blueprintLoaded = await loadCurrentBlueprint(userId)
  if (!blueprintLoaded) return []

  const from = weekDates[0]
  const to = weekDates[weekDates.length - 1]
  const weekNumbers = blueprintLoaded.blueprint.weeks
    .filter((w) => w.startDate <= to && from <= w.endDate)
    .map((w) => w.weekNumber)

  return goalsForWeekNumbers(userId, weekNumbers)
}
