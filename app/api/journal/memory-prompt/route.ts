import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { memberHasOracleAccess } from '@/lib/commerce/member-oracle-access'
import type { ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { journalMemoryCopy } from '@/lib/copy/journal-memory'
import { isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'
import { loadJournalMemorySettings } from '@/lib/journal/load-memory-settings'
import {
  effectiveJournalMemoryMode,
  STRICT_CHOOSE_EACH_DEFAULTS,
  USE_ENTRIES_PRESET_DEFAULTS,
} from '@/lib/journal/memory-defaults'
import { applyPastEntriesConsentBulk } from '@/lib/journal/past-entries-consent'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

const bodySchema = z.object({
  action: z.enum(['dismiss', 'choose']),
  journal_memory_mode: z.enum(['use_entries', 'choose_each']).optional(),
  include_past_entries: z.boolean().optional(),
})

async function runPastEntriesBulk(params: {
  admin: ReturnType<typeof createAdminSupabase>
  userProfileId: string
  settings: Awaited<ReturnType<typeof loadJournalMemorySettings>>
  hasOracleAccess: boolean
  now: string
}) {
  const { admin, userProfileId, settings, hasOracleAccess, now } = params
  try {
    await applyPastEntriesConsentBulk({
      admin,
      userProfileId,
      settings,
      hasOracleAccess,
    })
    const { error: pastStampError } = await admin.from('user_settings').upsert(
      { user_id: userProfileId, past_entries_included_at: now, updated_at: now },
      { onConflict: 'user_id' },
    )
    if (pastStampError) throw pastStampError
  } catch (error) {
    console.error('[journal/memory-prompt] Past entries bulk consent failed:', error)
    return NextResponse.json(
      { error: journalMemoryCopy.errors.couldNotIncludePastEntries },
      { status: 500 },
    )
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isMemoryDefaultsEnabled() || !isJournalConsentV2Enabled()) {
      return NextResponse.json({ error: journalMemoryCopy.errors.notAvailable }, { status: 404 })
    }

    const accessError = await requireActivePlannerAccess(userId)
    if (accessError) return accessError

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: journalMemoryCopy.errors.invalidRequest }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: journalMemoryCopy.errors.profileNotFound }, { status: 404 })
    }

    const admin = createAdminSupabase()
    const now = new Date().toISOString()

    const { data: entitlements } = await supabase
      .from('product_entitlements')
      .select('*')
      .eq('user_id', profile.id)
    const hasOracleAccess = await memberHasOracleAccess(
      profile.id,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )

    const existingSettings = await loadJournalMemorySettings(supabase, profile.id)

    if (parsed.data.action === 'dismiss') {
      const { error: dismissError } = await admin.from('user_settings').upsert(
        {
          user_id: profile.id,
          memory_mode_prompted_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id' },
      )
      if (dismissError) throw dismissError
      return NextResponse.json({ ok: true })
    }

    const mode = parsed.data.journal_memory_mode
    if (!mode) {
      return NextResponse.json({ error: journalMemoryCopy.errors.memoryModeRequired }, { status: 400 })
    }

    if (parsed.data.include_past_entries && existingSettings.past_entries_included_at) {
      return NextResponse.json(
        { error: journalMemoryCopy.errors.pastEntriesAlreadyIncluded },
        { status: 400 },
      )
    }

    const defaults =
      mode === 'use_entries' ? USE_ENTRIES_PRESET_DEFAULTS : STRICT_CHOOSE_EACH_DEFAULTS

    const { error: settingsError } = await admin.from('user_settings').upsert(
      {
        user_id: profile.id,
        journal_memory_mode: mode,
        default_include_in_insights: defaults.default_include_in_insights,
        default_include_in_stelloquy: defaults.default_include_in_stelloquy,
        memory_mode_prompted_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    if (settingsError) throw settingsError

    const { error: auditError } = await admin.from('journal_entry_consent_audit').insert({
      journal_entry_id: null,
      user_id: profile.id,
      event_type: 'account_default_applied',
      previous_include_in_insights: null,
      previous_include_in_stelloquy: null,
      previous_memory_pinned: null,
      previous_memory_importance: null,
      current_include_in_insights: defaults.default_include_in_insights,
      current_include_in_stelloquy: defaults.default_include_in_stelloquy,
      current_memory_pinned: false,
      current_memory_importance: null,
      change_source: 'account_default_applied',
    })
    if (auditError) throw auditError

    const settings = await loadJournalMemorySettings(supabase, profile.id)

    if (mode === 'use_entries' && parsed.data.include_past_entries) {
      if (effectiveJournalMemoryMode(settings.journal_memory_mode) !== 'use_entries') {
        return NextResponse.json(
          { error: journalMemoryCopy.errors.pastEntriesNotAvailable },
          { status: 400 },
        )
      }

      const bulkError = await runPastEntriesBulk({
        admin,
        userProfileId: profile.id,
        settings,
        hasOracleAccess,
        now,
      })
      if (bulkError) return bulkError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[journal/memory-prompt] Request failed:', error)
    return NextResponse.json({ error: journalMemoryCopy.errors.couldNotSaveChoice }, { status: 500 })
  }
}
