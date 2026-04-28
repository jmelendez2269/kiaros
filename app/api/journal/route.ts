import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'

const transitContextSchema = z
  .object({
    area: z.string().trim().min(1).max(120).optional(),
    theme: z.string().trim().min(1).max(200).optional(),
    prompt: z.string().trim().min(1).max(500).optional(),
    week: z.number().int().min(1).max(52).optional(),
    start: z.string().trim().min(1).max(20).optional(),
    end: z.string().trim().min(1).max(20).optional(),
    context: z.string().trim().min(1).max(2000).optional(),
  })
  .partial()
  .nullable()
  .optional()

const createJournalEntrySchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  body: z.string().trim().min(1).max(12000),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_ritual: z.boolean().optional(),
  oracle_memory: z.boolean().optional(),
  transit_context: transitContextSchema,
})

export async function POST(req: Request) {
  const supabase = await createServerSupabase()

  try {
    const body = createJournalEntrySchema.parse(await req.json())

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
      .from('journal_entries')
      .insert({
        user_id: profile.id,
        title: body.title?.trim() || null,
        body: body.body,
        entry_date: body.entry_date,
        is_ritual: body.is_ritual ?? false,
        oracle_memory: body.oracle_memory ?? false,
        transit_context: body.transit_context ?? null,
      })
      .select('id, title, body, entry_date, is_ritual, created_at, oracle_memory')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid journal entry' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
