import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateCurriculumDraft } from '@/lib/ai/curriculum-generator'

const requestSchema = z.object({
  topic: z.string().min(2).max(140),
  durationWeeks: z.number().int().min(1).max(52),
  intensity: z.enum(['light', 'balanced', 'dense']),
  skills: z.array(z.string().min(1).max(120)).max(12).default([]),
  goals: z.string().max(800).optional(),
  constraints: z.string().max(800).optional(),
})

export const maxDuration = 180

export async function POST(req: Request) {
  try {
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

    const draft = await generateCurriculumDraft({
      topic: body.topic,
      durationWeeks: body.durationWeeks,
      intensity: body.intensity,
      skills: body.skills,
      goals: body.goals ?? null,
      constraints: body.constraints ?? null,
      studyFocus: profile.study_focus ?? null,
      displayName: profile.display_name ?? null,
    })

    const { data: plan, error: insertError } = await admin
      .from('curriculum_plans')
      .insert({
        user_id: profile.id,
        topic: draft.topic,
        title: draft.title,
        status: 'draft',
        intensity: draft.intensity,
        duration_weeks: draft.durationWeeks,
        weekly_hours: draft.weeklyHours,
        objectives: draft.objectives,
        outcomes: draft.outcomes,
        skills: draft.skills,
        curriculum: draft,
        summary: draft.summary,
        constraints: body.constraints ?? null,
      })
      .select(
        'id, topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, curriculum, summary, constraints, start_date, approved_at, created_at'
      )
      .single()

    if (insertError || !plan) {
      const rawMessage = insertError?.message || 'Failed to save draft curriculum'
      const relationMissing =
        rawMessage.toLowerCase().includes('relation') &&
        rawMessage.toLowerCase().includes('curriculum_plans')

      console.error('[curriculum.generate] insert failed:', insertError)

      return NextResponse.json(
        {
          error: relationMissing
            ? 'The curriculum tables are not in Supabase yet. Run migration 0004_curriculum_plans.sql and try again.'
            : rawMessage,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate curriculum'
    const timedOut =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('aborted') ||
      (error instanceof Error && error.name === 'AbortError')

    return NextResponse.json(
      {
        error: timedOut
          ? 'Curriculum generation took too long. Try a shorter duration or lighter density, or run it again now that the timeout window is larger.'
          : message,
      },
      { status: timedOut ? 504 : 400 }
    )
  }
}
