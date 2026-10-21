/**
 * Moon-day ritual nudge — phase-day detection, dismissal keys, local storage, mock date guard.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getMoonDayPhaseForLocalDate,
  isMoonDayDismissed,
  localDateISO,
  moonDayDismissalKey,
  parseDismissalMap,
  phaseEventInstant,
} from '../lib/today/moon-day-phase.ts'
import {
  isMockTodayDateAllowed,
  parseMockTodayDateParam,
  MOCK_TODAY_QUERY_PARAM,
} from '../lib/today/mock-today-date.ts'
import { resolveMoonDayNudgeViewState } from '../lib/today/moon-day-nudge-view-state.ts'
import {
  MOON_DAY_NUDGE_DISMISSALS_KEY,
  MOON_DAY_REMINDERS_ENABLED_KEY,
} from '../lib/today/moon-day-nudge-storage.ts'
import { getMoonPhasesForYear } from '../lib/ephemeris/astronomia-adapter.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('=== Moon-day nudge tests ===\n')

console.log('Dismissal keys and map parsing')
const key = moonDayDismissalKey('full', '2026-06-11')
assert.equal(key, 'full:2026-06-11')
const map = parseDismissalMap({ [key]: true, ignored: 'nope' })
assert.equal(isMoonDayDismissed(map, 'full', '2026-06-11'), true)
assert.equal(isMoonDayDismissed(map, 'new', '2026-06-11'), false)
console.log('✓ Dismissal helpers\n')

console.log('View state resolution')
assert.equal(
  resolveMoonDayNudgeViewState({
    phase: 'new',
    remindersEnabled: false,
    dismissed: false,
    ritualDone: false,
  }),
  'hidden',
)
assert.equal(
  resolveMoonDayNudgeViewState({
    phase: 'new',
    remindersEnabled: true,
    dismissed: true,
    ritualDone: false,
  }),
  'dismissed',
)
assert.equal(
  resolveMoonDayNudgeViewState({
    phase: 'full',
    remindersEnabled: true,
    dismissed: false,
    ritualDone: true,
  }),
  'done',
)
assert.equal(
  resolveMoonDayNudgeViewState({
    phase: 'new',
    remindersEnabled: true,
    dismissed: false,
    ritualDone: false,
  }),
  'showing',
)
console.log('✓ View states\n')

console.log('Phase-day detection aligns with ephemeris events (America/New_York)')
const tz = 'America/New_York'
const year = 2026
const majors = getMoonPhasesForYear(year).filter((e) => e.phase === 'new' || e.phase === 'full')
assert.ok(majors.length >= 24, 'expected at least 24 new/full events in 2026')
for (const event of majors) {
  const local = localDateISO(phaseEventInstant(event), tz)
  const detected = getMoonDayPhaseForLocalDate(local, tz)
  assert.equal(detected, event.phase, `expected ${event.phase} on ${local} for event ${event.date}`)
}
console.log(`✓ ${majors.length} major phase local days\n`)

console.log('Non-moon days return null')
assert.equal(getMoonDayPhaseForLocalDate('2026-03-15', tz), null)
console.log('✓ Non-moon day\n')

console.log('Mock today param guard')
const prevNode = process.env.NODE_ENV
const prevVercel = process.env.VERCEL_ENV
process.env.NODE_ENV = 'production'
process.env.VERCEL_ENV = 'production'
assert.equal(isMockTodayDateAllowed(), false)
process.env.NODE_ENV = 'development'
process.env.VERCEL_ENV = 'preview'
assert.equal(isMockTodayDateAllowed(), true)
assert.equal(parseMockTodayDateParam('2026-01-01'), '2026-01-01')
assert.equal(parseMockTodayDateParam('bad'), null)
process.env.NODE_ENV = prevNode
process.env.VERCEL_ENV = prevVercel
const todayPage = readFileSync(join(root, 'app/(app)/today/page.tsx'), 'utf8')
assert.ok(todayPage.includes(MOCK_TODAY_QUERY_PARAM))
assert.ok(todayPage.includes('mockToday'))
console.log('✓ Mock date wiring\n')

console.log('Today layout: nudge lives on SkyBanner only')
const skyBanner = readFileSync(join(root, 'components/today/SkyBanner.tsx'), 'utf8')
assert.ok(skyBanner.includes('MoonDayRitualNudge'))
assert.ok(!todayPage.includes('MoonDayRitualNudge'), 'nudge component should not be wired outside SkyBanner')
console.log('✓ Surface placement\n')

console.log('Stella copy verbatim (headlines)')
const copySource = readFileSync(join(root, 'lib/today/moon-day-nudge-copy.ts'), 'utf8')
assert.ok(copySource.includes('New moon today'))
assert.ok(copySource.includes('Full moon today'))
assert.ok(copySource.includes('Start a ritual entry'))
assert.ok(copySource.includes('Not today'))
console.log('✓ Copy constants\n')

console.log('localStorage-only persistence (no DB migration or API)')
assert.ok(!readFileSync(join(root, 'types/database.ts'), 'utf8').includes('moon_day'))
assert.ok(!readFileSync(join(root, 'lib/today/moon-day-nudge-storage.ts'), 'utf8').includes('supabase'))
assert.ok(readFileSync(join(root, 'components/settings/MoonDayRemindersSettingsPanel.tsx'), 'utf8').includes('writeMoonDayRemindersEnabled'))
assert.ok(!readFileSync(join(root, 'components/today/MoonDayRitualNudge.tsx'), 'utf8').includes('/api/settings/moon-day-reminders'))
try {
  readFileSync(join(root, 'supabase/migrations/0052_moon_day_reminders.sql'))
  assert.fail('migration 0052 should be deleted')
} catch {
  // expected
}
assert.equal(MOON_DAY_NUDGE_DISMISSALS_KEY, 'kiaros-moon-day-nudge-dismissals')
assert.equal(MOON_DAY_REMINDERS_ENABLED_KEY, 'kiaros-moon-day-reminders-enabled')
console.log('✓ localStorage keys, no schema\n')

console.log('All moon-day nudge tests passed.')
