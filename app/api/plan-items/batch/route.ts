import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

interface BatchPlacement {
  id: string
  startMinute: number
  durationMinutes: number
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || !Array.isArray(body.placements)) {
    return NextResponse.json({ error: 'placements must be an array' }, { status: 400 })
  }

  const placements: BatchPlacement[] = []
  for (const p of body.placements) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      typeof p.startMinute !== 'number' ||
      !Number.isInteger(p.startMinute) ||
      p.startMinute < 0 ||
      p.startMinute >= 1440 ||
      typeof p.durationMinutes !== 'number' ||
      !Number.isInteger(p.durationMinutes) ||
      p.durationMinutes <= 0
    ) {
      return NextResponse.json({ error: 'Each placement needs a valid id, startMinute, and durationMinutes' }, { status: 400 })
    }
    placements.push({ id: p.id, startMinute: p.startMinute, durationMinutes: p.durationMinutes })
  }

  if (placements.length === 0) {
    return NextResponse.json({ error: 'No placements to apply' }, { status: 400 })
  }

  // RLS on plan_items restricts updates to the caller's own rows, so a spoofed
  // id belonging to another user simply matches nothing.
  const supabase = await createServerSupabase()
  const updated = []
  for (const p of placements) {
    const { data, error } = await supabase
      .from('plan_items')
      .update({ start_minute: p.startMinute, duration_minutes: p.durationMinutes, source: 'ai-placed' })
      .eq('id', p.id)
      .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data) updated.push(data)
  }

  return NextResponse.json({ items: updated })
}
