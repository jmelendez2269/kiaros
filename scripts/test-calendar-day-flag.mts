/**
 * KIAROS_CALENDAR_DAY — redirect targets, WeekArc hrefs, Today layout guard.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  buildCalendarDayRedirectFromPlanner,
  featureFlagEnabled,
  parsePlannerView,
  plannerDayViewNextHref,
  plannerDayViewPrevHref,
  plannerDayViewTodayHref,
  shouldRedirectPlannerToCalendar,
  weekArcHref,
} from '../lib/calendar/calendar-day-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled: featureFlagEnabledCjs } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== KIAROS_CALENDAR_DAY tests ===\n')

console.log('Flag env parsing (TS + CJS parity for next.config)')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  assert.equal(
    featureFlagEnabled(sample),
    featureFlagEnabledCjs(sample),
    `parity mismatch for ${JSON.stringify(sample)}`
  )
}
assert.equal(featureFlagEnabled(undefined), false)
assert.equal(featureFlagEnabled('true'), true)
console.log('✓ Flag parsing\n')

console.log('next.config /calendar → /year when flag off (308, query preserved by Next)')
const nextConfigSource = readFileSync(join(root, 'next.config.js'), 'utf8')
assert.ok(nextConfigSource.includes("require('./lib/calendar/feature-flag-enabled.cjs')"))
assert.ok(nextConfigSource.includes('KIAROS_CALENDAR_DAY'))
assert.ok(nextConfigSource.includes("source: '/calendar'"))
assert.ok(nextConfigSource.includes("destination: '/year'"))
assert.ok(nextConfigSource.includes('permanent: true'))
assert.ok(nextConfigSource.includes('!calendarDayOn'))
const calendarPage = readFileSync(join(root, 'app/(app)/calendar/page.tsx'), 'utf8')
assert.ok(!calendarPage.includes("redirect('/year')"), 'calendar page must not redirect to /year when flag off')
console.log('✓ Static calendar redirect wiring\n')

console.log('Planner day-view nav hrefs (flag off / basePath planner)')
assert.equal(plannerDayViewTodayHref(), '/planner?view=day')
assert.equal(plannerDayViewPrevHref('2026-06-14'), '/planner?view=day&date=2026-06-14')
assert.equal(plannerDayViewNextHref('2026-06-16'), '/planner?view=day&date=2026-06-16')
const shellSource = readFileSync(join(root, 'components/planner/PlannerDayShell.tsx'), 'utf8')
assert.ok(shellSource.includes('plannerDayViewTodayHref()'))
assert.ok(shellSource.includes('plannerDayViewPrevHref'))
assert.ok(shellSource.includes('plannerDayViewNextHref'))
assert.ok(!shellSource.includes('`/calendar?view=month'), 'calendar month link must not be rendered')
console.log('✓ Planner day nav hrefs\n')

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

const plannerPage = readFileSync(join(root, 'app/(app)/planner/page.tsx'), 'utf8')
assert.ok(plannerPage.includes('buildCalendarDayRedirectFromPlanner'))
console.log('✓ Planner page flag redirect\n')

console.log('Calendar mobile inset scroll (calendar scrollMode only)')
const dayGridSource = readFileSync(join(root, 'components/planner/DayGrid.tsx'), 'utf8')
assert.ok(dayGridSource.includes('data-calendar-day-grid-scroll'))
assert.ok(dayGridSource.includes('scrollContainerRef'))
assert.ok(dayGridSource.includes("scrollMode === 'calendar'"))
assert.ok(dayGridSource.includes('md:max-h-none md:overflow-visible'))
console.log('✓ Calendar inset scroll container\n')

console.log('All KIAROS_CALENDAR_DAY tests passed.')
