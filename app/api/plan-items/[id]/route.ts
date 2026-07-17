import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

const MAX_TITLE = 200

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    if (title.length > MAX_TITLE) return NextResponse.json({ error: 'Title too long' }, { status: 400 })
    update.title = title
  }

  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be a boolean' }, { status: 400 })
    }
    update.completed_at = body.completed ? new Date().toISOString() : null
  }

  if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
    update.sort_order = Math.floor(body.sort_order)
  }

  if ('start_minute' in body) {
    if (body.start_minute === null) {
      update.start_minute = null
    } else if (
      typeof body.start_minute === 'number' &&
      Number.isInteger(body.start_minute) &&
      body.start_minute >= 0 &&
      body.start_minute < 1440
    ) {
      update.start_minute = body.start_minute
    } else {
      return NextResponse.json({ error: 'start_minute must be null or an integer in [0, 1440)' }, { status: 400 })
    }
  }

  if (typeof body.duration_minutes === 'number' && Number.isInteger(body.duration_minutes) && body.duration_minutes > 0) {
    update.duration_minutes = body.duration_minutes
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('plan_items')
    .update(update)
    .eq('id', id)
    .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('plan_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
