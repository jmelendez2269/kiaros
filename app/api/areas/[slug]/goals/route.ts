import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { slugifyAreaName } from '@/lib/areas'

const MAX_TITLE = 200
const MAX_DESCRIPTION = 1000
const MAX_TARGET = 60

async function resolveCategoryId(supabase: Awaited<ReturnType<typeof createServerSupabase>>, slug: string) {
  const { data, error } = await supabase
    .from('goal_categories')
    .select('id, name')
  if (error) return { error: error.message }
  const match = (data ?? []).find((row) => slugifyAreaName(row.name) === slug)
  if (!match) return { error: 'Area not found' }
  return { categoryId: match.id }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const supabase = await createServerSupabase()
  const resolved = await resolveCategoryId(supabase, slug)
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 404 })

  const { data, error } = await supabase
    .from('area_goals')
    .select('id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at')
    .eq('category_id', resolved.categoryId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (title.length > MAX_TITLE) return NextResponse.json({ error: 'Title too long' }, { status: 400 })

  const description = typeof body.description === 'string' ? body.description.trim().slice(0, MAX_DESCRIPTION) : null
  const targetLabel = typeof body.target_label === 'string' ? body.target_label.trim().slice(0, MAX_TARGET) || null : null
  const linkedWeek =
    typeof body.linked_week_number === 'number' && body.linked_week_number >= 1 && body.linked_week_number <= 53
      ? Math.floor(body.linked_week_number)
      : null

  const supabase = await createServerSupabase()
  const resolved = await resolveCategoryId(supabase, slug)
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 404 })

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: maxRow } = await supabase
    .from('area_goals')
    .select('sort_order')
    .eq('category_id', resolved.categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('area_goals')
    .insert({
      user_id: profile.id,
      category_id: resolved.categoryId,
      title,
      description: description || null,
      status: 'active',
      target_label: targetLabel,
      linked_week_number: linkedWeek,
      sort_order: nextSort,
    })
    .select('id, title, description, status, target_label, linked_week_number, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data }, { status: 201 })
}
