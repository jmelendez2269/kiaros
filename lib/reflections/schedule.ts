import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { catchUpOrder, closedPeriodsSince, localDate, validTimezone, type PeriodKind } from './periods'
import { generateReflection, hasReflectionAccess, memberSince } from './service'

const KINDS: PeriodKind[] = ['week', 'month', 'quarter', 'year']
// Start new work only inside this window, so a full generation (up to about 105s) still ends within maxDuration 300.
const RUN_BUDGET_MS = 180_000
// Time one member's backlog may take per run, so a long catch-up cannot starve everyone else.
const MEMBER_BUDGET_MS = 60_000
// Of the 12 generations a member may start in 24 hours, catch-up uses at most 8, so their own clicks still work.
const CATCH_UP_DAILY_SHARE = 8

/**
 * Prepares reflections for members with automatic preparation on: the period
 * that just ended, and any earlier ones since they joined that are missing or
 * out of date. Runs daily; a long backlog clears over a few days.
 */
export async function runReflectionSchedule(now = new Date()) {
  const admin = createAdminSupabase(), started = Date.now()
  const { data, error } = await admin.from('reflection_preferences').select('user_id,timezone,evidence_revision')
    .eq('automatic', true).order('checked_at').order('user_id').limit(40)
  if (error) throw new Error('Reflection scheduling is unavailable')
  let completed = 0, failed = 0, checked = 0
  for (const row of data ?? []) {
    if (Date.now() - started > RUN_BUDGET_MS) break
    const userId = String(row.user_id)
    await admin.from('reflection_preferences').update({ checked_at: new Date().toISOString() }).eq('user_id', userId)
    checked++
    const profile = await admin.from('user_profiles').select('created_at,planner_tz,birth_tz').eq('id', userId).maybeSingle()
    const p = (profile.data ?? {}) as { created_at?: string | null; planner_tz?: string | null; birth_tz?: string | null }
    // A member who never confirmed a timezone gets their planner or birth one, saved so the period maths agree.
    const timezone = row.timezone ? String(row.timezone) : [p.planner_tz, p.birth_tz].find((tz): tz is string => !!tz && validTimezone(tz)) ?? null
    if (!timezone) continue
    if (!row.timezone) {
      const saved = await admin.from('reflection_preferences').update({ timezone }).eq('user_id', userId).is('timezone', null)
      if (saved.error) continue
    }
    if (!await hasReflectionAccess(userId)) continue
    // Catch up from when their subscription began; the account date is only a fallback.
    const since = await memberSince(userId) ?? (p.created_at ? localDate(new Date(p.created_at), timezone) : `${localDate(now, timezone).slice(0, 4)}-01-01`)
    const existing = await admin.from('reflection_reports').select('kind,period_start,status,revision,analysis').eq('user_id', userId)
    if (existing.error) { failed++; continue }
    const revision = Number(row.evidence_revision ?? 0)
    const current = (existing.data ?? []).filter(r => ['ready', 'empty'].includes(String(r.status)) && Number(r.revision) === revision)
    // Saved as "not much recorded" before reflections read the sky: prepared again, once, so the period is no longer blank.
    // A reading that was tried and failed is saved as null, so it is not retried here every morning.
    const skyless = new Set(current
      .filter(r => r.status === 'empty' && !(r.analysis && typeof r.analysis === 'object' && 'sky' in r.analysis))
      .map(r => `${r.kind}:${r.period_start}`))
    const done = new Set([...current, ...(existing.data ?? []).filter(r => r.status === 'generating')]
      .map(r => `${r.kind}:${r.period_start}`).filter(key => !skyless.has(key)))
    const queue = catchUpOrder(KINDS.map(kind => closedPeriodsSince(kind, since, timezone, now)))
      .filter(period => !done.has(`${period.kind}:${period.start}`))
    if (!queue.length) continue
    const recent = await admin.from('reflection_generation_attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gt('created_at', new Date(Date.now() - 86_400_000).toISOString())
    if (recent.error) { failed++; continue }
    let allowance = CATCH_UP_DAILY_SHARE - (recent.count ?? 0)
    const memberStarted = Date.now()
    for (const period of queue) {
      if (allowance <= 0 || Date.now() - started > RUN_BUDGET_MS || Date.now() - memberStarted > MEMBER_BUDGET_MS) break
      allowance--
      try { await generateReflection(userId, period, skyless.has(`${period.kind}:${period.start}`)); completed++ }
      catch (e) {
        failed++
        // The daily per-member cap: the rest waits for a later run.
        if (e instanceof Error && /limit/.test(e.message)) break
      }
    }
  }
  return { checked, completed, failed }
}
