'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import {
  buildJournalAspectInserts,
  buildJournalSkyInsert,
  buildJournalTransitContext,
  computeCyclePhase,
  findEphemerisDay,
  getPatternRefreshTargets,
  humanizeLunarPhase,
} from '@/lib/journal/intelligence'
import { resyncPatternSynthesisForTargets } from '@/lib/ai/journal-insight-synthesis'
import { createServerSupabase } from '@/lib/supabase/server'
import type { YearEphemeris } from '@/types/blueprint'

const MIN_BODY_LEN = 1
const MAX_BODY_LEN = 4000
const MAX_TAGS = 6
const MAX_TAG_LEN = 32

export type SaveLineResult =
  | { ok: true; entryId: string }
  | { ok: false; error: string }

/**
 * Server action for Today's quick-line composer. Mirrors POST /api/journal
 * (sky context, aspect inserts, pattern refresh) but tailored for the
 * single-paragraph "line for today" entry — no ritual flag, no oracle
 * memory toggle. Phase 4's journal rebuild can converge these onto a
 * single shared helper.
 */
export async function saveLineForToday(
  rawBody: string,
  tags: string[],
): Promise<SaveLineResult> {
  const body = rawBody.trim()
  if (body.length < MIN_BODY_LEN) return { ok: false, error: 'Write at least a sentence.' }
  if (body.length > MAX_BODY_LEN) return { ok: false, error: 'That line is longer than the daily composer supports.' }

  const normalizedTags = Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= MAX_TAG_LEN),
    ),
  ).slice(0, MAX_TAGS)

  const supabase = await createServerSupabase()
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, cycle_enabled, avg_cycle_length, avg_period_length')
    .maybeSingle()

  if (profileError || !profile) {
    return { ok: false, error: 'Could not load your profile.' }
  }

  const entryDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const year = Number.parseInt(entryDate.slice(0, 4), 10)
  const { data: cached } = await supabase
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', profile.id)
    .eq('year', year)
    .maybeSingle()

  const ephemeris = (cached?.data as unknown as YearEphemeris | null) ?? null
  const ephemerisDay = findEphemerisDay(ephemeris, entryDate)
  const transitContext = buildJournalTransitContext(
    normalizedTags.length > 0 ? { context: `tags: ${normalizedTags.join(', ')}` } : null,
    ephemerisDay,
  )

  let cyclePhase: string | null = null
  if (profile.cycle_enabled && profile.avg_cycle_length && profile.avg_period_length) {
    const { data: cycleEntry } = await supabase
      .from('cycle_entries')
      .select('period_start')
      .lte('period_start', entryDate)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleEntry) {
      cyclePhase = computeCyclePhase(
        entryDate,
        cycleEntry.period_start,
        profile.avg_cycle_length,
        profile.avg_period_length,
      )
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('journal_entries')
    .insert({
      user_id: profile.id,
      title: null,
      body,
      entry_date: entryDate,
      is_ritual: false,
      oracle_memory: false,
      lunar_phase: ephemerisDay ? humanizeLunarPhase(ephemerisDay.moon.lunarPhase) : null,
      lunar_sign: ephemerisDay?.moon.sign ?? null,
      cycle_phase: cyclePhase,
      transit_context: transitContext,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? 'Could not save that line.' }
  }

  if (ephemerisDay) {
    const skyInsert = buildJournalSkyInsert({
      userId: profile.id,
      journalEntryId: inserted.id,
      entryDate,
      day: ephemerisDay,
    })

    const { error: skyError } = await supabase
      .from('journal_entry_sky')
      .upsert(skyInsert, { onConflict: 'journal_entry_id' })
    if (skyError) console.error('[today/save-line] sky upsert failed:', skyError)

    const aspectInserts = buildJournalAspectInserts({
      userId: profile.id,
      journalEntryId: inserted.id,
      entryDate,
      day: ephemerisDay,
    })
    if (aspectInserts.length > 0) {
      const { error: aspectError } = await supabase
        .from('journal_entry_aspects')
        .upsert(aspectInserts, { onConflict: 'journal_entry_id,aspect_key' })
      if (aspectError) console.error('[today/save-line] aspect upsert failed:', aspectError)
    }

    const refreshTargets = getPatternRefreshTargets(ephemerisDay)

    await Promise.all(
      refreshTargets.map((target) =>
        supabase.rpc('refresh_user_pattern_insight', {
          p_user_id: profile.id,
          p_pattern_type: target.patternType,
          p_pattern_key: target.patternKey,
          p_last_entry_id: inserted.id,
        }),
      ),
    ).catch((patternError) => {
      console.error('[today/save-line] pattern refresh failed:', patternError)
    })

    after(() =>
      resyncPatternSynthesisForTargets({ userProfileId: profile.id, targets: refreshTargets }).catch(
        (err) => console.error('[today/save-line] AI pattern resync failed:', err),
      ),
    )
  }

  revalidatePath('/today')
  return { ok: true, entryId: inserted.id }
}
