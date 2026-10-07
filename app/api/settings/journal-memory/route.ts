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
  STRICT_CHOOSE_EACH_DEFAULTS,
  USE_ENTRIES_PRESET_DEFAULTS,
  type JournalMemoryMode,
  type JournalMemorySettings,
} from '@/lib/journal/memory-defaults'
import { applyPastEntriesConsentBulk } from '@/lib/journal/past-entries-consent'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

const patchSchema = z.object({
  journal_memory_mode: z.enum(['use_entries', 'choose_each']).nullable().optional(),
  default_include_in_insights: z.boolean().optional(),
  default_include_in_stelloquy: z.boolean().optional(),
  include_past_entries: z.boolean().optional(),
})

async function runPastEntriesBulk(params: {
  admin: ReturnType<typeof createAdminSupabase>
  userProfileId: string
  settings: JournalMemorySettings
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
    console.error('[settings/journal-memory] Past entries bulk consent failed:', error)
    return NextResponse.json(
      { error: journalMemoryCopy.errors.couldNotIncludePastEntries },
      { status: 500 },
    )
  }
  return null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isMemoryDefaultsEnabled() || !isJournalConsentV2Enabled()) {
      return NextResponse.json({ enabled: false })
    }

    const accessError = await requireActivePlannerAccess(userId)
    if (accessError) return accessError

    const supabase = await createServerSupabase()
    const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: journalMemoryCopy.errors.profileNotFound }, { status: 404 })
    }

    const settings = await loadJournalMemorySettings(supabase, profile.id)
    const { data: entitlements } = await supabase
      .from('product_entitlements')
      .select('*')
      .eq('user_id', profile.id)
    const hasOracleAccess = await memberHasOracleAccess(
      profile.id,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )

    return NextResponse.json({
      enabled: true,
      settings,
      hasOracleAccess,
    })
  } catch (error) {
    console.error('[settings/journal-memory] GET failed:', error)
    return NextResponse.json(
      { error: journalMemoryCopy.errors.couldNotLoadSettings },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isMemoryDefaultsEnabled() || !isJournalConsentV2Enabled()) {
      return NextResponse.json({ error: journalMemoryCopy.errors.notAvailable }, { status: 404 })
    }

    const accessError = await requireActivePlannerAccess(userId)
    if (accessError) return accessError

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: journalMemoryCopy.errors.invalidRequest },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabase()
    const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: journalMemoryCopy.errors.profileNotFound }, { status: 404 })
    }

    const { data: entitlements } = await supabase
      .from('product_entitlements')
      .select('*')
      .eq('user_id', profile.id)

    const existing = await loadJournalMemorySettings(supabase, profile.id)
    const hasOracleAccess = await memberHasOracleAccess(
      profile.id,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )

    let mode: JournalMemoryMode | null = existing.journal_memory_mode
    if (parsed.data.journal_memory_mode !== undefined) {
      mode = parsed.data.journal_memory_mode
    }

    let defaultInsights = existing.default_include_in_insights
    let defaultStelloquy = existing.default_include_in_stelloquy

    if (mode === 'use_entries' && parsed.data.journal_memory_mode === 'use_entries') {
      defaultInsights =
        parsed.data.default_include_in_insights ?? USE_ENTRIES_PRESET_DEFAULTS.default_include_in_insights
      defaultStelloquy =
        parsed.data.default_include_in_stelloquy ?? USE_ENTRIES_PRESET_DEFAULTS.default_include_in_stelloquy
    } else if (mode === 'choose_each' && parsed.data.journal_memory_mode === 'choose_each') {
      defaultInsights = STRICT_CHOOSE_EACH_DEFAULTS.default_include_in_insights
      defaultStelloquy = STRICT_CHOOSE_EACH_DEFAULTS.default_include_in_stelloquy
    } else {
      if (parsed.data.default_include_in_insights !== undefined) {
        defaultInsights = parsed.data.default_include_in_insights
      }
      if (parsed.data.default_include_in_stelloquy !== undefined) {
        defaultStelloquy = parsed.data.default_include_in_stelloquy
      }
    }

    const admin = createAdminSupabase()
    const now = new Date().toISOString()
    const upsertPayload = {
      user_id: profile.id,
      journal_memory_mode: mode,
      default_include_in_insights: defaultInsights,
      default_include_in_stelloquy: defaultStelloquy,
      updated_at: now,
    }

    const { error: upsertError } = await admin.from('user_settings').upsert(upsertPayload, {
      onConflict: 'user_id',
    })
    if (upsertError) {
      return NextResponse.json({ error: journalMemoryCopy.errors.couldNotSaveSettings }, { status: 500 })
    }

    if (parsed.data.journal_memory_mode !== undefined && mode !== null) {
      const { error: auditError } = await admin.from('journal_entry_consent_audit').insert({
        journal_entry_id: null,
        user_id: profile.id,
        event_type: 'account_default_applied',
        previous_include_in_insights: null,
        previous_include_in_stelloquy: null,
        previous_memory_pinned: null,
        previous_memory_importance: null,
        current_include_in_insights: defaultInsights ?? false,
        current_include_in_stelloquy: defaultStelloquy ?? false,
        current_memory_pinned: false,
        current_memory_importance: null,
        change_source: 'account_default_applied',
      })
      if (auditError) throw auditError
    }

    const updatedSettings = await loadJournalMemorySettings(supabase, profile.id)

    if (parsed.data.include_past_entries) {
      if (updatedSettings.past_entries_included_at) {
        return NextResponse.json(
          { error: journalMemoryCopy.errors.pastEntriesAlreadyIncluded },
          { status: 400 },
        )
      }
      if (effectiveMode(updatedSettings) !== 'use_entries') {
        return NextResponse.json(
          { error: journalMemoryCopy.errors.pastEntriesNotAvailable },
          { status: 400 },
        )
      }

      const bulkError = await runPastEntriesBulk({
        admin,
        userProfileId: profile.id,
        settings: updatedSettings,
        hasOracleAccess,
        now,
      })
      if (bulkError) return bulkError
      updatedSettings.past_entries_included_at = now
    }

    return NextResponse.json({
      settings: updatedSettings,
      hasOracleAccess,
    })
  } catch (error) {
    console.error('[settings/journal-memory] PATCH failed:', error)
    return NextResponse.json({ error: journalMemoryCopy.errors.couldNotSaveSettings }, { status: 500 })
  }
}

function effectiveMode(settings: { journal_memory_mode: JournalMemoryMode | null }) {
  return settings.journal_memory_mode ?? 'choose_each'
}
