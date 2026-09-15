import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { latestClosed } from './periods'
import { generateReflection, hasReflectionAccess } from './service'
export async function runReflectionSchedule() {
  const admin = createAdminSupabase(), started = Date.now()
  const { data, error } = await admin.from('reflection_preferences').select('user_id,timezone')
    .eq('automatic', true).not('timezone', 'is', null).order('checked_at').order('user_id').limit(40)
  if (error) throw new Error('Reflection scheduling is unavailable')
  let completed = 0, failed = 0, checked = 0
  for (const row of data ?? []) {
    if (Date.now() - started > 20000) break // Leave enough time for one complete generation within maxDuration.
    const userId = String(row.user_id), timezone = String(row.timezone)
    await admin.from('reflection_preferences').update({ checked_at: new Date().toISOString() }).eq('user_id', userId)
    checked++
    if (!await hasReflectionAccess(userId)) continue
    for (const kind of ['month', 'quarter', 'year'] as const) {
      if (Date.now() - started > 20000) break
      try { await generateReflection(userId, latestClosed(kind, timezone)); completed++ }
      catch { failed++ }
    }
  }
  return { checked, completed, failed }
}
