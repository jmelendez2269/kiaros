import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createServerSupabase } from '@/lib/supabase/server'

const createCaptureSchema = z.object({
  captured_text: z.string().trim().min(1).max(4000),
  source_message_id: z.string().trim().max(160).optional().nullable(),
  source_role: z.enum(['user', 'assistant', 'system']).default('assistant'),
  source_excerpt: z.string().trim().max(800).optional().nullable(),
  include_in_insights: z.boolean().optional(),
  include_in_planner: z.boolean().optional(),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabase()

  try {
    const body = createCaptureSchema.parse(await req.json())

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('oracle_captures')
      .insert({
        user_id: profile.id,
        captured_text: body.captured_text,
        source_message_id: body.source_message_id || null,
        source_role: body.source_role,
        source_excerpt: body.source_excerpt || null,
        include_in_insights: body.include_in_insights ?? false,
        include_in_planner: body.include_in_planner ?? false,
      })
      .select(
        'id, captured_text, source_message_id, source_role, source_excerpt, include_in_insights, include_in_planner, created_at'
      )
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid capture' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to save Stelloquy capture' }, { status: 500 })
  }
}
