import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { after } from 'next/server'
import { resyncPatternSynthesisForTargets } from '@/lib/ai/journal-insight-synthesis'
import { isJournalConsentV2Enabled } from '@/lib/feature-flags'
import {
  normalizeJournalConsent,
  type JournalConsentCompatibilityInput,
  type JournalConsentState,
} from '@/lib/journal/consent'
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
import type { Database, Json, Tables, TablesInsert } from '@/types/database'

export type JournalEntrySource = 'journal_api' | 'today_quick_entry'

export type CreateJournalEntryInput = {
  title?: string | null
  body: string
  entryDate: string
  isRitual?: boolean
  transitContext?: Json | null
  consent?: JournalConsentCompatibilityInput
  source: JournalEntrySource
}

export type CreatedJournalEntry = Pick<
  Tables<'journal_entries'>,
  | 'id'
  | 'title'
  | 'body'
  | 'entry_date'
  | 'is_ritual'
  | 'created_at'
  | 'oracle_memory'
  | 'lunar_phase'
  | 'lunar_sign'
  | 'transit_context'
>

export type CreateJournalEntryResult =
  | { success: true; data: CreatedJournalEntry }
  | {
      success: false
      code: 'profile_not_found' | 'profile_read_failed' | 'entry_write_failed'
      error: string
    }

type JournalEntryV2Insert = TablesInsert<'journal_entries'> & JournalConsentState

function failure(
  code: Extract<CreateJournalEntryResult, { success: false }>['code'],
  error: string,
): CreateJournalEntryResult {
  return { success: false, code, error }
}

/**
 * The single server-only boundary for journal creation. Authorization remains
 * at each caller because the journal API and authenticated Today action have
 * different access and error contracts.
 */
export async function createJournalEntry(
  input: CreateJournalEntryInput,
): Promise<CreateJournalEntryResult> {
  const consent = normalizeJournalConsent(
    input.consent ?? {},
    isJournalConsentV2Enabled(),
  )
  const supabase: SupabaseClient<Database> = await createServerSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, cycle_enabled, avg_cycle_length, avg_period_length')
    .maybeSingle()

  if (profileError) return failure('profile_read_failed', profileError.message)
  if (!profile) return failure('profile_not_found', 'User profile not found')

  const entryYear = Number(input.entryDate.slice(0, 4))
  const { data: cachedEphemeris } = await supabase
    .from('ephemeris_cache')
    .select('data')
    .eq('user_id', profile.id)
    .eq('year', entryYear)
    .maybeSingle()

  const ephemeris = (cachedEphemeris?.data as unknown as YearEphemeris | null) ?? null
  const ephemerisDay = findEphemerisDay(ephemeris, input.entryDate)
  const transitContext = buildJournalTransitContext(input.transitContext ?? null, ephemerisDay)

  let cyclePhase: string | null = null
  if (profile.cycle_enabled && profile.avg_cycle_length && profile.avg_period_length) {
    const { data: cycleEntry } = await supabase
      .from('cycle_entries')
      .select('period_start')
      .lte('period_start', input.entryDate)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cycleEntry) {
      cyclePhase = computeCyclePhase(
        input.entryDate,
        cycleEntry.period_start,
        profile.avg_cycle_length,
        profile.avg_period_length,
      )
    }
  }

  const baseInsert: TablesInsert<'journal_entries'> = {
    user_id: profile.id,
    title: input.title?.trim() || null,
    body: input.body,
    entry_date: input.entryDate,
    is_ritual: input.isRitual ?? false,
    oracle_memory: consent.oracleMemory,
    lunar_phase: ephemerisDay ? humanizeLunarPhase(ephemerisDay.moon.lunarPhase) : null,
    lunar_sign: ephemerisDay?.moon.sign ?? null,
    cycle_phase: cyclePhase,
    transit_context: transitContext,
  }

  const entryInsert: TablesInsert<'journal_entries'> | JournalEntryV2Insert = consent.persistV2Fields
    ? { ...baseInsert, ...consent.state }
    : baseInsert

  const { data, error } = await supabase
    .from('journal_entries')
    .insert(entryInsert)
    .select(
      'id, title, body, entry_date, is_ritual, created_at, oracle_memory, lunar_phase, lunar_sign, transit_context',
    )
    .single()

  if (error || !data) {
    return failure('entry_write_failed', error?.message ?? 'Failed to save journal entry')
  }

  if (ephemerisDay) {
    const skyInsert = buildJournalSkyInsert({
      userId: profile.id,
      journalEntryId: data.id,
      entryDate: input.entryDate,
      day: ephemerisDay,
    })

    const { error: skyError } = await supabase
      .from('journal_entry_sky')
      .upsert(skyInsert, { onConflict: 'journal_entry_id' })

    if (skyError) {
      console.error(`[journal/create:${input.source}] Failed to persist sky metadata:`, skyError)
    }

    const aspectInserts = buildJournalAspectInserts({
      userId: profile.id,
      journalEntryId: data.id,
      entryDate: input.entryDate,
      day: ephemerisDay,
    })

    if (aspectInserts.length > 0) {
      const { error: aspectError } = await supabase
        .from('journal_entry_aspects')
        .upsert(aspectInserts, { onConflict: 'journal_entry_id,aspect_key' })

      if (aspectError) {
        console.error(`[journal/create:${input.source}] Failed to persist aspect metadata:`, aspectError)
      }
    }

    // CONSENT-03 will gate and rebuild derived patterns. CONSENT-01 preserves
    // the existing refresh behavior while the v2 flag defaults off.
    const refreshTargets = getPatternRefreshTargets(ephemerisDay)

    await Promise.all(
      refreshTargets.map((target) =>
        supabase.rpc('refresh_user_pattern_insight', {
          p_user_id: profile.id,
          p_pattern_type: target.patternType,
          p_pattern_key: target.patternKey,
          p_last_entry_id: data.id,
        }),
      ),
    ).catch((patternError: unknown) => {
      console.error(`[journal/create:${input.source}] Failed to refresh pattern insights:`, patternError)
    })

    after(() =>
      resyncPatternSynthesisForTargets({ userProfileId: profile.id, targets: refreshTargets }).catch(
        (error: unknown) =>
          console.error(
            `[journal/create:${input.source}] Failed to resync AI pattern synthesis:`,
            error,
          ),
      ),
    )
  }

  return { success: true, data }
}
