import { auth } from '@clerk/nextjs/server'
import { NextResponse, after } from 'next/server'
import { z } from 'zod'

import { createServerSupabase } from '@/lib/supabase/server'
import { tagCaptureInBackground } from '@/lib/ai/capture-topic-extractor'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'

const uiMessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough()

const createCaptureSchema = z.object({
  captured_text: z.string().trim().min(1).max(20000),
  source_message_id: z.string().trim().max(160).optional().nullable(),
  source_role: z.enum(['user', 'assistant', 'system']).default('assistant'),
  source_excerpt: z.string().trim().max(800).optional().nullable(),
  include_in_insights: z.boolean().optional(),
  include_in_planner: z.boolean().optional(),
  thread_messages: z.array(uiMessageSchema).max(500).optional().nullable(),
  tradition: z.string().trim().max(40).optional().nullable(),
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

    const { data: entitlements, error: entitlementsError } = await supabase
      .from('product_entitlements')
      .select(
        'id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan'
      )
      .eq('user_id', profile.id)
      .neq('status', 'revoked')

    if (entitlementsError) {
      return NextResponse.json({ error: entitlementsError.message }, { status: 500 })
    }

    const access = resolveUserAccess((entitlements ?? []) as ProductEntitlementRecord[])
    if (!access.hasOracleAccess) {
      return NextResponse.json(
        {
          error: 'oracle_upgrade_required',
          message: 'Stelloquy captures require an active Planner + Oracle plan.',
          upgradeAvailable: true,
        },
        { status: 403 }
      )
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
        thread_messages: body.thread_messages ?? null,
        tradition: body.tradition || null,
      })
      .select(
        'id, captured_text, source_message_id, source_role, source_excerpt, include_in_insights, include_in_planner, thread_messages, tradition, created_at'
      )
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    after(() =>
      tagCaptureInBackground({
        userProfileId: profile.id,
        captureId: data.id,
        capturedText: data.captured_text,
        precedingPrompt: data.source_excerpt ?? null,
      }).catch((err) => console.error('[oracle-captures] tag extraction failed:', err))
    )

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid capture' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to save Stelloquy capture' }, { status: 500 })
  }
}
