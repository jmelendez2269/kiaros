import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateCurriculumDraft } from '@/lib/ai/curriculum-generator'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

const requestSchema = z.object({
  prompt: z.string().min(10).max(2000),
  targetWeeks: z.number().int().min(1).max(52).optional(),
})

export const maxDuration = 180

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: Request) {
  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sse({ step: 'analyzing', label: 'Analyzing your prompt…' }))

        const admin = createAdminSupabase()
        const { data: profile, error: profileError } = await admin
          .from('user_profiles')
          .select('id, display_name, study_focus')
          .eq('clerk_user_id', userId)
          .maybeSingle()

        if (profileError || !profile) {
          controller.enqueue(sse({ step: 'error', error: 'Profile not found' }))
          controller.close()
          return
        }

        controller.enqueue(sse({ step: 'generating', label: 'Building your curriculum…' }))

        const draft = await generateCurriculumDraft({
          prompt: body.prompt,
          targetWeeks: body.targetWeeks ?? null,
          studyFocus: profile.study_focus ?? null,
          displayName: profile.display_name ?? null,
        })

        controller.enqueue(sse({ step: 'saving', label: 'Saving your plan…' }))

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
            constraints: body.prompt,
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

          controller.enqueue(sse({
            step: 'error',
            error: relationMissing
              ? 'The curriculum tables are not in Supabase yet. Run migration 0004_curriculum_plans.sql and try again.'
              : rawMessage,
          }))
          controller.close()
          return
        }

        controller.enqueue(sse({ step: 'done', plan }))
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to generate curriculum'
        const timedOut =
          message.toLowerCase().includes('timeout') ||
          message.toLowerCase().includes('aborted') ||
          (error instanceof Error && error.name === 'AbortError')

        controller.enqueue(sse({
          step: 'error',
          error: timedOut
            ? 'Curriculum generation took too long. Try a shorter duration or lighter density, or run it again.'
            : message,
        }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
