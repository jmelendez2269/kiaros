import { auth } from '@clerk/nextjs/server'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { resyncPatternSynthesisForTargets } from '@/lib/ai/journal-insight-synthesis'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import type { PatternRefreshTarget } from '@/lib/journal/intelligence'
import { createServerSupabase } from '@/lib/supabase/server'

const updateJournalEntrySchema = z.object({
  title: z.string().trim().max(160).nullable(),
  body: z.string().trim().min(1).max(12000),
  is_ritual: z.boolean(),
  oracle_memory: z.boolean(),
})

function addTarget(
  targets: Map<string, PatternRefreshTarget>,
  patternType: PatternRefreshTarget['patternType'],
  patternKey: string | null,
) {
  if (!patternKey) return
  targets.set(`${patternType}:${patternKey}`, { patternType, patternKey })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const parsedId = z.string().uuid().safeParse((await params).id)
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid journal entry' }, { status: 400 })
  }

  const parsed = updateJournalEntrySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid journal entry' },
      { status: 400 },
    )
  }

  const supabase = await createServerSupabase()
  const { data: existing, error: existingError } = await supabase
    .from('journal_entries')
    .select('user_id, title, body')
    .eq('id', parsedId.data)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: 'Failed to load journal entry' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('journal_entries')
    .update({
      title: parsed.data.title?.trim() || null,
      body: parsed.data.body,
      is_ritual: parsed.data.is_ritual,
      oracle_memory: parsed.data.oracle_memory,
    })
    .eq('id', parsedId.data)
    .select(
      'id, title, body, entry_date, is_ritual, created_at, oracle_memory, lunar_phase, lunar_sign, transit_context',
    )
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to update journal entry' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })

  const contentChanged = existing.title !== data.title || existing.body !== data.body
  if (contentChanged) {
    const [aspectsResult, skyResult] = await Promise.all([
      supabase
        .from('journal_entry_aspects')
        .select('aspect_key')
        .eq('journal_entry_id', data.id),
      supabase
        .from('journal_entry_sky')
        .select('moon_phase, moon_sign, retrogrades')
        .eq('journal_entry_id', data.id)
        .maybeSingle(),
    ])

    if (!aspectsResult.error && !skyResult.error) {
      const targets = new Map<string, PatternRefreshTarget>()
      for (const aspect of aspectsResult.data ?? []) {
        addTarget(targets, 'aspect', aspect.aspect_key)
      }
      addTarget(targets, 'lunar_phase', skyResult.data?.moon_phase ?? null)
      addTarget(targets, 'lunar_sign', skyResult.data?.moon_sign ?? null)
      for (const retrograde of skyResult.data?.retrogrades ?? []) {
        addTarget(targets, 'retrograde', retrograde)
      }

      const targetList = Array.from(targets.values())
      await Promise.all(
        targetList.map((target) =>
          supabase.rpc('refresh_user_pattern_insight', {
            p_user_id: existing.user_id,
            p_pattern_type: target.patternType,
            p_pattern_key: target.patternKey,
          }),
        ),
      ).catch((refreshError: unknown) => {
        console.error('[journal/update] Pattern refresh failed:', refreshError)
      })

      after(() =>
        resyncPatternSynthesisForTargets({
          userProfileId: existing.user_id,
          targets: targetList,
        }).catch((synthesisError: unknown) => {
          console.error('[journal/update] Pattern synthesis refresh failed:', synthesisError)
        }),
      )
    }
  }

  return NextResponse.json(data)
}
