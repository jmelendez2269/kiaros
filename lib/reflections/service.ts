import 'server-only'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { resolveUserAccess, loadOrderSubscriptionMap, extractStripeOrderIds, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { assertClosed, type ReflectionPeriod } from './periods'
import { preferences, feedback } from './repository'
import { loadEvidence } from './load-evidence'
import { analyzePeriod } from './analyze-period'
import { generateReflectionContent } from '@/lib/ai/reflection-generator'
import { generateSkyReading } from './sky-reading'
export async function hasReflectionAccess(userId: string): Promise<boolean> {
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('product_entitlements').select('*').eq('user_id', userId).neq('status', 'revoked')
  if (error) throw new Error('Access could not be verified')
  
  const orderIds = extractStripeOrderIds(data ?? []);
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId });
  
  return resolveUserAccess(
    (data ?? []) as ProductEntitlementRecord[],
    undefined,
    undefined,
    subscriptionMap
  ).hasPlannerAccess
}
/**
 * The first day of the member's earliest subscription that wasn't revoked
 * (YYYY-MM-DD), or null when there is none. Reflections start from here.
 */
export async function memberSince(userId: string): Promise<string | null> {
  const { data, error } = await createAdminSupabase().from('product_entitlements').select('starts_at')
    .eq('user_id', userId).neq('status', 'revoked').order('starts_at', { ascending: true }).limit(1)
  if (error) throw new Error('Membership could not be verified')
  const start = data?.[0]?.starts_at
  return start ? String(start).slice(0, 10) : null
}
export async function generateReflection(userId: string, period: ReflectionPeriod, force = false) {
  assertClosed(period)
  const since = await memberSince(userId)
  if (since && period.end <= since) throw new Error('This period ended before your membership began')
  if (!await hasReflectionAccess(userId)) throw new Error('An active planner subscription is required')
  const pref = await preferences(userId)
  if (pref.timezone !== period.timezone) throw new Error('Please save your timezone first')
  const admin = createAdminSupabase()
  const claimResult = await admin.rpc('claim_reflection', { p_user_id: userId, p_kind: period.kind, p_start: period.start, p_end: period.end, p_timezone: period.timezone, p_force: force })
  if (claimResult.error) {
    const message = claimResult.error.message
    if (/generation_in_progress|retry_later/.test(message)) throw new Error('Your reflection is already being prepared. Please check again shortly.')
    if (message.includes('generation_limit')) throw new Error('Your daily reflection generation limit has been reached. Please try tomorrow.')
    throw new Error('Unable to begin this reflection')
  }
  const claim = z.object({ cached: z.boolean(), id: z.string().uuid(), token: z.string().uuid().optional(), revision: z.number().optional() }).parse(claimResult.data)
  if (claim.cached) return claim.id
  try {
    const [evidence, history] = await Promise.all([loadEvidence(userId, period), feedback(userId)])
    const analysis = analyzePeriod(evidence, period)
    const lived = analysis.evidence.filter(e => e.authored && !['goal_event', 'task', 'intention'].includes(e.kind))
    // The sky is read for every period, so one with nothing recorded still has something true to show.
    // It must never cost the member the reflection written from their own words: a failure is saved as null.
    const [generated, sky] = await Promise.all([
      lived.length ? generateReflectionContent(userId, period, analysis, history, pref.include_goals) : null,
      generateSkyReading(userId, period, lived.length > 0).catch(error => {
        console.error('[reflections] sky reading unavailable:', error instanceof Error ? error.message : 'unknown error')
        return null
      }),
    ])
    if (!await hasReflectionAccess(userId)) throw new Error('Planner access changed during generation')
    const { evidence: _evidence, ...coverage } = analysis
    const saved = await admin.rpc('finish_reflection', { p_user_id: userId, p_report_id: claim.id,
      p_token: claim.token, p_revision: claim.revision, p_content: generated?.content ?? null,
      p_analysis: { ...coverage, sky }, p_sources: generated?.sources ?? [], p_model: generated?.model ?? 'no-generation' })
    if (saved.error || saved.data !== true) throw new Error('Your source information changed. Please generate a fresh reflection.')
    return claim.id
  } catch (error) {
    await admin.from('reflection_reports').update({ status: 'failed', lease_token: null, lease_until: null,
      next_attempt_at: new Date(Date.now() + 60000).toISOString() }).eq('id', claim.id).eq('user_id', userId).eq('lease_token', claim.token)
    throw error
  }
}
