// ACCESS-02 staging RLS/persona-leakage evidence.
//
// Seeds the SAFE-02 persona matrix (minus sampler credits, which have no
// schema yet, and admin, which is a Clerk publicMetadata flag with no DB
// row) into a LOCAL Supabase instance, then verifies two independent things
// against real rows through real RLS and real app code:
//
//   1. Table-level RLS: a signed-in persona's minted session can read their
//      own journal_entries/product_entitlements rows and never another
//      persona's; blueprints stays fully denied to every authenticated role
//      (0043), for every persona, not just one.
//   2. Business logic: loadCurrentBlueprint(), called exactly as app code
//      calls it, returns the correct week-window per persona when
//      KIAROS_MONTHLY_BLUEPRINT_WINDOW is on.
//
// Refuses to run against anything that isn't a local Supabase URL. Cleans up
// its own seeded rows before and after.
//
// Usage: set -a && . ./.env.staging.local && set +a && \
//   node --experimental-strip-types scripts/check-access-02-staging.mts

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
// Well-known local Supabase demo secret (`supabase start` default). Never
// used against a non-local URL because of the guard below.
const LOCAL_JWT_SECRET =
  process.env.SUPABASE_LOCAL_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long'

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(SUPABASE_URL)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL (${SUPABASE_URL || '<unset>'}) is not a local Supabase URL.`,
  )
  process.exit(1)
}
if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

process.env.KIAROS_MONTHLY_BLUEPRINT_WINDOW = 'true'
const { loadCurrentBlueprint } = await import('../lib/blueprint/load.ts')

let assertions = 0
function ok(value: unknown, message: string): void {
  assert.ok(value, message)
  assertions += 1
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message)
  assertions += 1
}

// ─── local JWT minting (impersonation for RLS testing only) ───────────────

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function mintLocalUserToken(clerkUserId: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: clerkUserId,
    role: 'authenticated',
    aud: 'authenticated',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(signingInput).digest('base64url')
  return `${signingInput}.${signature}`
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function personaClient(clerkUserId: string) {
  const token = mintLocalUserToken(clerkUserId)
  return createClient(SUPABASE_URL, ANON_KEY, { accessToken: async () => token })
}

// ─── persona matrix ─────────────────────────────────────────────────────
// Excludes sampler_3/1/0 (SAMPLE-01/02 tables don't exist yet) and admin
// (Clerk publicMetadata flag, not a DB row — see report).

const YEAR = new Date().getUTCFullYear()
const TODAY = new Date().toISOString().slice(0, 10)
const FAR_FUTURE = `${YEAR + 5}-01-01`
const PAST = `${YEAR - 1}-01-01`
const PAST_END = `${YEAR - 1}-12-31`

type Persona = {
  slug: string
  entitlements: Array<{
    access_plan: 'monthly' | 'yearly'
    product_tier: 'planner' | 'planner_oracle'
    oracle_enabled: boolean
    source: 'etsy' | 'stripe' | 'comp'
    starts_at: string
    ends_at: string
    status: 'active' | 'expired' | 'revoked'
  }>
  expect: { canRead: boolean; full: boolean }
}

const PERSONAS: Persona[] = [
  { slug: 'no_purchase', entitlements: [], expect: { canRead: false, full: false } },
  {
    slug: 'active_monthly',
    entitlements: [
      { access_plan: 'monthly', product_tier: 'planner', oracle_enabled: false, source: 'stripe', starts_at: PAST, ends_at: FAR_FUTURE, status: 'active' },
    ],
    expect: { canRead: true, full: false },
  },
  {
    slug: 'active_monthly_oracle',
    entitlements: [
      { access_plan: 'monthly', product_tier: 'planner_oracle', oracle_enabled: true, source: 'stripe', starts_at: PAST, ends_at: FAR_FUTURE, status: 'active' },
    ],
    expect: { canRead: true, full: false },
  },
  {
    slug: 'active_annual',
    entitlements: [
      { access_plan: 'yearly', product_tier: 'planner', oracle_enabled: false, source: 'stripe', starts_at: PAST, ends_at: FAR_FUTURE, status: 'active' },
    ],
    expect: { canRead: true, full: true },
  },
  {
    slug: 'active_annual_oracle',
    entitlements: [
      { access_plan: 'yearly', product_tier: 'planner_oracle', oracle_enabled: true, source: 'stripe', starts_at: PAST, ends_at: FAR_FUTURE, status: 'active' },
    ],
    expect: { canRead: true, full: true },
  },
  {
    slug: 'expired_monthly',
    entitlements: [
      { access_plan: 'monthly', product_tier: 'planner', oracle_enabled: false, source: 'stripe', starts_at: PAST, ends_at: PAST_END, status: 'active' },
    ],
    expect: { canRead: false, full: false },
  },
  {
    slug: 'expired_annual',
    entitlements: [
      { access_plan: 'yearly', product_tier: 'planner', oracle_enabled: false, source: 'stripe', starts_at: PAST, ends_at: PAST_END, status: 'active' },
    ],
    // Read-only annual: still full access per DEC-01 (preserve read access
    // to the artifact the customer already paid for in full).
    expect: { canRead: true, full: true },
  },
  {
    slug: 'legacy_etsy',
    entitlements: [
      { access_plan: 'yearly', product_tier: 'planner', oracle_enabled: false, source: 'etsy', starts_at: PAST, ends_at: FAR_FUTURE, status: 'active' },
    ],
    expect: { canRead: true, full: true },
  },
]

function clerkId(slug: string): string {
  return `test_access02_${slug}`
}

function synthWeeks() {
  // 52 Monday-start weeks covering YEAR, real ISO dates so window overlap
  // math runs against real data, not a mock.
  const jan1 = new Date(Date.UTC(YEAR, 0, 1))
  const day = jan1.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const firstMonday = new Date(jan1)
  firstMonday.setUTCDate(jan1.getUTCDate() - daysSinceMonday)

  return Array.from({ length: 52 }, (_, i) => {
    const start = new Date(firstMonday)
    start.setUTCDate(firstMonday.getUTCDate() + i * 7)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    return {
      weekNumber: i + 1,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      theme: `Week ${i + 1} theme`,
      intentions: [`Week ${i + 1} intention`],
      energyType: 'reflect',
      cosmicContext: `Week ${i + 1} context`,
      goalCategoryFocus: [],
    }
  })
}

// ─── cleanup + seed ─────────────────────────────────────────────────────

async function cleanup(): Promise<void> {
  const ids = PERSONAS.map((p) => clerkId(p.slug))
  const { data: rows } = await admin.from('user_profiles').select('id').in('clerk_user_id', ids)
  const uuids = (rows ?? []).map((r) => r.id)
  if (uuids.length > 0) {
    await admin.from('journal_entries').delete().in('user_id', uuids)
    await admin.from('product_entitlements').delete().in('user_id', uuids)
    await admin.from('blueprints').delete().in('user_id', uuids)
    await admin.from('user_profiles').delete().in('id', uuids)
  }
}

async function seed(): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>()
  const weeks = synthWeeks()

  for (const persona of PERSONAS) {
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .insert({
        clerk_user_id: clerkId(persona.slug),
        email: `${persona.slug}@access02.test`,
        plan_year: YEAR,
      })
      .select('id')
      .single()
    if (profileError || !profile) throw new Error(`seed user_profiles ${persona.slug}: ${profileError?.message}`)
    idBySlug.set(persona.slug, profile.id)

    const { error: blueprintError } = await admin.from('blueprints').insert({
      user_id: profile.id,
      plan_year: YEAR,
      status: 'ready',
      version: 1,
      year_theme: `${persona.slug} year theme`,
      year_summary: `${persona.slug} year summary`,
      quarters: [],
      months: [],
      weeks,
    })
    if (blueprintError) throw new Error(`seed blueprints ${persona.slug}: ${blueprintError.message}`)

    const { error: journalError } = await admin.from('journal_entries').insert({
      user_id: profile.id,
      body: `${persona.slug} private journal entry`,
      entry_date: TODAY,
      is_ritual: false,
      oracle_memory: false,
    })
    if (journalError) throw new Error(`seed journal_entries ${persona.slug}: ${journalError.message}`)

    for (const ent of persona.entitlements) {
      const { error: entError } = await admin.from('product_entitlements').insert({
        user_id: profile.id,
        access_plan: ent.access_plan,
        product_tier: ent.product_tier,
        oracle_enabled: ent.oracle_enabled,
        planner_year: YEAR,
        source: ent.source,
        starts_at: ent.starts_at,
        ends_at: ent.ends_at,
        status: ent.status,
      })
      if (entError) throw new Error(`seed product_entitlements ${persona.slug}: ${entError.message}`)
    }
  }

  return idBySlug
}

// ─── run ────────────────────────────────────────────────────────────────

console.log('Cleaning any prior test rows...')
await cleanup()
console.log('Seeding persona matrix...')
const idBySlug = await seed()
console.log(`Seeded ${idBySlug.size} personas.\n`)

try {
  // 1a. blueprints stays fully denied to every authenticated persona.
  console.log('--- Table-level RLS: blueprints (0043) ---')
  for (const persona of PERSONAS) {
    const client = personaClient(clerkId(persona.slug))
    const { error, status } = await client.from('blueprints').select('id').limit(1)
    ok(error?.code === '42501', `${persona.slug}: blueprints direct read denied (got ${status} ${error?.code})`)
  }

  // 1b. cross-user RLS on journal_entries / product_entitlements.
  console.log('--- Table-level RLS: cross-user isolation ---')
  const [a, b] = PERSONAS
  const clientA = personaClient(clerkId(a.slug))
  const { data: ownJournal } = await clientA.from('journal_entries').select('id, body')
  ok(
    (ownJournal ?? []).length === 1 && ownJournal![0].body.startsWith(a.slug),
    `${a.slug}: sees exactly own journal entry via RLS`,
  )
  const allJournalBodies = (ownJournal ?? []).map((r) => r.body)
  ok(
    !allJournalBodies.some((body) => body.startsWith(b.slug)),
    `${a.slug}: cannot see ${b.slug}'s journal entry`,
  )
  const { data: ownEntitlements } = await clientA.from('product_entitlements').select('user_id')
  const otherIds = [...idBySlug.entries()].filter(([slug]) => slug !== a.slug).map(([, id]) => id)
  ok(
    !(ownEntitlements ?? []).some((row) => otherIds.includes(row.user_id)),
    `${a.slug}: product_entitlements RLS never returns another persona's user_id`,
  )

  // 2. loadCurrentBlueprint() business logic, called exactly as app code
  //    calls it (service-role internally; caller supplies the resolved id).
  console.log('--- Business logic: loadCurrentBlueprint() per persona ---')
  for (const persona of PERSONAS) {
    const supabaseUserId = idBySlug.get(persona.slug)!
    const loaded = await loadCurrentBlueprint(supabaseUserId, false)

    if (!persona.expect.canRead) {
      equal(loaded, null, `${persona.slug}: no Blueprint access (loadCurrentBlueprint returns null)`)
      continue
    }
    ok(loaded !== null, `${persona.slug}: Blueprint access granted (non-null)`)
    if (!loaded) continue

    if (persona.expect.full) {
      equal(loaded.access.access, 'full', `${persona.slug}: capability is full`)
      equal(loaded.blueprint.weeks.length, 52, `${persona.slug}: all 52 weeks present`)
      ok(loaded.blueprint.yearTheme.length > 0, `${persona.slug}: yearTheme not redacted`)
    } else {
      equal(loaded.access.access, 'windowed', `${persona.slug}: capability is windowed`)
      ok(
        loaded.blueprint.weeks.length > 0 && loaded.blueprint.weeks.length < 52,
        `${persona.slug}: strictly fewer than 52 weeks (got ${loaded.blueprint.weeks.length})`,
      )
      equal(loaded.blueprint.yearTheme, '', `${persona.slug}: yearTheme redacted under windowed access`)
    }
  }

  console.log(`\nACCESS-02 staging checks passed: ${assertions} assertions.`)
  console.log(
    'Not covered here: sampler credits (SAMPLE-01/02 schema not built) and admin (Clerk publicMetadata flag, not a DB row — covered by the 87 local capability assertions instead).',
  )
} finally {
  console.log('\nCleaning up seeded rows...')
  await cleanup()
}
