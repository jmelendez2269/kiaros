// Seeds Mara Vesper (mara@example.com, Clerk publicMetadata.isDemo) into
// local Docker Supabase as an active annual planner+oracle persona, for the
// e2e/ Playwright suite (SAFE-02 / CONSENT-02 / ACCESS-04 authenticated
// evidence). Refuses to run against anything but a local Supabase URL.
//
// Requires supabase/config.toml's [auth.third_party.clerk] enabled with the
// real dev-instance domain (already checked in) — without it, real Clerk
// session tokens fail RLS locally even though sign-in itself succeeds; see
// the 2026-09-17 change log entry in
// docs/planning/access-memory-commerce-roadmap.md.
//
// Usage: set -a && . ./.env.staging.local && set +a && \
//   npx tsx scripts/seed-e2e-persona.mts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(SUPABASE_URL)) {
  console.error('Refusing: not a local URL')
  process.exit(1)
}
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const clerkId = 'user_3INN9u3PLZTKiNhDFUDEwT94Knh' // Mara Vesper, Clerk isDemo test user
const YEAR = new Date().getUTCFullYear()

await admin.from('user_profiles').delete().eq('clerk_user_id', clerkId)
const { data: profile, error: profileError } = await admin
  .from('user_profiles')
  .insert({
    clerk_user_id: clerkId,
    email: 'mara@example.com',
    display_name: 'Mara Vesper',
    plan_year: YEAR,
    onboarding_completed_at: new Date().toISOString(),
    profile_setup_completed_at: new Date().toISOString(),
    birth_date: '1990-04-12',
    birth_time: '14:30',
    birth_city: 'Portland, OR',
    birth_lat: 45.5152,
    birth_lng: -122.6784,
    birth_tz: 'America/Los_Angeles',
  })
  .select('id')
  .single()
if (profileError || !profile) throw new Error(`seed profile failed: ${profileError?.message}`)
const userId = profile.id
console.log('seeded user_profiles:', userId)

// Active annual planner + oracle entitlement (exercises CONSENT-02 journal
// write access and ACCESS-04 billing copy at once).
await admin.from('product_entitlements').insert({
  user_id: userId,
  source: 'comp',
  product_tier: 'planner_oracle',
  planner_year: YEAR,
  oracle_enabled: true,
  starts_at: `${YEAR}-01-01`,
  ends_at: `${YEAR + 1}-01-01`,
  access_plan: 'yearly',
  status: 'active',
})

// Minimal ready Blueprint so journal/settings/pricing surfaces don't bounce
// to onboarding.
const weeks = Array.from({ length: 52 }, (_, i) => ({
  weekNumber: i + 1,
  startDate: `${YEAR}-01-${String(((i % 4) + 1)).padStart(2, '0')}`,
  endDate: `${YEAR}-01-${String(((i % 4) + 1) + 6).padStart(2, '0')}`,
  theme: `Week ${i + 1} theme`,
  intentions: [`Week ${i + 1} intention`],
  energyType: 'reflect',
  cosmicContext: '',
  goalCategoryFocus: [],
}))
await admin.from('blueprints').insert({
  user_id: userId,
  plan_year: YEAR,
  status: 'ready',
  version: 1,
  year_theme: 'A year of grounded expansion',
  year_summary: 'This year invites Mara to build steady structures while staying open to what surprises her.',
  quarters: [],
  months: [],
  weeks,
})

// Ready week preview — exercises SAFE-02's authenticated artifact check.
await admin.from('week_previews').insert({
  user_id: userId,
  start_date: `${YEAR}-09-14`,
  end_date: `${YEAR}-09-20`,
  status: 'ready',
  generated_at: new Date().toISOString(),
  model_used: 'claude-sonnet-4-6',
  content: {
    weekTheme: 'Steady ground beneath a widening view',
    weekSummary: 'A week for consolidating what already works before reaching for what is next.',
    intentions: ['Notice where you already have enough', 'Say one true thing out loud'],
    reflectionPrompt: 'Where did you choose steadiness over speed this week?',
    days: Array.from({ length: 7 }, (_, i) => ({
      date: `${YEAR}-09-${14 + i}`,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      title: `Day ${i + 1} title`,
      invitation: `Day ${i + 1} invitation text.`,
      skyNote: `Day ${i + 1} sky note.`,
      energyType: 'reflect',
    })),
    sky: [],
  },
})

await admin.from('preview_access').insert({
  user_id: userId,
  status: 'active',
})

console.log('Seeded Mara fully: profile, entitlement, blueprint, week preview, preview_access.')
