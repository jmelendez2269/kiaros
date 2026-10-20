/**
 * KIAROS_CALENDAR_DAY — redirect targets, WeekArc hrefs, Today layout guard.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  buildCalendarDayRedirectFromPlanner,
  parsePlannerView,
  shouldRedirectPlannerToCalendar,
  weekArcHref,
} from '../lib/calendar/calendar-day-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function flagEnabled(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase())
}

console.log('=== KIAROS_CALENDAR_DAY tests ===\n')

console.log('Flag env parsing (mirrors lib/feature-flags.ts)')
assert.equal(flagEnabled(undefined), false)
assert.equal(flagEnabled(''), false)
assert.equal(flagEnabled('false'), false)
assert.equal(flagEnabled('true'), true)
assert.equal(flagEnabled('on'), true)
console.log('✓ Flag parsing\n')

console.log('Planner redirect (day view only)')
assert.equal(shouldRedirectPlannerToCalendar(parsePlannerView(undefined)), true)
assert.equal(shouldRedirectPlannerToCalendar(parsePlannerView('day')), true)
assert.equal(shouldRedirectPlannerToCalendar(parsePlannerView('week')), false)
assert.equal(shouldRedirectPlannerToCalendar(parsePlannerView('month')), false)
assert.equal(
  buildCalendarDayRedirectFromPlanner({ date: '2026-06-15', view: 'week' }),
  '/calendar?date=2026-06-15&view=day'
)
assert.equal(buildCalendarDayRedirectFromPlanner({}), '/calendar?view=day')
assert.equal(buildCalendarDayRedirectFromPlanner({ date: 'bad' }), '/calendar?view=day')
console.log('✓ Planner redirect URLs\n')

console.log('WeekArc link targets')
assert.equal(weekArcHref('2026-06-02', false), '/year?view=week&date=2026-06-02')
assert.equal(weekArcHref('2026-06-02', true), '/calendar?view=week&date=2026-06-02')
console.log('✓ WeekArc hrefs\n')

console.log('Today page layout unchanged (card order and columns)')
const todaySource = readFileSync(join(root, 'app/(app)/today/page.tsx'), 'utf8')
const layoutMarkers = [
  '<SkyBanner',
  '<Frame tone="umber" padding={18}>',
  '<RightNowCard',
  'md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
  '<TodayIntention',
  "Today&rsquo;s plan",
  '<PlanChecklist',
  '<ShapeOfTodayCards',
  '<LineForToday',
  '<WeekRibbon',
  '<SkyNow',
  '<ActiveTransits',
  '<TodayCurriculum',
  '<DeeperToday',
  '<WeekArc',
  '<JupiterSeason',
  '<YearChartShell',
  '<LifeArcRead',
]
for (const marker of layoutMarkers) {
  assert.ok(todaySource.includes(marker), `Today page missing expected marker: ${marker}`)
}
const weekArcIdx = todaySource.indexOf('<WeekArc')
const intentionIdx = todaySource.indexOf('<TodayIntention')
const skyBannerIdx = todaySource.indexOf('<SkyBanner')
assert.ok(skyBannerIdx < intentionIdx, 'SkyBanner should precede TodayIntention')
assert.ok(intentionIdx < weekArcIdx, 'TodayIntention should precede WeekArc (DeeperToday)')
assert.ok(!todaySource.includes('calendarDayEnabled={true}'), 'Today should pass flag via variable, not hard-coded on')
console.log('✓ Today layout markers and order\n')

console.log('Calendar route redirects to /year when flag off (source check)')
const calendarPage = readFileSync(join(root, 'app/(app)/calendar/page.tsx'), 'utf8')
assert.ok(calendarPage.includes('isCalendarDayEnabled()'))
assert.ok(calendarPage.includes("redirect('/year')"))
const plannerPage = readFileSync(join(root, 'app/(app)/planner/page.tsx'), 'utf8')
assert.ok(plannerPage.includes('buildCalendarDayRedirectFromPlanner'))
console.log('✓ Route handlers wire flag checks\n')

console.log('All KIAROS_CALENDAR_DAY tests passed.')
