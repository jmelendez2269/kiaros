import 'server-only'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { preferencesSchema, reportSchema, evidenceSchema, type SavedReport, type Feedback, type Intention } from './report-schema'
export async function preferences(userId: string) {
  const { data, error } = await createAdminSupabase().from('reflection_preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Reflection storage is not available yet')
  return preferencesSchema.parse(data ?? { timezone: null, automatic: false, include_goals: true, evidence_revision: 0, seen_at: null })
}
export async function reports(userId: string): Promise<SavedReport[]> {
  // Read revision after rows: any source mutation completed during the row read hides old content.
  const { data, error } = await createAdminSupabase().from('reflection_reports')
    .select('id,kind,period_start,period_end,timezone,status,content,analysis,generated_at,sources,revision')
    .eq('user_id', userId).order('period_start', { ascending: false }).limit(100)
  if (error) throw new Error('Reflections could not be loaded')
  const pref = await preferences(userId)
  return (data ?? []).map(row => {
    const r = row as SavedReport
    if (r.revision !== pref.evidence_revision || !['ready', 'empty'].includes(r.status)) return { ...r, content: null, sources: [], analysis: null, status: r.status === 'generating' ? 'generating' : r.status === 'failed' ? 'failed' : 'stale' }
    return { ...r, content: r.content ? reportSchema.parse(r.content) : null, sources: z.array(evidenceSchema).parse(r.sources) }
  })
}
export async function feedback(userId: string): Promise<Feedback[]> {
  const { data, error } = await createAdminSupabase().from('reflection_feedback').select('report_id,claim_key,verdict,note').eq('user_id', userId).order('updated_at', { ascending: false }).limit(200)
  if (error) throw new Error('Reflection feedback could not be loaded')
  return (data ?? []) as Feedback[]
}
export async function intentions(userId: string): Promise<Intention[]> {
  const { data, error } = await createAdminSupabase().from('reflection_intentions').select('id,report_id,text,outcome,created_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100)
  if (error) throw new Error('Reflection intentions could not be loaded')
  return (data ?? []) as Intention[]
}
