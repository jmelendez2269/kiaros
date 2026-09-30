import 'server-only'

import { resyncPatternSynthesisForTargets } from '@/lib/ai/journal-insight-synthesis'
import type { PatternRefreshTarget } from '@/lib/journal/intelligence'
import { createAdminSupabase } from '@/lib/supabase/admin'

const ENTRY_BATCH_SIZE = 200

function targetKey(target: PatternRefreshTarget) {
  return `${target.patternType}:${target.patternKey}`
}

function addTarget(
  targets: Map<string, PatternRefreshTarget>,
  patternType: PatternRefreshTarget['patternType'],
  patternKey: string | null,
) {
  if (!patternKey) return
  const target = { patternType, patternKey }
  targets.set(targetKey(target), target)
}

/**
 * Removes derived content that could contain now-revoked journal evidence.
 * User-edited monthly text and authored quarterly-review fields are preserved.
 */
export async function invalidateJournalDerivedContent(userProfileId: string): Promise<void> {
  const admin = createAdminSupabase()
  const [patternsResult, briefsResult, reviewsResult] = await Promise.all([
    admin.from('user_pattern_insights').delete().eq('user_id', userProfileId),
    admin
      .from('month_briefs')
      .delete()
      .eq('user_id', userProfileId)
      .is('edited_at', null),
    admin
      .from('quarterly_reviews')
      .update({ ai_summary: null })
      .eq('user_id', userProfileId),
  ])

  const error = patternsResult.error ?? briefsResult.error ?? reviewsResult.error
  if (error) throw new Error('Failed to invalidate journal-derived content')
}

/**
 * Recreates deterministic patterns and AI summaries solely from entries that
 * explicitly allow Insights use. Migration 0040 makes the RPC enforce the
 * same boundary at the database layer.
 */
export async function rebuildJournalDerivedContent(userProfileId: string): Promise<void> {
  const admin = createAdminSupabase()
  const { data: entries, error: entriesError } = await admin
    .from('journal_entries')
    .select('id')
    .eq('user_id', userProfileId)
    .eq('include_in_insights', true)

  if (entriesError) throw new Error('Failed to load consented journal entries')

  const entryIds = (entries ?? []).map((entry) => entry.id)
  if (entryIds.length === 0) return

  const targets = new Map<string, PatternRefreshTarget>()

  for (let offset = 0; offset < entryIds.length; offset += ENTRY_BATCH_SIZE) {
    const batch = entryIds.slice(offset, offset + ENTRY_BATCH_SIZE)
    const [aspectsResult, skyResult] = await Promise.all([
      admin
        .from('journal_entry_aspects')
        .select('aspect_key')
        .eq('user_id', userProfileId)
        .in('journal_entry_id', batch),
      admin
        .from('journal_entry_sky')
        .select('moon_phase, moon_sign, retrogrades')
        .eq('user_id', userProfileId)
        .in('journal_entry_id', batch),
    ])

    if (aspectsResult.error || skyResult.error) {
      throw new Error('Failed to load consented journal pattern metadata')
    }

    for (const aspect of aspectsResult.data ?? []) {
      addTarget(targets, 'aspect', aspect.aspect_key)
    }
    for (const sky of skyResult.data ?? []) {
      addTarget(targets, 'lunar_phase', sky.moon_phase)
      addTarget(targets, 'lunar_sign', sky.moon_sign)
      for (const retrograde of sky.retrogrades ?? []) {
        addTarget(targets, 'retrograde', retrograde)
      }
    }
  }

  const targetList = Array.from(targets.values())
  await Promise.all(
    targetList.map((target) =>
      admin.rpc('refresh_user_pattern_insight', {
        p_user_id: userProfileId,
        p_pattern_type: target.patternType,
        p_pattern_key: target.patternKey,
      }),
    ),
  )

  await resyncPatternSynthesisForTargets({
    userProfileId,
    targets: targetList,
  })
}
