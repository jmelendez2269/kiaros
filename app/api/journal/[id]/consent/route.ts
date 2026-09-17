import { auth } from '@clerk/nextjs/server'
import { after, NextResponse } from 'next/server'
import { isJournalConsentV2Enabled } from '@/lib/feature-flags'
import { journalConsentStateSchema } from '@/lib/journal/consent'
import {
  invalidateJournalDerivedContent,
  rebuildJournalDerivedContent,
} from '@/lib/journal/derived-rebuild'
import { createServerSupabase } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isJournalConsentV2Enabled()) {
    return NextResponse.json({ error: 'Journal consent controls are not available' }, { status: 404 })
  }

  const parsed = journalConsentStateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid journal consent' },
      { status: 400 },
    )
  }

  const { id } = await params
  const consent = parsed.data
  const supabase = await createServerSupabase()
  const { data: existing, error: existingError } = await supabase
    .from('journal_entries')
    .select('user_id, include_in_insights')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: 'Failed to load journal permissions' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })

  const insightsPermissionChanged =
    existing.include_in_insights !== consent.include_in_insights
  if (insightsPermissionChanged) {
    try {
      await invalidateJournalDerivedContent(existing.user_id)
    } catch {
      return NextResponse.json(
        { error: 'Journal permissions were not changed because derived content could not be invalidated' },
        { status: 500 },
      )
    }
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .update({
      ...consent,
      oracle_memory: consent.include_in_stelloquy,
    })
    .eq('id', id)
    .select(
      'id, include_in_insights, include_in_stelloquy, memory_pinned, memory_importance',
    )
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to update journal permissions' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })

  if (insightsPermissionChanged) {
    after(() =>
      rebuildJournalDerivedContent(existing.user_id).catch((rebuildError: unknown) => {
        console.error('[journal/consent] Derived content rebuild failed:', rebuildError)
      }),
    )
  }

  return NextResponse.json({ consent: data })
}
