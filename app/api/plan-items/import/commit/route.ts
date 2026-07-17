import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

const MAX_TITLE = 200
const MAX_ITEMS = 120
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
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

  const startDate = typeof body.startDate === 'string' ? body.startDate : ''
  if (!DATE_RE.test(startDate)) {
    return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 })
  }

  const rawItems = Array.isArray(body.items) ? body.items : null
  if (!rawItems || rawItems.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 })
  }
  if (rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Too many items (max ${MAX_ITEMS})` }, { status: 400 })
  }

  const items: { dayOffset: number; title: string }[] = []
  for (const raw of rawItems) {
    const dayOffset = typeof raw?.dayOffset === 'number' ? Math.floor(raw.dayOffset) : NaN
    const title = typeof raw?.title === 'string' ? raw.title.trim() : ''
    if (!Number.isFinite(dayOffset) || dayOffset < 0 || dayOffset > 365) {
      return NextResponse.json({ error: 'Each item needs a valid dayOffset' }, { status: 400 })
    }
    if (!title || title.length > MAX_TITLE) {
      return NextResponse.json({ error: 'Each item needs a title (max 200 chars)' }, { status: 400 })
    }
    items.push({ dayOffset, title })
  }

  const supabase = await createServerSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const dates = Array.from(new Set(items.map((item) => addDays(startDate, item.dayOffset))))
  const { data: existingMax } = await supabase
    .from('plan_items')
    .select('item_date, sort_order')
    .in('item_date', dates)
    .order('sort_order', { ascending: false })

  const maxSortByDate = new Map<string, number>()
  for (const row of existingMax ?? []) {
    if (!maxSortByDate.has(row.item_date)) maxSortByDate.set(row.item_date, row.sort_order)
  }

  const rows = items.map((item) => {
    const item_date = addDays(startDate, item.dayOffset)
    const nextSort = (maxSortByDate.get(item_date) ?? -1) + 1
    maxSortByDate.set(item_date, nextSort)
    return {
      user_id: profile.id,
      item_date,
      title: item.title,
      sort_order: nextSort,
    }
  })

  const { data, error } = await supabase.from('plan_items').insert(rows).select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 })
}
