import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserProfileId } from '@/lib/ai/usage'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { preferences, reports, feedback, intentions } from '@/lib/reflections/repository'
import { feedbackSchema } from '@/lib/reflections/report-schema'
import { periodFor, validTimezone } from '@/lib/reflections/periods'
import { generateReflection } from '@/lib/reflections/service'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate'), kind: z.enum(['month', 'quarter', 'year']), year: z.number().int().min(2000).max(2100), index: z.number().int().min(1).max(12), force: z.boolean().optional() }),
  z.object({ action: z.literal('preferences'), timezone: z.string().refine(validTimezone, 'Please enter a valid timezone'), automatic: z.boolean(), include_goals: z.boolean() }),
  feedbackSchema.extend({ action: z.literal('feedback') }),
  z.object({ action: z.literal('intention'), report_id: z.string().uuid(), suggestion_index: z.number().int().min(0).max(2), text: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal('outcome'), id: z.string().uuid(), text: z.string().trim().min(1).max(1000), outcome: z.string().max(1000) }),
  z.object({ action: z.literal('seen') }),
])
const headers = { 'Cache-Control': 'private, no-store' }
async function identity() {
  const { userId } = await auth()
  if (!userId) return null
  return getUserProfileId(userId)
}
export async function GET(request: Request) {
  const userId = await identity()
  if (!userId) return NextResponse.json({ error: 'Please sign in' }, { status: 401, headers })
  try {
    if (new URL(request.url).searchParams.get('notification') === '1') {
      const settings = await preferences(userId)
      const result = await createAdminSupabase().from('reflection_reports').select('id')
        .eq('user_id', userId).eq('status', 'ready').eq('revision', settings.evidence_revision)
        .gt('first_generated_at', settings.seen_at ?? '1970-01-01T00:00:00Z').limit(1)
      if (result.error) throw new Error('Notifications unavailable')
      return NextResponse.json({ available: Boolean(result.data?.length) }, { headers })
    }
    const [settings, saved, responses, accepted] = await Promise.all([preferences(userId), reports(userId), feedback(userId), intentions(userId)])
    return NextResponse.json({ settings, reports: saved, feedback: responses, intentions: accepted }, { headers })
  } catch {
    return NextResponse.json({ error: 'Reflections are temporarily unavailable. Please try again shortly.' }, { status: 503, headers })
  }
}
export async function POST(request: Request) {
  const userId = await identity()
  if (!userId) return NextResponse.json({ error: 'Please sign in' }, { status: 401, headers })
  // Same-origin browser writes; cron uses its own authenticated endpoint.
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403, headers })
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Invalid request' }, { status: 400, headers })
  const input = body.data, admin = createAdminSupabase()
  try {
    if (input.action === 'generate') {
      const settings = await preferences(userId)
      if (!settings.timezone) throw new Error('Please save your timezone first')
      const id = await generateReflection(userId, periodFor(input.kind, input.year, input.index, settings.timezone), input.force)
      return NextResponse.json({ id }, { headers })
    }
    if (input.action === 'preferences') {
      const result = await admin.rpc('save_reflection_preferences', { p_user_id: userId, p_timezone: input.timezone, p_automatic: input.automatic, p_include_goals: input.include_goals })
      if (result.error) throw new Error('Your reflection settings could not be saved')
    }
    if (input.action === 'feedback' || input.action === 'intention') {
      const report = (await reports(userId)).find(r => r.id === input.report_id && r.status === 'ready')
      if (!report?.content) throw new Error('Please refresh this reflection before responding')
      if (input.action === 'feedback') {
        if (!report.content.observations.some(o => o.key === input.claim_key)) throw new Error('Observation not found')
        const { action: _action, ...values } = input
        const result = await admin.from('reflection_feedback').upsert({ ...values, user_id: userId, updated_at: new Date().toISOString() })
        if (result.error) throw new Error('Your response could not be saved')
      } else {
        if (!report.content.lookingAhead.experiments[input.suggestion_index]) throw new Error('Suggestion not found')
        const result = await admin.from('reflection_intentions').upsert({ user_id: userId, report_id: input.report_id, suggestion_index: input.suggestion_index, text: input.text }, { onConflict: 'user_id,report_id,suggestion_index' })
        if (result.error) throw new Error('Your intention could not be saved')
      }
    }
    if (input.action === 'outcome') {
      const result = await admin.from('reflection_intentions').update({ text: input.text, outcome: input.outcome || null, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('id', input.id).select('id').maybeSingle()
      if (result.error || !result.data) throw new Error('Your intention could not be updated')
    }
    if (input.action === 'seen') {
      const result = await admin.from('reflection_preferences').update({ seen_at: new Date().toISOString() }).eq('user_id', userId)
      if (result.error) throw new Error('Unable to update notifications')
    }
    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Your reflection could not be saved'
    return NextResponse.json({ error: message }, { status: /limit|already being/.test(message) ? 429 : 400, headers })
  }
}
