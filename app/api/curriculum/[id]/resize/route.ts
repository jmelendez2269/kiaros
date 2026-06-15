import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateCurriculumDraft } from '@/lib/ai/curriculum-generator'

const requestSchema = z.object({
  targetWeeks: z.number().int().min(1).max(52),
})

export const maxDuration = 60

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = requestSchema.parse(await req.json())
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, display_name, study_focus')
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('curriculum_plans')
      .select('id, constraints, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft plans can be resized.' }, { status: 400 })
    }

    const storedPrompt = existing.constraints
    if (!storedPrompt || storedPrompt.length < 10) {
      return NextResponse.json({ error: 'No original prompt found for this plan.' }, { status: 400 })
    }

    const draft = await generateCurriculumDraft({
      prompt: storedPrompt,
      targetWeeks: body.targetWeeks,
      studyFocus: profile.study_focus ?? null,
      displayName: profile.display_name ?? null,
    })

    const { data: plan, error: updateError } = await admin
      .from('curriculum_plans')
      .update({
        topic: draft.topic,
        title: draft.title,
        intensity: draft.intensity,
        duration_weeks: draft.durationWeeks,
        weekly_hours: draft.weeklyHours,
        objectives: draft.objectives,
        outcomes: draft.outcomes,
        skills: draft.skills,
        curriculum: draft,
        summary: draft.summary,
      })
      .eq('id', id)
      .select(
        'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
      )
      .single()

    if (updateError || !plan) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resize curriculum'
    const timedOut =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('aborted') ||
      (error instanceof Error && error.name === 'AbortError')

    return NextResponse.json(
      { error: timedOut ? 'Resize took too long. Try again.' : message },
      { status: timedOut ? 504 : 400 }
    )
  }
}
