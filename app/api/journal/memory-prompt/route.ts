import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import {
  loadOrderSubscriptionMap,
  extractStripeOrderIds,
  resolveUserAccess,
  type ProductEntitlementRecord,
} from '@/lib/commerce/entitlements'
import { isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'
import { loadJournalMemorySettings } from '@/lib/journal/load-memory-settings'
import {
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

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isMemoryDefaultsEnabled() || !isJournalConsentV2Enabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }

  const supabase = await createServerSupabase()
  const { data: profile } = await supabase.from('user_profiles').select('id').maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const admin = createAdminSupabase()
  const now = new Date().toISOString()

  const { data: entitlements } = await supabase
    .from('product_entitlements')
    .select('*')
    .eq('user_id', profile.id)
  const orderIds = extractStripeOrderIds((entitlements ?? []) as ProductEntitlementRecord[])
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profile.id })
  const access = resolveUserAccess(
    (entitlements ?? []) as ProductEntitlementRecord[],
    new Date().toISOString().slice(0, 10),
    undefined,
    subscriptionMap,
  )

  if (parsed.data.action === 'dismiss') {
    await admin.from('user_settings').upsert(
      {
        user_id: profile.id,
        memory_mode_prompted_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    return NextResponse.json({ ok: true })
  }

  const mode = parsed.data.journal_memory_mode
  if (!mode) {
    return NextResponse.json({ error: 'journal_memory_mode is required' }, { status: 400 })
  }

  const defaults =
    mode === 'use_entries' ? USE_ENTRIES_PRESET_DEFAULTS : STRICT_CHOOSE_EACH_DEFAULTS

  await admin.from('user_settings').upsert(
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

  await admin.from('journal_entry_consent_audit').insert({
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

  const settings = await loadJournalMemorySettings(supabase, profile.id)

  if (mode === 'use_entries' && parsed.data.include_past_entries) {
    await applyPastEntriesConsentBulk({
      admin,
      userProfileId: profile.id,
      settings,
      hasOracleAccess: access.hasOracleAccess,
    })
    await admin
      .from('user_settings')
      .upsert(
        { user_id: profile.id, past_entries_included_at: now, updated_at: now },
        { onConflict: 'user_id' },
      )
  }

  return NextResponse.json({ ok: true })
}
