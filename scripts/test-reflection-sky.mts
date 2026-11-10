/**
 * Reflections read the sky: the window handed to the look back engine, the
 * saved shape of a sky reading, and the wording for a period with nothing recorded.
 */
import assert from 'node:assert/strict'
import { periodFor } from '../lib/reflections/periods.ts'
import { lookBackWindow, usesCalendarThemes } from '../lib/reflections/sky-window.ts'
import { skyReadingSchema } from '../lib/reflections/report-schema.ts'
import { skyReadingAddendum } from '../lib/ai/reflection-sky-prompt.ts'

const tz = 'America/New_York'

// A week runs Monday to Sunday, inclusive, and sits in the month it starts in.
assert.deepEqual(lookBackWindow(periodFor('week', 2026, 45, tz)),
  { kind: 'month', periodStart: '2026-11-02', periodEnd: '2026-11-08', planYear: 2026, index: 11 })
// A week across the new year keeps the year it starts in, where its sky data lives.
assert.deepEqual(lookBackWindow(periodFor('week', 2026, 1, tz)),
  { kind: 'month', periodStart: '2025-12-29', periodEnd: '2026-01-04', planYear: 2025, index: 12 })
// Months and quarters are the look back engine's own periods.
assert.deepEqual(lookBackWindow(periodFor('month', 2024, 2, tz)),
  { kind: 'month', periodStart: '2024-02-01', periodEnd: '2024-02-29', planYear: 2024, index: 2 })
assert.deepEqual(lookBackWindow(periodFor('quarter', 2026, 3, tz)),
  { kind: 'quarter', periodStart: '2026-07-01', periodEnd: '2026-09-30', planYear: 2026, index: 3 })
assert.deepEqual(lookBackWindow(periodFor('year', 2026, 1, tz)),
  { kind: 'month', periodStart: '2026-01-01', periodEnd: '2026-12-31', planYear: 2026, index: 1 })
assert.equal(usesCalendarThemes('year'), false, 'no single month or quarter theme describes a year')
assert.equal(usesCalendarThemes('week'), true)

// A saved reading round-trips; a malformed one is rejected, so the page drops it.
const reading = { sections: { sky: 'Saturn sat opposite your Sun.' }, sourceChips: { sky: ['2 moon phases'], plans: [], journal: [], personal: ['Saturn opposite your Sun'] }, model: 'm' }
assert.deepEqual(skyReadingSchema.parse(reading), reading)
assert.equal(skyReadingSchema.safeParse(undefined).success, false)
assert.equal(skyReadingSchema.safeParse({ sections: { sky: '' }, sourceChips: reading.sourceChips, model: 'm' }).success, false)

// Nothing recorded: the sky carries the look back, and the quiet is never explained.
const quiet = skyReadingAddendum('week', false)
assert.match(quiet, /"sky" is the heart of it/)
assert.match(quiet, /Never mention that nothing was written/)
assert.match(quiet, /Unrecorded time is not a gap/)
// Beside a reflection written from the member's words, only the sky section is written.
const beside = skyReadingAddendum('month', true)
assert.match(beside, /Do not write "thread" or "plansAndGoals"/)
assert.doesNotMatch(beside, /recorded little or nothing/)
for (const kind of ['week', 'month', 'quarter', 'year'] as const) {
  for (const lived of [true, false]) assert.doesNotMatch(skyReadingAddendum(kind, lived), /[—&]/, 'no em dashes or ampersands, as the voice rules ask')
}
console.log('reflection sky checks passed')
