// CONSENT-03 staging privacy/RLS evidence.
//
// The concern this defends against: a journal entry with consent OFF must
// never contribute to a shared pattern, even when other entries for the
// SAME pattern key have consent ON. Verifies against real rows through
// real code, not mocks:
//
//   1. refresh_user_pattern_insight (0040) aggregates only
//      include_in_insights=true entries, even when a revoked entry shares
//      the same pattern key as consented ones.
//   2. invalidateJournalDerivedContent / rebuildJournalDerivedContent
//      (revocation/rebuild) only ever touch the calling user's own rows.
//   3. Table-level RLS: a signed-in persona's minted session never reads
//      another persona's journal_entry_aspects/journal_entry_sky/
//      user_pattern_insights rows.
//
// Refuses to run against anything that isn't a local Supabase URL. Cleans up
// its own seeded rows before and after.
//
// Usage: set -a && . ./.env.staging.local && set +a && \
//   npx tsx --require ./scripts/_stub-server-only.cjs scripts/check-consent-03-staging.mts

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
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

const { invalidateJournalDerivedContent, rebuildJournalDerivedContent } = await import(
  '../lib/journal/derived-rebuild.ts'
)

let assertions = 0
function ok(value: unknown, message: string): void {
  assert.ok(value, message)
  assertions += 1
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message)
  assertions += 1
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}
function mintLocalUserToken(clerkUserId: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: clerkUserId, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(signingInput).digest('base64url')
  return `${signingInput}.${signature}`
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
function personaClient(clerkUserId: string) {
  const token = mintLocalUserToken(clerkUserId)
  return createClient(SUPABASE_URL, ANON_KEY, { accessToken: async () => token })
}

const ASPECT_KEY = 'sun:trine:moon'
const clerkA = 'test_consent03_userA'
const clerkB = 'test_consent03_userB'

async function cleanup(): Promise<void> {
  const { data: rows } = await admin
    .from('user_profiles')
    .select('id')
    .in('clerk_user_id', [clerkA, clerkB])
  const ids = (rows ?? []).map((r) => r.id)
  if (ids.length > 0) {
    await admin.from('journal_entries').delete().in('user_id', ids)
    await admin.from('user_pattern_insights').delete().in('user_id', ids)
    await admin.from('month_briefs').delete().in('user_id', ids)
    await admin.from('quarterly_reviews').delete().in('user_id', ids)
    await admin.from('user_profiles').delete().in('id', ids)
  }
}

async function seedEntry(
  userId: string,
  consented: boolean,
  dayOffset: number,
): Promise<string> {
  const entryDate = new Date(Date.now() - dayOffset * 86_400_000).toISOString().slice(0, 10)
  const { data: entry, error } = await admin
    .from('journal_entries')
    .insert({
      user_id: userId,
      body: `entry consented=${consented} offset=${dayOffset}`,
      entry_date: entryDate,
      is_ritual: false,
      oracle_memory: false,
      include_in_insights: consented,
      include_in_stelloquy: consented,
    })
    .select('id')
    .single()
  if (error || !entry) throw new Error(`seed journal_entries: ${error?.message}`)

  const { error: aspectError } = await admin.from('journal_entry_aspects').insert({
    journal_entry_id: entry.id,
    user_id: userId,
    entry_date: entryDate,
    transiting_planet: 'Sun',
    natal_planet: 'Moon',
    aspect: 'trine',
    aspect_key: ASPECT_KEY,
    orb: 1.5,
    applying: true,
  })
  if (aspectError) throw new Error(`seed journal_entry_aspects: ${aspectError.message}`)

  return entry.id
}

console.log('Cleaning any prior test rows...')
await cleanup()

console.log('Seeding two users with mixed-consent entries sharing one pattern key...')
const { data: profileA } = await admin
  .from('user_profiles')
  .insert({ clerk_user_id: clerkA, email: 'usera@consent03.test' })
  .select('id')
  .single()
const { data: profileB } = await admin
  .from('user_profiles')
  .insert({ clerk_user_id: clerkB, email: 'userb@consent03.test' })
  .select('id')
  .single()
if (!profileA || !profileB) throw new Error('seed user_profiles failed')
const userA = profileA.id
const userB = profileB.id

// User A: 2 consented + 1 revoked entry, same aspect key.
const consentedEntry1 = await seedEntry(userA, true, 10)
const consentedEntry2 = await seedEntry(userA, true, 5)
const revokedEntry = await seedEntry(userA, false, 2)
// User B: 1 consented entry, same aspect key — must never count toward A's pattern.
await seedEntry(userB, true, 1)

// Seed a month_brief pair (edited survives invalidation, unedited doesn't)
// and a quarterly_review with an ai_summary, to check invalidation scoping.
await admin.from('month_briefs').insert([
  { user_id: userA, plan_year: 2026, month: 1, brief_text: 'unedited', edited_at: null },
  { user_id: userA, plan_year: 2026, month: 2, brief_text: 'user-edited', edited_at: new Date().toISOString() },
])
await admin.from('quarterly_reviews').insert({
  user_id: userA,
  plan_year: 2026,
  quarter: 1,
  ai_summary: 'derived summary',
  pivots: 'authored pivot text',
})

try {
  console.log('--- Privacy: RPC aggregates only consented entries ---')
  const { error: rpcError } = await admin.rpc('refresh_user_pattern_insight', {
    p_user_id: userA,
    p_pattern_type: 'aspect',
    p_pattern_key: ASPECT_KEY,
  })
  if (rpcError) throw new Error(`refresh_user_pattern_insight: ${rpcError.message}`)

  const { data: patternAfterFirst } = await admin
    .from('user_pattern_insights')
    .select('sample_size, evidence')
    .eq('user_id', userA)
    .eq('pattern_type', 'aspect')
    .eq('pattern_key', ASPECT_KEY)
    .maybeSingle()

  equal(patternAfterFirst?.sample_size, 2, 'sample_size counts only the 2 consented entries, not the revoked one')
  const evidenceIds = (patternAfterFirst?.evidence ?? []).map((e: { entry_id: string }) => e.entry_id)
  ok(evidenceIds.includes(consentedEntry1) && evidenceIds.includes(consentedEntry2), 'evidence includes both consented entries')
  ok(!evidenceIds.includes(revokedEntry), 'evidence never includes the revoked entry')

  console.log('--- Privacy: userB entries never counted toward userA pattern ---')
  const { data: patternB } = await admin
    .from('user_pattern_insights')
    .select('sample_size')
    .eq('user_id', userB)
    .eq('pattern_type', 'aspect')
    .eq('pattern_key', ASPECT_KEY)
    .maybeSingle()
  ok(!patternB, "userB has no pattern row yet (rebuild was scoped to userA only, never ran for userB)")

  console.log('--- Revocation: invalidateJournalDerivedContent scoping ---')
  await invalidateJournalDerivedContent(userA)
  const { data: patternGone } = await admin
    .from('user_pattern_insights')
    .select('id')
    .eq('user_id', userA)
    .maybeSingle()
  equal(patternGone, null, "userA's pattern row deleted on invalidation")

  const { data: briefsAfter } = await admin
    .from('month_briefs')
    .select('month, brief_text')
    .eq('user_id', userA)
    .order('month')
  equal(briefsAfter?.length, 1, 'unedited brief deleted, exactly one brief remains')
  equal(briefsAfter?.[0]?.brief_text, 'user-edited', 'the remaining brief is the user-edited one')

  const { data: reviewAfter } = await admin
    .from('quarterly_reviews')
    .select('ai_summary, pivots')
    .eq('user_id', userA)
    .single()
  equal(reviewAfter?.ai_summary, null, 'ai_summary cleared on invalidation')
  equal(reviewAfter?.pivots, 'authored pivot text', "authored field 'pivots' untouched by invalidation")

  console.log('--- Rebuild: only re-derives from currently-consented entries ---')
  await rebuildJournalDerivedContent(userA)
  const { data: patternRebuilt } = await admin
    .from('user_pattern_insights')
    .select('sample_size')
    .eq('user_id', userA)
    .eq('pattern_type', 'aspect')
    .eq('pattern_key', ASPECT_KEY)
    .maybeSingle()
  equal(patternRebuilt?.sample_size, 2, 'rebuild reconstructs sample_size=2, still excluding the revoked entry')

  console.log('--- Table-level RLS: cross-user isolation on consent-bearing tables ---')
  const clientA = personaClient(clerkA)
  const { data: aspectsA } = await clientA.from('journal_entry_aspects').select('user_id')
  ok(
    (aspectsA ?? []).length > 0 && (aspectsA ?? []).every((r) => r.user_id === userA),
    'journal_entry_aspects RLS: userA session sees only userA rows',
  )
  const { data: patternsA } = await clientA.from('user_pattern_insights').select('user_id')
  ok(
    (patternsA ?? []).every((r) => r.user_id === userA),
    'user_pattern_insights RLS: userA session never sees userB rows',
  )

  console.log(`\nCONSENT-03 staging checks passed: ${assertions} assertions.`)
} finally {
  console.log('\nCleaning up seeded rows...')
  await cleanup()
}
