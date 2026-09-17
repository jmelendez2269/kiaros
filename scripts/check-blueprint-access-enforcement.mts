import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  projectBlueprintForAccess,
  projectPushRestArcForAccess,
} from '../lib/blueprint/access-projection.ts'
import type { BlueprintOutput } from '../types/blueprint.ts'

let assertions = 0

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message)
  assertions += 1
}

function deepEqual<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message)
  assertions += 1
}

function ok(value: unknown, message: string): void {
  assert.ok(value, message)
  assertions += 1
}

const blueprint: BlueprintOutput = {
  yearTheme: 'Full-year theme',
  yearSummary: 'Full-year summary',
  quarters: [{
    quarter: 3,
    theme: 'Quarter theme',
    intention: 'Quarter intention',
    focusAreas: ['Work'],
    cosmicHighlights: ['A full-quarter event'],
    pushPeriods: [],
    restPeriods: [],
  }],
  months: [
    {
      month: 7,
      name: 'July',
      theme: 'July theme',
      intentions: ['July intention'],
      keyTransits: [],
      moonPhases: [],
      energyArc: 'July arc',
    },
    {
      month: 8,
      name: 'August',
      theme: 'August theme',
      intentions: ['August intention'],
      keyTransits: [],
      moonPhases: [
        { phase: 'full', date: '2026-08-01', significance: 'Locked phase' },
        { phase: 'new', date: '2026-08-20', significance: 'Visible phase' },
      ],
      energyArc: 'August arc',
    },
    {
      month: 9,
      name: 'September',
      theme: 'September theme',
      intentions: ['September intention'],
      keyTransits: [],
      moonPhases: [],
      energyArc: 'September arc',
    },
  ],
  weeks: [
    {
      weekNumber: 31,
      startDate: '2026-07-27',
      endDate: '2026-08-02',
      theme: 'Locked prior week',
      intentions: [],
      energyType: 'reflect',
      cosmicContext: 'Locked',
      goalCategoryFocus: [],
    },
    {
      weekNumber: 32,
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      theme: 'Visible current week',
      intentions: ['Visible'],
      energyType: 'push',
      cosmicContext: 'Visible',
      goalCategoryFocus: [],
    },
    {
      weekNumber: 36,
      startDate: '2026-08-31',
      endDate: '2026-09-06',
      theme: 'Visible fourth following week',
      intentions: ['Visible'],
      energyType: 'rest',
      cosmicContext: 'Visible',
      goalCategoryFocus: [],
    },
    {
      weekNumber: 37,
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      theme: 'Locked future week',
      intentions: [],
      energyType: 'reflect',
      cosmicContext: 'Locked',
      goalCategoryFocus: [],
    },
  ],
  pushPeriods: [{ startDate: '2026-07-20', endDate: '2026-08-10', reason: 'Crosses start' }],
  restPeriods: [{ startDate: '2026-09-01', endDate: '2026-09-20', reason: 'Crosses end' }],
}

const windowed = projectBlueprintForAccess(blueprint, 2026, {
  access: 'windowed',
  windowStart: '2026-08-03',
  windowEnd: '2026-09-06',
})
ok(windowed, 'windowed projection exists for a valid entitlement window')
equal(windowed?.yearTheme, '', 'windowed payload excludes the full-year theme')
equal(windowed?.yearSummary, '', 'windowed payload excludes the full-year summary')
deepEqual(windowed?.quarters, [], 'windowed payload excludes full-quarter narratives')
deepEqual(windowed?.weeks.map((week) => week.weekNumber), [32, 36], 'only overlapping entitled weeks remain')
deepEqual(windowed?.months.map((month) => month.month), [8, 9], 'only months intersecting the window remain')
deepEqual(
  windowed?.months[0]?.moonPhases.map((phase) => phase.date),
  ['2026-08-20'],
  'month moon phases are filtered to the entitled dates',
)
deepEqual(
  windowed?.pushPeriods,
  [{ startDate: '2026-08-03', endDate: '2026-08-10', reason: 'Crosses start' }],
  'push periods are clipped at the entitlement start',
)
deepEqual(
  windowed?.restPeriods,
  [{ startDate: '2026-09-01', endDate: '2026-09-06', reason: 'Crosses end' }],
  'rest periods are clipped at the entitlement end',
)

equal(
  projectBlueprintForAccess(blueprint, 2026, { access: 'none', windowStart: null, windowEnd: null }),
  null,
  'no-access capability returns no Blueprint payload',
)
equal(
  projectBlueprintForAccess(blueprint, 2026, {
    access: 'windowed',
    windowStart: null,
    windowEnd: '2026-09-06',
  }),
  null,
  'malformed windowed capability fails closed',
)
equal(
  projectBlueprintForAccess(blueprint, 2026, { access: 'full', windowStart: null, windowEnd: null }),
  blueprint,
  'full annual access returns the canonical artifact unchanged',
)

const projectedArc = projectPushRestArcForAccess(
  [{ kind: 'push', startPct: 50, endPct: 80, label: 'Long arc' }],
  2026,
  { access: 'windowed', windowStart: '2026-08-03', windowEnd: '2026-09-06' },
)
ok(projectedArc && projectedArc.length === 1, 'overlapping authored arc remains')
ok((projectedArc?.[0]?.startPct ?? 0) > 58, 'authored arc is clipped to the date window start')
ok((projectedArc?.[0]?.endPct ?? 100) < 69, 'authored arc is clipped to the date window end')

const migration = readFileSync(
  resolve('supabase/migrations/0043_secure_blueprint_access.sql'),
  'utf8',
)
ok(migration.includes('DROP POLICY IF EXISTS "own_blueprints"'), 'migration removes broad owner policy')
ok(
  migration.includes('REVOKE ALL PRIVILEGES ON TABLE public.blueprints FROM anon, authenticated'),
  'migration revokes direct raw-row access from browser roles',
)
equal(/GRANT\s+SELECT[\s\S]*blueprints/i.test(migration), false, 'migration does not restore raw SELECT')

const projectedConsumers = [
  'app/(app)/blueprint/page.tsx',
  'app/(app)/areas/page.tsx',
  'app/(app)/areas/[slug]/page.tsx',
  'app/(app)/self/page.tsx',
  'app/api/oracle/chat/route.ts',
  'app/api/oracle/explain/route.ts',
  'lib/today/get-today-intention.ts',
  'lib/ai/month-brief-generator.ts',
  'lib/ai/quarterly-review-generator.ts',
]

for (const path of projectedConsumers) {
  const source = readFileSync(resolve(path), 'utf8')
  equal(/\.from\(['"]blueprints['"]\)/.test(source), false, `${path} does not read raw Blueprint rows`)
  ok(
    source.includes('loadCurrentBlueprint') || source.includes('loadBlueprintForYear'),
    `${path} uses the scoped server loader`,
  )
}

const debugRoute = readFileSync(resolve('app/api/debug/blueprint-error/route.ts'), 'utf8')
equal(debugRoute.includes('.select("*")'), false, 'debug error route cannot serialize a full Blueprint')

const loader = readFileSync(resolve('lib/blueprint/load.ts'), 'utf8')
ok(loader.includes('isMonthlyBlueprintWindowEnabled()'), 'loader is controlled by the server-only release flag')
ok(loader.includes('getBlueprintYearCapability'), 'loader resolves year-scoped entitlement access')
ok(loader.includes('projectBlueprintForAccess'), 'loader projects before returning data')

console.log(`Blueprint access enforcement checks passed (${assertions} assertions).`)
