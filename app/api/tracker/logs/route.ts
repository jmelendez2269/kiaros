import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'

function computeCyclePhase(
  logDate: string,
  periodStart: string,
  avgCycleLength: number,
  avgPeriodLength: number
): string {
  const log = new Date(logDate)
  const period = new Date(periodStart)
  const diffDays = Math.floor((log.getTime() - period.getTime()) / (1000 * 60 * 60 * 24))
  const dayOfCycle = ((diffDays % avgCycleLength) + avgCycleLength) % avgCycleLength + 1

  if (dayOfCycle <= avgPeriodLength) return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 17) return 'ovulatory'
  return 'luteal'
}

function humanizeLunarPhase(phase: string): string {
  return phase
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (date) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', date)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (from && to) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .gte('log_date', from)
      .lte('log_date', to)
      .order('log_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide ?date= or ?from=&to=' }, { status: 400 })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const body = await req.json()
  const { log_date, values, energy_level, mood_tag, notes } = body

  if (!log_date) {
    return NextResponse.json({ error: 'log_date is required' }, { status: 400 })
  }

  // Fetch profile for cycle and ephemeris lookups
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, plan_year, cycle_enabled, avg_cycle_length, avg_period_length')
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  // Resolve lunar data from ephemeris cache
  let lunar_phase: string | null = null
  let lunar_sign: string | null = null

  const logYear = parseInt(log_date.slice(0, 4), 10)
  const { data: cached } = await supabase
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', profile.id)
    .eq('year', logYear)
    .maybeSingle()

  if (cached?.data) {
    const ephemeris = cached.data as unknown as YearEphemeris
    const day = ephemeris.days.find((d) => d.date === log_date)
    if (day) {
      lunar_phase = humanizeLunarPhase(day.moon.lunarPhase)
      lunar_sign = day.moon.sign
    }
  }

  // Resolve cycle phase from most recent cycle_entries row
  let cycle_phase: string | null = null

  if (profile.cycle_enabled && profile.avg_cycle_length && profile.avg_period_length) {
    const { data: cycleEntry } = await supabase
      .from('cycle_entries')
      .select('period_start')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleEntry) {
      cycle_phase = computeCyclePhase(
        log_date,
        cycleEntry.period_start,
        profile.avg_cycle_length,
        profile.avg_period_length
      )
    }
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        user_id: profile.id,
        log_date,
        values: values ?? {},
        energy_level: energy_level ?? null,
        mood_tag: mood_tag ?? null,
        notes: notes ?? null,
        lunar_phase,
        lunar_sign,
        cycle_phase,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
