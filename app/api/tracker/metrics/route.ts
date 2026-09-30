import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('tracker_metrics')
    .select('*, goal_categories(id, name, color_key, icon_key)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const body = await req.json()
  const { label, data_type, category_id, config, key: rawKey } = body

  if (!label || !data_type) {
    return NextResponse.json({ error: 'label and data_type are required' }, { status: 400 })
  }

  // Auto-generate key from label if not supplied
  const key =
    rawKey ??
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

  // Get user profile id (needed for insert since RLS resolves the user)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  // Sort order = MAX within this category + 1
  const { data: existing } = await supabase
    .from('tracker_metrics')
    .select('sort_order')
    .eq('user_id', profile.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('tracker_metrics')
    .insert({
      user_id: profile.id,
      label,
      key,
      data_type,
      category_id: category_id ?? null,
      config: config ?? null,
      sort_order,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
