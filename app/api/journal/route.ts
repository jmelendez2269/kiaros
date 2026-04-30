import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildJournalAspectInserts,
  buildJournalSkyInsert,
  buildJournalTransitContext,
  computeCyclePhase,
  findEphemerisDay,
  getPatternRefreshTargets,
  humanizeLunarPhase,
} from '@/lib/journal/intelligence'
import { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'

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
      .select('id, cycle_enabled, avg_cycle_length, avg_period_length')
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const entryYear = Number(body.entry_date.slice(0, 4))
    const { data: cachedEphemeris } = await supabase
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', profile.id)
      .eq('year', entryYear)
      .maybeSingle()

    const ephemeris = (cachedEphemeris?.data as unknown as YearEphemeris | null) ?? null
    const ephemerisDay = findEphemerisDay(ephemeris, body.entry_date)
    const transitContext = buildJournalTransitContext(body.transit_context ?? null, ephemerisDay)

    let cyclePhase: string | null = null
    if (profile.cycle_enabled && profile.avg_cycle_length && profile.avg_period_length) {
      const { data: cycleEntry } = await supabase
        .from('cycle_entries')
        .select('period_start')
        .lte('period_start', body.entry_date)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cycleEntry) {
        cyclePhase = computeCyclePhase(
          body.entry_date,
          cycleEntry.period_start,
          profile.avg_cycle_length,
          profile.avg_period_length
        )
      }
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
        lunar_phase: ephemerisDay ? humanizeLunarPhase(ephemerisDay.moon.lunarPhase) : null,
        lunar_sign: ephemerisDay?.moon.sign ?? null,
        cycle_phase: cyclePhase,
        transit_context: transitContext,
      })
      .select('id, title, body, entry_date, is_ritual, created_at, oracle_memory, lunar_phase, lunar_sign, transit_context')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (ephemerisDay) {
      const skyInsert = buildJournalSkyInsert({
        userId: profile.id,
        journalEntryId: data.id,
        entryDate: body.entry_date,
        day: ephemerisDay,
      })

      const { error: skyError } = await supabase
        .from('journal_entry_sky')
        .upsert(skyInsert, { onConflict: 'journal_entry_id' })

      if (skyError) {
        console.error('[journal] Failed to persist sky metadata:', skyError)
      }

      const aspectInserts = buildJournalAspectInserts({
        userId: profile.id,
        journalEntryId: data.id,
        entryDate: body.entry_date,
        day: ephemerisDay,
      })

      if (aspectInserts.length > 0) {
        const { error: aspectError } = await supabase
          .from('journal_entry_aspects')
          .upsert(aspectInserts, { onConflict: 'journal_entry_id,aspect_key' })

        if (aspectError) {
          console.error('[journal] Failed to persist aspect metadata:', aspectError)
        }
      }

      await Promise.all(
        getPatternRefreshTargets(ephemerisDay).map((target) =>
          supabase.rpc('refresh_user_pattern_insight', {
            p_user_id: profile.id,
            p_pattern_type: target.patternType,
            p_pattern_key: target.patternKey,
            p_last_entry_id: data.id,
          })
        )
      ).catch((patternError) => {
        console.error('[journal] Failed to refresh pattern insights:', patternError)
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid journal entry' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
