import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

const MAX_TITLE = 200
const MAX_DESCRIPTION = 1000
const MAX_TARGET = 60
const STATUSES = new Set(['active', 'paused', 'completed', 'archived'])

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

  if ('description' in body) {
    update.description =
      typeof body.description === 'string' && body.description.trim().length > 0
        ? body.description.trim().slice(0, MAX_DESCRIPTION)
        : null
  }

  if (typeof body.status === 'string') {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  if ('target_label' in body) {
    update.target_label =
      typeof body.target_label === 'string' && body.target_label.trim().length > 0
        ? body.target_label.trim().slice(0, MAX_TARGET)
        : null
  }

  if ('linked_week_number' in body) {
    if (body.linked_week_number === null) {
      update.linked_week_number = null
    } else if (
      typeof body.linked_week_number === 'number' &&
      body.linked_week_number >= 1 &&
      body.linked_week_number <= 53
    ) {
      update.linked_week_number = Math.floor(body.linked_week_number)
    } else {
      return NextResponse.json({ error: 'Invalid linked_week_number' }, { status: 400 })
    }
  }

  if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
    update.sort_order = Math.floor(body.sort_order)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('area_goals')
    .update(update)
    .eq('id', id)
    .select('id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('area_goals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
