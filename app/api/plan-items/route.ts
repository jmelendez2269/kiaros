import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

const MAX_TITLE = 200
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('plan_items')
    .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
    .gte('item_date', from)
    .lte('item_date', to)
    .order('item_date', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (title.length > MAX_TITLE) return NextResponse.json({ error: 'Title too long' }, { status: 400 })

  const itemDate = typeof body.item_date === 'string' ? body.item_date : ''
  if (!DATE_RE.test(itemDate)) {
    return NextResponse.json({ error: 'item_date must be YYYY-MM-DD' }, { status: 400 })
  }

  let startMinute: number | null = null
  if ('start_minute' in body && body.start_minute !== null) {
    if (
      typeof body.start_minute !== 'number' ||
      !Number.isInteger(body.start_minute) ||
      body.start_minute < 0 ||
      body.start_minute >= 1440
    ) {
      return NextResponse.json({ error: 'start_minute must be null or an integer in [0, 1440)' }, { status: 400 })
    }
    startMinute = body.start_minute
  }

  const durationMinutes =
    typeof body.duration_minutes === 'number' && Number.isInteger(body.duration_minutes) && body.duration_minutes > 0
      ? body.duration_minutes
      : 30

  const areaGoalId = typeof body.area_goal_id === 'string' ? body.area_goal_id : null

  const source = ['manual', 'import', 'ai-placed', 'goal'].includes(body.source) ? body.source : 'manual'

  const supabase = await createServerSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: maxRow } = await supabase
    .from('plan_items')
    .select('sort_order')
    .eq('item_date', itemDate)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSort = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      user_id: profile.id,
      item_date: itemDate,
      title,
      sort_order: nextSort,
      start_minute: startMinute,
      duration_minutes: durationMinutes,
      area_goal_id: areaGoalId,
      source,
    })
    .select('id, item_date, title, sort_order, completed_at, created_at, updated_at, start_minute, duration_minutes, area_goal_id, source')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
