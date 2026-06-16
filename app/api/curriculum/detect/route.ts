import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase } from '@/lib/supabase/server'
import { detectCurriculumSplit } from '@/lib/ai/curriculum-detector'

const requestSchema = z.object({
  prompt: z.string().min(10).max(2000),
})

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json())
    const supabase = await createServerSupabase()

    const { error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const result = await detectCurriculumSplit(body.prompt)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Detection failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
