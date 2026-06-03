import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getSeason } from '@/lib/today/get-season'
import { synthesizeSeason } from '@/lib/ai/season-synthesis'

export const maxDuration = 60

// Generates (and caches) the /today "season" read. The card renders its
// deterministic headline immediately; when no cached AI prose matches the
// live heavy-window signature, the client POSTs here to fill it in. The
// read is persisted on user_settings keyed by signature, so this only
// does model work when the configuration has actually changed.

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'No profile' }, { status: 404 })
    }

    const date = getTodayContext().today.date
    const season = await getSeason(date, profileId)

    // No active heavy windows (or no chart) → nothing to synthesise.
    if (season.status !== 'ok') {
      return NextResponse.json({ read: null, signature: null })
    }

    // Already cached for this exact configuration — serve it, no model call.
    if (season.cachedRead) {
      return NextResponse.json({ read: season.cachedRead, signature: season.signature })
    }

    const read = await synthesizeSeason({
      userProfileId: profileId,
      input: {
        onceInLifetimeCount: season.onceInLifetimeCount,
        rareCount: season.rareCount,
        heavy: season.heavy,
        hd: season.hd,
      },
    })

    const admin = createAdminSupabase()
    const { error } = await admin.from('user_settings').upsert(
      {
        user_id: profileId,
        season_read: read,
        season_read_signature: season.signature,
        season_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      // The read is still good to return even if the cache write failed —
      // the user just regenerates next visit instead of getting a cache hit.
      console.error('[today/season] cache persist failed:', error.message)
    }

    return NextResponse.json({ read, signature: season.signature })
  } catch (err) {
    console.error('[today/season] failed:', err)
    return NextResponse.json({ error: 'Could not read the season' }, { status: 500 })
  }
}
