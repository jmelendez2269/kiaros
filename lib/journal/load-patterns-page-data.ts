import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import {
  resolveUserAccess,
  loadOrderSubscriptionMap,
  extractStripeOrderIds,
  type ProductEntitlementRecord,
} from '@/lib/commerce/entitlements'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { parseEvidence, type PatternRow } from '@/components/insights/PatternInsights'
import type { RecentJournalEntry } from '@/components/insights/JournalHistoryList'
import type { OracleCaptureRow } from '@/components/insights/CaptureHistoryList'
import { DEFAULT_VOICE_KEY, VOICE_PRESETS } from '@/lib/ai/journal-insight-synthesis'
import { isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'

export type PatternsPageData = {
  isAppAdmin: boolean
  hasOracleAccess: boolean
  consentV2Enabled: boolean
  memoryDefaultsEnabled: boolean
  patterns: PatternRow[]
  journalEntriesCount: number
  includedEntriesCount: number
  recentEntries: RecentJournalEntry[]
  oracleCaptures: OracleCaptureRow[]
  showEmptyState: boolean
  bodyByEntryId: Map<string, string>
  inFlightCount: number
  savedVoiceLabel: string
}

export async function loadPatternsPageData(): Promise<PatternsPageData> {
  const supabase = await createServerSupabase()
  const consentV2Enabled = isJournalConsentV2Enabled()
  const memoryDefaultsEnabled = isMemoryDefaultsEnabled() && consentV2Enabled

  const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()

  const { data: entitlements } = profile?.id
    ? await supabase
        .from('product_entitlements')
        .select(
          'id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan',
        )
        .eq('user_id', profile.id)
        .neq('status', 'revoked')
    : { data: [] }

  const admin = createAdminSupabase()
  const orderIds = extractStripeOrderIds(entitlements ?? [])
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profile?.id })

  const access = resolveUserAccess(
    (entitlements ?? []) as ProductEntitlementRecord[],
    undefined,
    undefined,
    subscriptionMap,
  )

  const clerkUser = await currentUser()
  const isAppAdmin = clerkUser?.publicMetadata?.isAdmin === true
  const hasOracleAccess = isAppAdmin || access.hasOracleAccess

  let includedEntriesCountQuery = supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
  if (consentV2Enabled) {
    includedEntriesCountQuery = includedEntriesCountQuery.eq('include_in_insights', true)
  }

  const [patternsRes, entryCountRes, includedCountRes, settingsRes, entriesRes, oracleCapturesRes] =
    await Promise.all([
      supabase
        .from('user_pattern_insights')
        .select(
          'id, pattern_type, pattern_key, sample_size, confidence, first_seen, last_seen, summary, evidence, updated_at, ai_summary, ai_summary_voice_label, ai_synthesizing_at',
        )
        .order('sample_size', { ascending: false })
        .order('last_seen', { ascending: false }),
      supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
      includedEntriesCountQuery,
      supabase
        .from('user_settings')
        .select('journal_insight_voice, journal_insight_voice_label')
        .maybeSingle(),
      supabase
        .from('journal_entries')
        .select(
          'id, title, body, entry_date, is_ritual, created_at, oracle_memory, include_in_insights, include_in_stelloquy, memory_pinned, memory_importance, lunar_phase, lunar_sign, transit_context',
        )
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('oracle_captures')
        .select(
          'id, captured_text, source_role, include_in_insights, include_in_planner, thread_messages, tradition, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(12),
    ])

  const patterns = (patternsRes.data ?? []) as PatternRow[]
  const settingsRow = settingsRes.data
  const journalEntriesCount = entryCountRes.error ? 0 : entryCountRes.count ?? 0
  const includedEntriesCount = includedCountRes.error ? 0 : includedCountRes.count ?? 0
  const recentEntries = (entriesRes.data ?? []) as RecentJournalEntry[]
  const oracleCaptures = (oracleCapturesRes.data ?? []) as OracleCaptureRow[]

  const showEmptyState = consentV2Enabled && includedEntriesCount === 0

  const evidenceEntryIds = Array.from(
    new Set(patterns.flatMap((p) => parseEvidence(p.evidence).map((e) => e.entry_id))),
  )
  const bodyByEntryId = new Map<string, string>()
  if (evidenceEntryIds.length > 0) {
    const { data: entryBodies } = await supabase
      .from('journal_entries')
      .select('id, body')
      .in('id', evidenceEntryIds)
      .eq('include_in_insights', true)
    for (const row of entryBodies ?? []) {
      const id = row.id as unknown as string | null
      const body = (row.body as unknown as string | null) ?? null
      if (id && body) bodyByEntryId.set(id, body)
    }
  }

  const inFlightCount = patterns.filter((p) => Boolean(p.ai_synthesizing_at)).length
  const savedVoiceLabel = settingsRow?.journal_insight_voice_label ?? VOICE_PRESETS[DEFAULT_VOICE_KEY].label

  return {
    isAppAdmin,
    hasOracleAccess,
    consentV2Enabled,
    memoryDefaultsEnabled,
    patterns,
    journalEntriesCount,
    includedEntriesCount,
    recentEntries,
    oracleCaptures,
    showEmptyState,
    bodyByEntryId,
    inFlightCount,
    savedVoiceLabel,
  }
}
